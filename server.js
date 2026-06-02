// Local development entry point. On Vercel the app is served as a serverless
// function via api/index.js instead — see vercel.json.
import app from "./app.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`PuppyQR running at http://localhost:${PORT}`);
});
