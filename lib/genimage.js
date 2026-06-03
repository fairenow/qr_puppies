// Thin wrapper around the Gemini/Imagen image API, shared by the QR puppy
// pipeline and the ad-image generator so there's one place that talks to the model.
import { GoogleGenAI } from "@google/genai";

let client;
function ai() {
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

export async function generateImage(prompt, aspectRatio = "1:1") {
  const response = await ai().models.generateImages({
    model: "imagen-4.0-generate-001",
    prompt,
    config: { numberOfImages: 1, aspectRatio },
  });
  const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
  if (!imageBytes) throw new Error("Gemini did not return an image.");
  return Buffer.from(imageBytes, "base64");
}
