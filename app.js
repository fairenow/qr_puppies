import "dotenv/config";
import express from "express";
import { readFileSync } from "node:fs";
import { STYLES } from "./lib/styles.js";
import { publicAds } from "./lib/ads.js";
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

// Accept input with or without a scheme: "yoursite.com" -> "https://yoursite.com".
// Leaves an explicit non-http(s) scheme alone so it gets rejected by isValidUrl.
function normalizeUrl(value) {
  const v = (value || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (v.includes("://")) return v; // some other scheme — leave it to be rejected
  return `https://${v}`;
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !!url.hostname;
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
      <label class="style-card${i === 0 ? " is-active" : ""}" data-style="${escapeHtml(s.id)}">
        <input type="radio" name="puppyStyle" value="${escapeHtml(s.value)}"${i === 0 ? " checked" : ""} />
        <span class="card-media ${escapeHtml(s.gradient)}">
          <img class="card-img" src="/previews/${escapeHtml(s.id)}.png" alt="${escapeHtml(s.title)} preview" loading="lazy"
               onerror="this.remove();this.closest('.card-media').classList.add('no-preview');" />
          <span class="card-emoji">${s.emoji}</span>
        </span>
        <span class="style-title">${escapeHtml(s.title)}</span>
      </label>`).join("");
}

// JSON for the client, with "<" escaped so it's safe inside a <script> tag.
const ADS_JSON = JSON.stringify(publicAds()).replace(/</g, "\\u003c");

app.get("/", (req, res) => {
  const html = renderTemplate("index")
    .replace("{{styleCards}}", buildStyleCards())
    .replace("{{adsData}}", ADS_JSON);
  res.send(html);
});

// Optional email capture from the film ad modal ("learn more about the film").
app.post("/lead", (req, res) => {
  const email = (req.body.email || "").trim().slice(0, 200);
  const video = (req.body.video || "").trim().slice(0, 40);
  if (email) console.log(`[lead] film interest: ${email}${video ? ` (video ${video})` : ""}`);
  res.status(204).end();
});

app.post("/generate", async (req, res) => {
  try {
    const { puppyStyle, customPuppy, safetyMode } = req.body;
    const targetUrl = normalizeUrl(req.body.targetUrl);

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
