import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
const args = process.argv.slice(2);
const index = args.findIndex((a) => a === "--port");
const port = Number(index >= 0 ? args[index + 1] : process.env.PORT || 4173);
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".wav": "audio/wav",
};
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      let pathname = decodeURIComponent(url.pathname);
      if (pathname === "/") pathname = "/app/index.html";
      else if (["/main.js", "/desktop.css", "/sw.js"].includes(pathname))
        pathname = "/app" + pathname;
      const file = path.resolve(root, "." + pathname);
      if (!file.startsWith(root + path.sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      const bytes = await readFile(file);
      res.writeHead(200, {
        "Content-Type": mime[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(bytes);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(port, "0.0.0.0", () =>
    console.log(`Desktop preview on port ${port}`),
  );
