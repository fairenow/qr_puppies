// Shared PuppyQR generation pipeline. Imported by the Express app (runtime)
// and by scripts/generate-previews.mjs (build time) so both produce identical
// output for a given style.
import QRCode from "qrcode";
import sharp from "sharp";
import { GoogleGenAI } from "@google/genai";

const QR_SIZE = 1024;

// QR Safety Mode -> badge size as a fraction of the QR width.
// Smaller badges scan more reliably; bigger badges look bolder but risk readability.
export const SAFETY_MODES = {
  safe: { ratio: 0.18, label: "Safe" },
  balanced: { ratio: 0.24, label: "Balanced" },
  bold: { ratio: 0.3, label: "Bold" },
};

let aiClient;
function ai() {
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
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

  const response = await ai().models.generateImages({
    model: "imagen-4.0-generate-001",
    prompt,
    config: { numberOfImages: 1, aspectRatio: "1:1" },
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
    .composite([{ input: circleMask, blend: "dest-in" }])
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

// Generate the finished QR-with-puppy PNG as a Buffer.
export async function createPuppyQrBuffer({ targetUrl, puppyStyle, safetyMode }) {
  const mode = SAFETY_MODES[safetyMode] ?? SAFETY_MODES.balanced;
  const badgeSize = Math.round(QR_SIZE * mode.ratio);
  const puppySize = Math.round(badgeSize * 0.85);

  const qrBuffer = await QRCode.toBuffer(targetUrl, {
    type: "png",
    width: QR_SIZE,
    margin: 3,
    errorCorrectionLevel: "H",
    color: { dark: "#111111", light: "#FFFFFF" },
  });

  const puppyBuffer = await generatePuppyImage({ puppyStyle });
  const badgeBuffer = await createCircularBadge(puppyBuffer, puppySize, badgeSize);

  // Composite entirely in memory — nothing is written to disk.
  const buffer = await sharp(qrBuffer)
    .composite([
      {
        input: badgeBuffer,
        left: Math.floor((QR_SIZE - badgeSize) / 2),
        top: Math.floor((QR_SIZE - badgeSize) / 2),
      },
    ])
    .png()
    .toBuffer();

  return { buffer, modeLabel: mode.label };
}

// Convenience wrapper returning a data URL (used by the live /generate route).
export async function createPuppyQrDataUrl(opts) {
  const { buffer, modeLabel } = await createPuppyQrBuffer(opts);
  return { dataUrl: `data:image/png;base64,${buffer.toString("base64")}`, modeLabel };
}
