export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
  return res.status(200).json({
    mapId: process.env.GOOGLE_MAPS_MAP_ID?.trim() || "DEMO_MAP_ID"
  });
}
