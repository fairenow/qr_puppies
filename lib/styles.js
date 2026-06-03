// Single source of truth for the selectable puppy styles.
// Used to render the picker cards AND to generate the per-style previews,
// so what a visitor previews is exactly what the model is prompted to make.
export const STYLES = [
  { id: "sticker",    title: "Squishy Sticker",  emoji: "🧸", gradient: "c1", value: "soft 3D sticker illustration" },
  { id: "goldie",     title: "Real-Life Goldie", emoji: "📸", gradient: "c2", value: "photorealistic golden retriever puppy portrait" },
  { id: "watercolor", title: "Watercolor Woof",  emoji: "🎨", gradient: "c3", value: "soft watercolor puppy illustration" },
  { id: "corgi",      title: "Cartoon Corgi",    emoji: "🐶", gradient: "c4", value: "cute cartoon corgi puppy mascot" },
  { id: "mascot",     title: "Shiny Mascot",     emoji: "✨", gradient: "c5", value: "premium glossy app-icon style puppy mascot" },
  { id: "pixel",      title: "Pixel Pup",        emoji: "🕹️", gradient: "c6", value: "retro pixel-art puppy sprite" },
  { id: "kawaii",     title: "Kawaii Pup",       emoji: "🌸", gradient: "c7", value: "kawaii chibi puppy illustration" },
  { id: "doodle",     title: "Doodle Pup",       emoji: "🖍️", gradient: "c8", value: "hand-drawn crayon doodle puppy" },
];
