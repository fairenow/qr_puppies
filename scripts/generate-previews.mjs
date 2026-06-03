// Build-time preview generator. Runs during the Vercel build (see vercel.json
// buildCommand). For each style it generates one real QR-with-puppy preview and
// writes it to public/previews/<id>.png so the picker shows true examples.
//
// This script is intentionally fault-tolerant: if GEMINI_API_KEY is missing or
// any generation fails, it logs and exits 0 so it can NEVER break the deploy.
// Missing previews simply fall back to the gradient + emoji tile in the UI.
import { mkdir, writeFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { STYLES } from "../lib/styles.js";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "previews");
const SAMPLE_URL = "https://qr-puppies.vercel.app";

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.log("[previews] No GEMINI_API_KEY — skipping preview generation (UI will use fallback tiles).");
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });

  // Import the pipeline lazily so a missing key path above never touches sharp/genai.
  const { createPuppyQrBuffer } = await import("../lib/puppyqr.js");

  let made = 0;
  for (const style of STYLES) {
    const outPath = join(OUT_DIR, `${style.id}.png`);

    // Skip if it already exists (lets a committed preview survive a rebuild).
    try {
      await access(outPath);
      console.log(`[previews] ${style.id}.png already present — keeping it.`);
      made++;
      continue;
    } catch {
      /* not present, generate it */
    }

    try {
      const { buffer } = await createPuppyQrBuffer({
        targetUrl: SAMPLE_URL,
        puppyStyle: style.value,
        safetyMode: "balanced",
      });
      await writeFile(outPath, buffer);
      made++;
      console.log(`[previews] generated ${style.id}.png (${style.title})`);
    } catch (err) {
      console.warn(`[previews] failed for ${style.id}: ${err?.message || err}`);
    }
  }

  console.log(`[previews] done — ${made}/${STYLES.length} previews available.`);
}

main().catch((err) => {
  console.warn("[previews] generator error (ignored):", err?.message || err);
}).finally(() => {
  // Always succeed so the Vercel build never fails because of previews.
  process.exit(0);
});
