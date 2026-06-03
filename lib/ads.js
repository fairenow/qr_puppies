// Single source of truth for the rotating banner ads.
// `prompt` is used at build time to generate a polished image into
// public/ads/<id>.png. The client only receives the display fields.
export const ADS = [
  {
    id: "pupbox", cat: "DOG", emoji: "🦴",
    title: "PupBox Treats", sub: "Healthy chews, delivered monthly", cta: "Shop treats →",
    gradient: "linear-gradient(135deg,#ff9a3c,#e8742c)",
    prompt: "Professional product advertisement photograph of a premium dog treat subscription box, bone-shaped biscuits and chews spilling out, warm soft studio lighting, clean light background, vibrant, high-end commercial product photography, no text",
  },
  {
    id: "kibble", cat: "FOOD", emoji: "🍖",
    title: "Farm Fresh Kibble", sub: "Real meat, no fillers", cta: "Try a bag →",
    gradient: "linear-gradient(135deg,#3aa8ae,#2e878c)",
    prompt: "Appetizing commercial product photograph of premium dog food, a bowl of kibble surrounded by fresh raw meat and vegetables, natural lighting, rustic wood surface, high-end pet food advertising photography, no text",
  },
  {
    id: "stream", cat: "FILM", emoji: "🎬",
    title: "Now Streaming", sub: "The film everyone's barking about", cta: "Watch now →",
    gradient: "linear-gradient(135deg,#1e50c8,#3a6fe0)",
    prompt: "Cinematic movie-poster style photograph of an adorable dog sitting in a cozy home cinema with popcorn, dramatic moody lighting, film grain, premium commercial look, no text",
  },
  {
    id: "adopt", cat: "ADOPT", emoji: "🐕",
    title: "Adopt, Don't Shop", sub: "Find your new best friend", cta: "Meet pups →",
    gradient: "linear-gradient(135deg,#b4bb7d,#8f9a4e)",
    prompt: "Heartwarming photograph of a hopeful adoptable puppy at an animal shelter looking up at the camera, soft natural light, shallow depth of field, emotional charity advertising photography, no text",
  },
  {
    id: "jerky", cat: "FOOD", emoji: "🥩",
    title: "BarkBite Jerky", sub: "Tail-wagging good", cta: "Get a pack →",
    gradient: "linear-gradient(135deg,#e88a6b,#d9684a)",
    prompt: "Premium dog jerky treats product photograph, strips of natural jerky on a rustic wooden board, warm appetizing lighting, artisanal commercial pet snack advertising, no text",
  },
  {
    id: "harness", cat: "GEAR", emoji: "🦺",
    title: "TrailPup Harness", sub: "Adventure-ready gear", cta: "Gear up →",
    gradient: "linear-gradient(135deg,#7f7fd5,#86a8e7)",
    prompt: "Outdoor commercial photograph of a happy dog wearing a rugged adventure harness standing on a mountain trail at golden hour, dynamic and aspirational pet gear advertising photography, no text",
  },
];

// Display-only fields (no prompt) for sending to the browser.
export function publicAds() {
  return ADS.map(({ id, cat, emoji, title, sub, cta, gradient }) => ({
    id, cat, emoji, title, sub, cta, gradient,
  }));
}
