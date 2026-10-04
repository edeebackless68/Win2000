import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
async function walk(dir) {
  for (const f of await readdir(dir, { withFileTypes: true })) {
    const p = dir + "/" + f.name;
    if (f.isDirectory()) await walk(p);
    else if (/\.m?js$/.test(p)) {
      const r = spawnSync(process.execPath, ["--check", p], {
        encoding: "utf8",
      });
      if (r.status) {
        console.error(r.stderr);
        process.exitCode = 1;
      }
    }
  }
}
await walk("packages");
await walk("app");
await walk("scripts");
if (!process.exitCode)
  console.log("All JavaScript modules pass syntax validation.");
