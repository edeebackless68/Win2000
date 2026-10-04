import { mkdir, cp, rm } from "node:fs/promises";
await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
for (const dir of ["packages", "assets"])
  await cp(dir, `dist/${dir}`, { recursive: true });
await cp("app/index.html", "dist/index.html");
await cp("app/main.js", "dist/main.js");
await cp("app/desktop.css", "dist/desktop.css");
await cp("app/sw.js", "dist/sw.js");
console.log("Built dependency-free HTML/ES module desktop.");
