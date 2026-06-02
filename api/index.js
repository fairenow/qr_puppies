// Vercel serverless entry point. An Express app is itself a (req, res) handler,
// so exporting it directly lets Vercel invoke it as a function. All routes are
// rewritten here by vercel.json, and Express handles the routing from req.url.
import app from "../app.js";

export default app;
