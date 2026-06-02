# PuppyQR 🐶🔳

Generate a scannable QR code with an AI-generated puppy badge in the center.

**Flow:** enter a URL → server generates puppy art with Imagen (via the Gemini
API) → server builds a high-error-correction QR code → server composites the
puppy badge into the center → HTMX swaps the result onto the page.

## Stack

HTMX · Express · Gemini API (`@google/genai`, Imagen 4) · `qrcode` · `sharp`

## Setup

```bash
npm install
cp .env.example .env   # then add your real GEMINI_API_KEY
npm run dev
```

Open http://localhost:3000

Get a Gemini API key at https://aistudio.google.com/apikey. Keep it server-side
only — it is never exposed to the browser.

## QR Safety Mode

The puppy badge can interfere with QR readability if it is too large, so the QR
is always generated with **high error correction** (`H`) and the badge is sized
by a safety mode:

| Mode     | Badge size | Best for                                  |
| -------- | ---------: | ----------------------------------------- |
| Safe     |        18% | Printing, flyers, packaging               |
| Balanced |        24% | Digital sharing                           |
| Bold     |        30% | Visual previews, not guaranteed for print |

**Always scan-test before printing** or using a code publicly. Generated images
include Google's SynthID watermarking.

## Project structure

```
qr_puppies/
  package.json
  .env.example
  server.js
  public/styles.css
  views/index.html
  views/result.html
  generated/        # output PNGs (gitignored)
```
