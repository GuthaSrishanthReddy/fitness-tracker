const app = require("../backend/dist/app").default;

module.exports = (req, res) => {
  const parsedUrl = new URL(req.url || "/", "http://localhost");
  const routePath = parsedUrl.searchParams.get("path");

  if (routePath) {
    parsedUrl.searchParams.delete("path");
    const query = parsedUrl.searchParams.toString();
    req.url = `/api/${routePath}${query ? `?${query}` : ""}`;
  } else if (req.url && !req.url.startsWith("/api")) {
    req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
  }

  return app(req, res);
};
