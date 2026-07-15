export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).send("Method Not Allowed");
  }

  const key = process.env.GOOGLE_MAPS_KEY?.trim();

  if (!key) {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res
      .status(500)
      .send(
        'window.handleMapsScriptError?.("Google Maps is not configured for this deployment.");'
      );
  }

  const params = new URLSearchParams({
    key,
    callback: "initMap",
    loading: "async",
    libraries: "marker",
    v: "weekly",
    auth_referrer_policy: "origin"
  });

  res.setHeader("Cache-Control", "private, no-store");
  return res.redirect(
    302,
    `https://maps.googleapis.com/maps/api/js?${params.toString()}`
  );
}
