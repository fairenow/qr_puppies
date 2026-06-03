// Build-time ad-image generator. For each ad it generates one polished image
// into public/ads/<id>.png so the banner ads showcase real creative.
//
// Fault-tolerant by design: if GEMINI_API_KEY is missing or any generation
// fails, it logs and exits 0 so it can NEVER break the deploy. Missing images
// simply fall back to the gradient + emoji tile in the UI.
import { mkdir, writeFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ADS } from "../lib/ads.js";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "ads");

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.log("[ads] No GEMINI_API_KEY — skipping ad-image generation (UI will use fallback tiles).");
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });
  const { generateImage } = await import("../lib/genimage.js");

  let made = 0;
  for (const ad of ADS) {
    const outPath = join(OUT_DIR, `${ad.id}.png`);
    try {
      await access(outPath);
      console.log(`[ads] ${ad.id}.png already present — keeping it.`);
      made++;
      continue;
    } catch { /* generate */ }

    try {
      const buffer = await generateImage(ad.prompt, "1:1");
      await writeFile(outPath, buffer);
      made++;
      console.log(`[ads] generated ${ad.id}.png (${ad.title})`);
    } catch (err) {
      console.warn(`[ads] failed for ${ad.id}: ${err?.message || err}`);
    }
  }
  console.log(`[ads] done — ${made}/${ADS.length} ad images available.`);
}

main()
  .catch((err) => console.warn("[ads] generator error (ignored):", err?.message || err))
  .finally(() => process.exit(0));
