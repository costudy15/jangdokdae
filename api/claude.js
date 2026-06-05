// /api/claude · Vercel 서버리스 — ANTHROPIC_API_KEY 를 서버에만 둔다.
export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST만 허용됩니다." });
  const host = req.headers.host || "";
  const origin = req.headers.origin || "";
  if (origin && !origin.includes(host)) return res.status(403).json({ error: "허용되지 않은 출처입니다." });
  try {
    const { system, user } = req.body || {};
    if (!user) return res.status(400).json({ error: "user 내용이 없습니다." });
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6", // 비용↓: 'claude-haiku-4-5-20251001'
        max_tokens: 1500,
        system: system || "",
        messages: [{ role: "user", content: user }],
      }),
    });
    const data = await r.json();
    if (data.error) return res.status(500).json({ error: data.error.message || "API 오류" });
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
