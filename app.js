import "dotenv/config";
import express from "express";
import { readFileSync } from "node:fs";
import QRCode from "qrcode";
import sharp from "sharp";
import { GoogleGenAI } from "@google/genai";

const app = express();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const QR_SIZE = 1024;

// QR Safety Mode -> badge size as a fraction of the QR width.
// Smaller badges scan more reliably; bigger badges look bolder but risk readability.
const SAFETY_MODES = {
  safe: { ratio: 0.18, label: "Safe" },
  balanced: { ratio: 0.24, label: "Balanced" },
  bold: { ratio: 0.3, label: "Bold" },
};

// Load templates once at startup using literal `new URL(..., import.meta.url)`
// paths. This pattern is statically traceable, so bundlers (incl. Vercel's
// Node File Trace) include the files and resolve them correctly in serverless.
const TEMPLATES = {
  index: readFileSync(new URL("./views/index.html", import.meta.url), "utf8"),
  result: readFileSync(new URL("./views/result.html", import.meta.url), "utf8"),
};

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

async function generatePuppyImage({ puppyStyle }) {
  const prompt = `
Create a cute, friendly puppy portrait designed as a centered badge for a QR code.
Style: ${puppyStyle}.
Requirements:
- puppy face clearly visible
- centered composition
- simple clean background
- no text
- no QR code
- square image
- high contrast
- charming and professional
`;

  const response = await ai.models.generateImages({
    model: "imagen-4.0-generate-001",
    prompt,
    config: {
      numberOfImages: 1,
      aspectRatio: "1:1",
    },
  });

  const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
  if (!imageBytes) {
    throw new Error("Gemini did not return an image.");
  }

  return Buffer.from(imageBytes, "base64");
}

async function createCircularBadge(imageBuffer, size, borderSize) {
  const circleMask = Buffer.from(`
    <svg width="${size}" height="${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/>
    </svg>
  `);

  const puppyCircle = await sharp(imageBuffer)
    .resize(size, size, { fit: "cover" })
    .composite([
      {
        input: circleMask,
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();

  const badgeBackground = Buffer.from(`
    <svg width="${borderSize}" height="${borderSize}">
      <circle cx="${borderSize / 2}" cy="${borderSize / 2}" r="${borderSize / 2}" fill="white"/>
    </svg>
  `);

  return sharp({
    create: {
      width: borderSize,
      height: borderSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: badgeBackground, left: 0, top: 0 },
      {
        input: puppyCircle,
        left: Math.floor((borderSize - size) / 2),
        top: Math.floor((borderSize - size) / 2),
      },
    ])
    .png()
    .toBuffer();
}

async function createPuppyQrCode({ targetUrl, puppyStyle, safetyMode }) {
  const mode = SAFETY_MODES[safetyMode] ?? SAFETY_MODES.balanced;
  const badgeSize = Math.round(QR_SIZE * mode.ratio);
  // Keep the inner puppy slightly smaller than the white badge border.
  const puppySize = Math.round(badgeSize * 0.85);

  const qrBuffer = await QRCode.toBuffer(targetUrl, {
    type: "png",
    width: QR_SIZE,
    margin: 3,
    errorCorrectionLevel: "H",
    color: {
      dark: "#111111",
      light: "#FFFFFF",
    },
  });

  const puppyBuffer = await generatePuppyImage({ puppyStyle });
  const badgeBuffer = await createCircularBadge(puppyBuffer, puppySize, badgeSize);

  // Composite entirely in memory — nothing is written to disk.
  const finalImageBuffer = await sharp(qrBuffer)
    .composite([
      {
        input: badgeBuffer,
        left: Math.floor((QR_SIZE - badgeSize) / 2),
        top: Math.floor((QR_SIZE - badgeSize) / 2),
      },
    ])
    .png()
    .toBuffer();

  const dataUrl = `data:image/png;base64,${finalImageBuffer.toString("base64")}`;
  return { dataUrl, modeLabel: mode.label };
}

app.get("/", (req, res) => {
  res.send(renderTemplate("index"));
});

app.post("/generate", async (req, res) => {
  try {
    const { targetUrl, puppyStyle, safetyMode } = req.body;

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

    const { dataUrl, modeLabel } = await createPuppyQrCode({
      targetUrl,
      puppyStyle: puppyStyle || "soft 3D sticker illustration",
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
