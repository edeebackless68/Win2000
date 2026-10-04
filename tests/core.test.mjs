import test from "node:test";
import assert from "node:assert/strict";
import {
  VirtualFileSystem,
  EventBus,
  Clipboard,
  DOCS,
  normalizePath,
} from "../packages/core/index.js";
class MemoryStore {
  async load() {
    return this.data;
  }
  async save(value) {
    if (this.fail) throw new Error("Disk full");
    this.data = structuredClone(value);
  }
}
async function setup() {
  const store = new MemoryStore(),
    fs = new VirtualFileSystem(new EventBus(), store);
  await fs.init();
  return { fs, store };
}
test("concurrent JSON edits preserve both independent updates", async () => {
  const { fs } = await setup();
  const path = DOCS + "/Concurrent.json";
  await Promise.all([
    fs.updateJSON(path, (list) => [...list, { id: "a", value: "first" }]),
    fs.updateJSON(path, (list) => [...list, { id: "b", value: "second" }]),
  ]);
  assert.deepEqual(
    JSON.parse(fs.readFile(path)).map((x) => x.id),
    ["a", "b"],
  );
  await fs.updateJSON(path, (list) =>
    list.map((x) => (x.id === "a" ? { ...x, value: "updated" } : x)),
  );
  assert.equal(JSON.parse(fs.readFile(path))[1].value, "second");
});
test("JSON updates roll back failures without silently replacing invalid content", async () => {
  const { fs, store } = await setup();
  const path = DOCS + "/State.json";
  await fs.writeFile(path, "broken JSON");
  await assert.rejects(fs.updateJSON(path, () => []));
  assert.equal(fs.readFile(path), "broken JSON");
  await fs.writeFile(path, "[]");
  store.fail = true;
  await assert.rejects(
    fs.updateJSON(path, (list) => [...list, "lost"]),
    /Disk full/,
  );
  assert.equal(fs.readFile(path), "[]");
});
test("Windows paths canonicalize separators, dot segments, and drive letters", () => {
  assert.equal(
    normalizePath("c:\\Users\\..\\WINNT\\.\\system32"),
    "C:/WINNT/system32",
  );
  assert.equal(normalizePath("C:/../../"), "C:/");
});
test("transaction rolls back in-memory state when durable persistence fails", async () => {
  const { fs, store } = await setup();
  const revision = fs.revision;
  store.fail = true;
  await assert.rejects(
    fs.writeFile(DOCS + "/unsaved.txt", "important"),
    /Disk full/,
  );
  assert.equal(fs.exists(DOCS + "/unsaved.txt"), false);
  assert.equal(fs.revision, revision);
  store.fail = false;
  await fs.writeFile(DOCS + "/saved.txt", "okay");
  assert.equal(fs.readFile(DOCS + "/saved.txt"), "okay");
});
test("recycled file keeps its content when a new file reuses the original path", async () => {
  const { fs } = await setup(),
    path = DOCS + "/Repeated.txt";
  await fs.writeFile(path, "old");
  await fs.remove(path.toUpperCase());
  assert.equal(fs.exists(path), false);
  const recycled = fs.recycled()[0];
  assert.ok(recycled);
  assert.equal(fs.readFile(recycled.path), "old");
  await fs.writeFile(path, "new");
  await assert.rejects(fs.restore(recycled.path), /already exists/);
  assert.equal(fs.readFile(path), "new");
  assert.equal(fs.readFile(recycled.path), "old");
  await fs.rename(path, "New Copy.txt");
  await fs.restore(recycled.path);
  assert.equal(fs.readFile(path), "old");
  assert.equal(fs.recycled().length, 0);
});
test("folder deletion and restore preserve descendants without creating orphans", async () => {
  const { fs } = await setup(),
    folder = DOCS + "/Folder";
  await fs.mkdir(folder);
  await fs.mkdir(folder + "/Nested");
  await fs.writeFile(folder + "/Nested/Note.txt", "retained");
  await fs.remove(folder);
  assert.equal(fs.exists(folder), false);
  await assert.rejects(
    fs.writeFile(folder + "/orphan.txt", "x"),
    /does not exist/,
  );
  const trash = fs.recycled()[0];
  await fs.restore(trash.path);
  assert.equal(fs.readFile(folder + "/Nested/Note.txt"), "retained");
  await fs.remove(folder);
  await fs.emptyRecycleBin();
  assert.equal(
    [...fs.nodes.values()].some((n) => n.originalPath?.startsWith(folder)),
    false,
  );
});
test("concurrent imports allocate unique names inside serialized transactions", async () => {
  const { fs } = await setup();
  const files = [
    new File(["first"], "duplicate.txt", { type: "text/plain" }),
    new File(["second"], "duplicate.txt", { type: "text/plain" }),
  ];
  const results = await Promise.all(files.map((f) => fs.importFile(f, DOCS)));
  assert.notEqual(results[0], results[1]);
  assert.deepEqual(
    new Set(results.map((p) => fs.readFile(p))),
    new Set(["first", "second"]),
  );
});
test("move and copy directories preserve source invariants", async () => {
  const { fs } = await setup();
  await fs.mkdir(DOCS + "/A");
  await fs.writeFile(DOCS + "/A/a.txt", "a");
  await fs.move(DOCS + "/A", DOCS + "/B", { copy: true });
  assert.equal(fs.readFile(DOCS + "/A/a.txt"), "a");
  assert.equal(fs.readFile(DOCS + "/B/a.txt"), "a");
  await assert.rejects(fs.move(DOCS + "/A", DOCS + "/A/Inside"), /itself/);
  await fs.move(DOCS + "/B", DOCS + "/C");
  assert.equal(fs.exists(DOCS + "/B"), false);
  assert.equal(fs.readFile(DOCS + "/C/a.txt"), "a");
});
test("partial cut-paste failure retains only paths not yet moved", async () => {
  const { fs } = await setup(),
    clipboard = new Clipboard(new EventBus());
  await fs.mkdir(DOCS + "/Target");
  await fs.writeFile(DOCS + "/Cut.txt", "x");
  clipboard.setFiles([DOCS + "/Cut.txt", DOCS + "/missing.txt"], "cut");
  await assert.rejects(clipboard.pasteFiles(fs, DOCS + "/Target"));
  assert.deepEqual(clipboard.files, [DOCS + "/missing.txt"]);
  assert.equal(fs.readFile(DOCS + "/Target/Cut.txt"), "x");
});
test("read-only volume and reserved Windows names reject writes", async () => {
  const { fs } = await setup();
  await assert.rejects(fs.writeFile("D:/Test.txt", "x"), /write protected/);
  await assert.rejects(fs.writeFile(DOCS + "/CON.txt", "x"), /reserved/);
});
test("backup restore round-trips live and recycled records", async () => {
  const { fs } = await setup();
  await fs.writeFile(DOCS + "/original.txt", "hello");
  await fs.remove(DOCS + "/original.txt");
  const snapshot = fs.snapshot(),
    second = await setup();
  await second.fs.importSnapshot(snapshot);
  const recycled = second.fs.recycled()[0];
  await second.fs.restore(recycled.path);
  assert.equal(second.fs.readFile(DOCS + "/original.txt"), "hello");
  await assert.rejects(
    second.fs.importSnapshot({ format: "wrong", nodes: [] }),
    /not a supported/,
  );
});
