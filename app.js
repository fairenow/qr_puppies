import "dotenv/config";
import express from "express";
import { readFileSync } from "node:fs";
import { STYLES } from "./lib/styles.js";
import { createPuppyQrDataUrl } from "./lib/puppyqr.js";

const app = express();

// Load templates once at startup using literal `new URL(..., import.meta.url)`
// paths. This pattern is statically traceable, so bundlers (incl. Vercel's
// Node File Trace) include the files and resolve them correctly in serverless.
const TEMPLATES = {
  index: readFileSync(new URL("./views/index.html", import.meta.url), "utf8"),
  result: readFileSync(new URL("./views/result.html", import.meta.url), "utf8"),
};

const DEFAULT_STYLE = STYLES[0].value;

app.use(express.urlencoded({ extended: true }));
// Locally this serves /styles.css. On Vercel the platform serves the public/
// directory statically before requests ever reach this function.
app.use(express.static(new URL("./public", import.meta.url).pathname));

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderTemplate(name, data = {}) {
  let html = TEMPLATES[name];
  for (const [key, value] of Object.entries(data)) {
    html = html.replaceAll(`{{${key}}}`, escapeHtml(value));
  }
  return html;
}

// Build the style picker cards from the shared STYLES list. Each card shows a
// real generated preview (/previews/<id>.png) and falls back to a gradient +
// emoji tile if that preview hasn't been generated yet.
function buildStyleCards() {
  return STYLES.map((s, i) => `
      <label class="style-card" data-style="${escapeHtml(s.id)}">
        <input type="radio" name="puppyStyle" value="${escapeHtml(s.value)}"${i === 0 ? " checked" : ""} />
        <span class="card-media ${escapeHtml(s.gradient)}">
          <img class="card-img" src="/previews/${escapeHtml(s.id)}.png" alt="${escapeHtml(s.title)} preview" loading="lazy"
               onerror="this.remove();this.closest('.card-media').classList.add('no-preview');" />
          <span class="card-emoji">${s.emoji}</span>
        </span>
        <span class="style-title">${escapeHtml(s.title)}</span>
      </label>`).join("");
}

app.get("/", (req, res) => {
  const html = renderTemplate("index").replace("{{styleCards}}", buildStyleCards());
  res.send(html);
});

app.post("/generate", async (req, res) => {
  try {
    const { targetUrl, puppyStyle, customPuppy, safetyMode } = req.body;

    if (!targetUrl || !isValidUrl(targetUrl)) {
      const html = renderTemplate("result", {
        resultTitle: "That URL needs a little leash.",
        resultMessage:
          "Please enter a valid URL starting with http:// or https://.",
        imageUrl: "",
        downloadUrl: "",
        showImage: "hidden",
      });
      return res.status(400).send(html);
    }

    // A typed custom request wins over the picked style.
    const custom = (customPuppy || "").trim().slice(0, 120);
    const chosenStyle = custom || puppyStyle || DEFAULT_STYLE;

    const { dataUrl, modeLabel } = await createPuppyQrDataUrl({
      targetUrl,
      puppyStyle: chosenStyle,
      safetyMode,
    });

    const html = renderTemplate("result", {
      resultTitle: "Your PuppyQR is ready.",
      resultMessage: `Safety mode: ${modeLabel}. Generated in memory — nothing is stored. Scan-test before printing.`,
      imageUrl: dataUrl,
      downloadUrl: dataUrl,
      showImage: "",
    });
    res.send(html);
  } catch (error) {
    console.error(error);
    const html = renderTemplate("result", {
      resultTitle: "Something went sideways.",
      resultMessage:
        "The QR code could not be generated. Check your Gemini API key and server logs.",
      imageUrl: "",
      downloadUrl: "",
      showImage: "hidden",
    });
    res.status(500).send(html);
  }
});

export default app;
