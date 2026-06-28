// Optional Vercel serverless proxy so keys never ship in client code.
// Deploy this, set ANTHROPIC_API_KEY (and others) in Vercel env vars, then
// point the adapters in src/engine/*.js at "/api/judge" instead of the
// provider URL. This file is a template — wire per provider as needed.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(req.body),
  });
  const data = await r.json();
  res.status(r.status).json(data);
}
