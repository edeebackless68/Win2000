/** @package @win2k/core — filesystem, configuration and shared desktop services. */
export class EventBus {
  #listeners = new Map();
  on(type, fn) {
    if (!this.#listeners.has(type)) this.#listeners.set(type, new Set());
    this.#listeners.get(type).add(fn);
    return () => this.#listeners.get(type)?.delete(fn);
  }
  emit(type, data) {
    for (const fn of this.#listeners.get(type) || [])
      try {
        fn(data);
      } catch (e) {
        console.error(type, e);
      }
  }
}
export const basename = (p) => normalizePath(p).split("/").pop();
export function normalizePath(path = "C:/") {
  path = String(path).trim().replaceAll("\\", "/");
  if (!/^[a-z]:/i.test(path)) path = "C:/" + path.replace(/^\/+/, "");
  const drive = path.slice(0, 2).toUpperCase();
  const parts = [];
  for (const part of path.slice(2).split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return drive + "/" + parts.join("/");
}
export const dirname = (p) => {
  p = normalizePath(p);
  return p.includes("/") && p.lastIndexOf("/") > 2
    ? p.slice(0, p.lastIndexOf("/"))
    : p.slice(0, 3);
};
export const extension = (p) =>
  (basename(p).match(/\.([^.]+)$/)?.[1] || "").toLowerCase();
export const joinPath = (a, b) => normalizePath(a + "/" + b);
export const formatBytes = (n) =>
  n < 1024
    ? `${n} bytes`
    : n < 1048576
      ? `${(n / 1024).toFixed(1)} KB`
      : `${(n / 1048576).toFixed(2)} MB`;
export const DOCS = "C:/Documents and Settings/Administrator/My Documents";
export const DESKTOP = "C:/Documents and Settings/Administrator/Desktop";
const encoder = new TextEncoder();

class DurableStore {
  async open() {
    this.db = await new Promise((resolve, reject) => {
      const req = indexedDB.open("windows-2000-desktop", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("volumes");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    this.db.onversionchange = () => this.db.close();
  }
  async load() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("volumes");
      const r = tx.objectStore("volumes").get("C");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  async save(snapshot, expectedRevision) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("volumes", "readwrite"),
        store = tx.objectStore("volumes");
      let conflict = null;
      const request = store.get("C");
      request.onsuccess = () => {
        if (
          expectedRevision != null &&
          request.result &&
          request.result.revision !== expectedRevision
        ) {
          conflict = new Error(
            "The virtual hard drive changed in another browser tab. Download your unsaved work, then reload this desktop to avoid overwriting the other tab’s files.",
          );
          tx.abort();
          return;
        }
        store.put(snapshot, "C");
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () =>
        reject(
          conflict ||
            tx.error ||
            new Error("The disk transaction was aborted."),
        );
    });
  }
}
export class VirtualFileSystem {
  constructor(bus = new EventBus(), store = null) {
    this.bus = bus;
    this.nodes = new Map();
    this.store = store;
    this.revision = 0;
    this.queue = Promise.resolve();
    this.ready = false;
  }
  async init() {
    this.store ??= new DurableStore();
    await this.store.open?.();
    const saved = await this.store.load();
    if (saved?.nodes) {
      this.#load(saved);
    } else {
      this.#seed();
      await this.store.save(this.snapshot());
    }
    this.ready = true;
    return this;
  }
  #load(snapshot) {
    if (!Array.isArray(snapshot.nodes))
      throw new Error("Invalid virtual disk image.");
    this.nodes = new Map(snapshot.nodes.map((n) => [n.path.toLowerCase(), n]));
    this.revision = snapshot.revision || 0;
  }
  #seed() {
    const add = (path, type = "folder", content = "", extra = {}) => {
      path = normalizePath(path);
      this.nodes.set(path.toLowerCase(), {
        path,
        name: basename(path) || path,
        type,
        content,
        created: Date.now(),
        modified: Date.now(),
        ...extra,
      });
    };
    for (const p of [
      "C:/",
      "C:/WINNT",
      "C:/WINNT/system32",
      "C:/WINNT/system32/config",
      "C:/Program Files",
      "C:/Program Files/Accessories",
      "C:/Documents and Settings",
      "C:/Documents and Settings/Administrator",
      DOCS,
      DESKTOP,
      DOCS + "/My Pictures",
      DOCS + "/My Music",
      DOCS + "/Projects",
      "C:/Temp",
      "D:/",
    ])
      add(p);
    const welcome =
      "Welcome to Windows 2000 Professional\r\n=====================================\r\n\r\nYour desktop is ready to work.\r\n\r\nGETTING STARTED\r\n  Double-click a desktop icon to open it.\r\n  Use the Start menu to find your programs.\r\n  Right-click files or the desktop for more options.\r\n\r\nYOUR FILES\r\n  Save documents in My Documents.\r\n  Import files by dropping them onto Explorer.\r\n  Export a file with File > Download.\r\n  Back up your virtual hard drive in System Properties.\r\n\r\nTRY SOMETHING\r\n  Write a note in Notepad or WordPad.\r\n  Draw a picture in Paint.\r\n  Play Minesweeper, Solitaire, FreeCell, or Pinball.\r\n  Type help in Command Prompt.\r\n  Change colors in Display Properties.\r\n\r\nKEYBOARD SHORTCUTS\r\n  Ctrl+Esc        Start menu\r\n  Ctrl+Shift+Esc  Task Manager\r\n  Alt+F4          Close active window\r\n  Alt+Tab         Switch windows (when available)\r\n  F2              Rename selected file\r\n  F5              Refresh\r\n\r\nThis is a browser reimplementation. Files are kept on this\r\nbrowser's virtual hard drive. Native Windows executables,\r\nhardware drivers, NT services, and legacy protocols do not\r\nrun in this environment. Use Help for implementation details.\r\n";
    add(DOCS + "/Welcome.txt", "file", welcome, { mime: "text/plain" });
    add(
      DOCS + "/To Do.txt",
      "file",
      "Things to do\r\n============\r\n\r\n[ ] Explore the desktop\r\n[ ] Draw something in Paint\r\n[ ] Beat my Minesweeper time\r\n[ ] Make a backup of my files\r\n",
      { mime: "text/plain" },
    );
    add(
      DOCS + "/Projects/Readme.txt",
      "file",
      "My Projects\r\n\r\nCreate, edit, and organize your projects in this folder.\r\n",
      { mime: "text/plain" },
    );
    add(
      "C:/WINNT/win.ini",
      "file",
      "[windows]\r\nload=\r\nrun=\r\n[Desktop]\r\nWallpaper=\r\n",
      { mime: "text/plain" },
    );
    add(
      "C:/WINNT/system32/config/registry.json",
      "file",
      JSON.stringify(
        {
          HKEY_CURRENT_USER: {
            "Control Panel": {
              Desktop: { Wallpaper: "", ScreenSaveActive: "0" },
              Colors: { Background: "58 110 165" },
            },
            Software: {
              Microsoft: { Windows: { CurrentVersion: { Explorer: {} } } },
            },
          },
          HKEY_LOCAL_MACHINE: {
            SOFTWARE: {
              Microsoft: {
                "Windows NT": {
                  CurrentVersion: {
                    ProductName: "Windows 2000 Professional",
                    CurrentVersion: "5.0",
                    CurrentBuildNumber: "2195",
                    RegisteredOwner: "Administrator",
                  },
                },
              },
            },
            SYSTEM: {
              CurrentControlSet: {
                Control: { ComputerName: { ComputerName: "WIN2000" } },
              },
            },
          },
        },
        null,
        2,
      ),
      { mime: "application/json" },
    );
    add("C:/AUTOEXEC.BAT", "file", "@echo off\r\n", { mime: "text/plain" });
    add(
      "D:/Readme.txt",
      "file",
      "Windows 2000 Professional\r\n\r\nThis is a virtual read-only CD-ROM volume.\r\n",
      { mime: "text/plain", readonly: true },
    );
    this.revision = 1;
  }
  snapshot() {
    return {
      format: "win2k-virtual-disk",
      version: 1,
      revision: this.revision,
      nodes: [...this.nodes.values()].map((n) => ({ ...n })),
    };
  }
  get(path) {
    return this.nodes.get(normalizePath(path).toLowerCase());
  }
  exists(path) {
    return !!this.get(path);
  }
  stat(path) {
    const n = this.get(path);
    if (!n)
      throw new Error(`The system cannot find the path specified: ${path}`);
    return { ...n, size: encoder.encode(n.content || "").length };
  }
  list(path, { includeHidden = false } = {}) {
    path = normalizePath(path).toLowerCase();
    return [...this.nodes.values()]
      .filter(
        (n) =>
          n.path.toLowerCase() !== path &&
          dirname(n.path).toLowerCase() === path &&
          !n.trashed &&
          (includeHidden || !n.hidden),
      )
      .map((n) => ({ ...n, size: encoder.encode(n.content || "").length }))
      .sort(
        (a, b) =>
          (a.type === "folder" ? 0 : 1) - (b.type === "folder" ? 0 : 1) ||
          a.name.localeCompare(b.name, undefined, { numeric: true }),
      );
  }
  readFile(path) {
    const n = this.stat(path);
    if (n.type !== "file") throw new Error("The selected item is a folder.");
    return n.content || "";
  }
  #writable(path) {
    if (normalizePath(path).startsWith("D:/"))
      throw new Error("The media is write protected.");
  }
  #validateName(name) {
    if (!name || /[\\/:*?"<>|]/.test(name) || /[. ]$/.test(name))
      throw new Error(
        'A file name cannot contain any of these characters: \\ / : * ? " < > |',
      );
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(name))
      throw new Error("That file name is reserved.");
  }
  #mutate(fn) {
    const task = this.queue.then(async () => {
      const before = this.snapshot();
      try {
        const result = fn();
        this.revision++;
        await this.store.save(this.snapshot(), before.revision);
        this.bus.emit("fs:change", { revision: this.revision });
        return result;
      } catch (e) {
        this.#load(before);
        throw e;
      }
    });
    this.queue = task.catch(() => {});
    return task;
  }
  async writeFile(path, content, { mime = "text/plain" } = {}) {
    path = normalizePath(path);
    this.#writable(path);
    this.#validateName(basename(path));
    return this.#mutate(() => {
      this.#writeNode(path, content, mime);
      return path;
    });
  }
  #writeNode(path, content, mime) {
    const parent = this.get(dirname(path));
    if (!parent || parent.trashed || parent.type !== "folder")
      throw new Error("The destination folder does not exist.");
    const old = this.get(path);
    if (old?.type === "folder")
      throw new Error("A folder with that name already exists.");
    this.nodes.set(path.toLowerCase(), {
      path,
      name: basename(path),
      type: "file",
      content: String(content),
      mime,
      created: old?.created || Date.now(),
      modified: Date.now(),
    });
  }
  /** Atomically transform a JSON document using a synchronous updater. */
  async updateJSON(path, updater, initial = []) {
    path = normalizePath(path);
    this.#writable(path);
    this.#validateName(basename(path));
    return this.#mutate(() => {
      const old = this.get(path);
      const value = old ? JSON.parse(old.content) : structuredClone(initial);
      const next = updater(value);
      if (next === undefined || next?.then)
        throw new Error("A JSON updater must return a synchronous value.");
      this.#writeNode(path, JSON.stringify(next, null, 2), "application/json");
      return structuredClone(next);
    });
  }
  async mkdir(path) {
    path = normalizePath(path);
    this.#writable(path);
    this.#validateName(basename(path));
    return this.#mutate(() => {
      if (this.exists(path))
        throw new Error("An item with this name already exists.");
      if (
        this.get(dirname(path))?.type !== "folder" ||
        this.get(dirname(path))?.trashed
      )
        throw new Error("The destination folder does not exist.");
      this.nodes.set(path.toLowerCase(), {
        path,
        name: basename(path),
        type: "folder",
        content: "",
        created: Date.now(),
        modified: Date.now(),
      });
      return path;
    });
  }
  async rename(path, name) {
    this.#validateName(name);
    return this.move(path, joinPath(dirname(path), name));
  }
  async move(source, target, { copy = false } = {}) {
    source = normalizePath(source);
    target = normalizePath(target);
    this.#writable(target);
    if (!copy) this.#writable(source);
    return this.#mutate(() => {
      const src = this.stat(source);
      if (source.length === 3) throw new Error("You cannot move a drive.");
      const sk = source.toLowerCase(),
        tk = target.toLowerCase();
      if (sk === tk && !copy) return target;
      if (tk.startsWith(sk + "/"))
        throw new Error("Cannot move a folder into itself.");
      if (this.exists(target))
        throw new Error("An item with this name already exists.");
      if (
        this.get(dirname(target))?.type !== "folder" ||
        this.get(dirname(target))?.trashed
      )
        throw new Error("The destination folder does not exist.");
      const nodes = [...this.nodes.values()].filter(
        (n) =>
          n.path.toLowerCase() === sk ||
          n.path.toLowerCase().startsWith(sk + "/"),
      );
      for (const n of nodes) {
        const path = target + n.path.slice(source.length);
        this.nodes.set(path.toLowerCase(), {
          ...n,
          path,
          name: basename(path),
          modified: Date.now(),
        });
        if (!copy) this.nodes.delete(n.path.toLowerCase());
      }
      return target;
    });
  }
  async remove(path, { permanent = false } = {}) {
    path = normalizePath(path);
    this.#writable(path);
    return this.#mutate(() => {
      const src = this.stat(path);
      path = src.path;
      if (path.length === 3) throw new Error("You cannot delete a drive.");
      if (src.trashed && !permanent) return;
      const key = path.toLowerCase(),
        trashRoot = "C:/$Recycle/" + crypto.randomUUID() + "/" + src.name;
      for (const n of [...this.nodes.values()])
        if (
          n.path.toLowerCase() === key ||
          n.path.toLowerCase().startsWith(key + "/")
        ) {
          this.nodes.delete(n.path.toLowerCase());
          if (!permanent) {
            const recycledPath = trashRoot + n.path.slice(path.length);
            this.nodes.set(recycledPath.toLowerCase(), {
              ...n,
              path: recycledPath,
              originalPath: n.path,
              trashed: true,
              trashRoot,
              deleted: Date.now(),
            });
          }
        }
    });
  }
  recycled() {
    return [...this.nodes.values()]
      .filter((n) => n.trashed && n.trashRoot === n.path)
      .map((n) => ({ ...n }));
  }
  async restore(path) {
    const key = normalizePath(path).toLowerCase();
    return this.#mutate(() => {
      const root = this.stat(path);
      if (!root.trashed)
        throw new Error("The selected item is not in the Recycle Bin.");
      const destination = root.originalPath || root.path;
      if (
        this.get(dirname(destination))?.type !== "folder" ||
        this.get(dirname(destination))?.trashed
      )
        throw new Error(
          "The original folder no longer exists. Restore its parent folder first.",
        );
      const nodes = [...this.nodes.values()].filter(
        (n) => n.trashRoot?.toLowerCase() === key,
      );
      for (const n of nodes) {
        const target = n.originalPath || n.path;
        if (
          this.exists(target) &&
          target.toLowerCase() !== n.path.toLowerCase()
        )
          throw new Error(
            "An item named " +
              basename(target) +
              " already exists in the original location. Rename or move it before restoring.",
          );
      }
      for (const n of nodes) {
        this.nodes.delete(n.path.toLowerCase());
        const restored = { ...n, path: n.originalPath || n.path };
        delete restored.originalPath;
        delete restored.trashed;
        delete restored.trashRoot;
        delete restored.deleted;
        this.nodes.set(restored.path.toLowerCase(), restored);
      }
    });
  }
  async emptyRecycleBin() {
    return this.#mutate(() => {
      for (const [k, n] of this.nodes) if (n.trashed) this.nodes.delete(k);
    });
  }
  search(query) {
    const q = query.toLowerCase().replaceAll("*", "");
    return [...this.nodes.values()]
      .filter((n) => !n.trashed && n.name.toLowerCase().includes(q))
      .map((n) => ({ ...n }));
  }
  uniqueName(folder, name) {
    let candidate = name,
      i = 2;
    const ext = extension(name),
      base = ext ? name.slice(0, -ext.length - 1) : name;
    while (this.exists(joinPath(folder, candidate)))
      candidate = `${base} (${i++})${ext ? "." + ext : ""}`;
    return candidate;
  }
  async importFile(file, folder = DOCS) {
    const text =
      /^(text\/|application\/(json|javascript|xml))/.test(file.type) ||
      /\.(txt|log|ini|csv|json|js|html|css|md|bat|reg)$/i.test(file.name);
    const content = text
      ? await file.text()
      : await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result);
          r.onerror = () => rej(r.error);
          r.readAsDataURL(file);
        });
    this.#writable(folder);
    this.#validateName(file.name);
    return this.#mutate(() => {
      const parent = this.get(folder);
      if (!parent || parent.trashed || parent.type !== "folder")
        throw new Error("The destination folder does not exist.");
      const path = joinPath(folder, this.uniqueName(folder, file.name));
      this.nodes.set(path.toLowerCase(), {
        path,
        name: basename(path),
        type: "file",
        content,
        mime: file.type || "application/octet-stream",
        encoding: text ? "text" : "data-url",
        created: Date.now(),
        modified: Date.now(),
      });
      return path;
    });
  }
  async importSnapshot(snapshot) {
    if (
      snapshot?.format !== "win2k-virtual-disk" ||
      snapshot.version !== 1 ||
      !Array.isArray(snapshot.nodes) ||
      snapshot.nodes.length > 100000
    )
      throw new Error(
        "The selected file is not a supported virtual hard drive backup.",
      );
    const seen = new Set();
    for (const n of snapshot.nodes) {
      if (
        !n ||
        typeof n.path !== "string" ||
        !["file", "folder"].includes(n.type) ||
        typeof n.content !== "string" ||
        normalizePath(n.path) !== n.path ||
        seen.has(n.path.toLowerCase())
      )
        throw new Error("The backup contains an invalid file record.");
      seen.add(n.path.toLowerCase());
    }
    if (!seen.has("c:/")) throw new Error("The backup has no C: drive.");
    return this.#mutate(() => this.#load(snapshot));
  }
}

export class Settings {
  constructor(bus) {
    this.bus = bus;
    this.defaults = {
      desktopColor: "#3a6ea5",
      wallpaper: "none",
      scheme: "Windows Standard",
      fontSize: 11,
      volume: 65,
      muted: false,
      showSeconds: false,
      timeFormat: "12",
      clockOffset: 0,
      showWelcome: true,
      screensaver: "none",
      screenSaverMinutes: 10,
      animations: true,
      doubleClickSpeed: 450,
      dragFullWindows: true,
      taskbarAlwaysOnTop: true,
      taskbarAutoHide: false,
      largeIcons: true,
      showHiddenFiles: false,
      username: "Administrator",
      computerName: "WIN2000",
      quickLaunch: true,
      highContrast: false,
      keyboardLayout: "English (United States)",
      mouseSpeed: 5,
      soundScheme: "Windows Default",
      timezone: "Local time",
      resolution: "auto",
    };
    try {
      this.data = {
        ...this.defaults,
        ...JSON.parse(localStorage.getItem("win2k.settings") || "{}"),
      };
    } catch {
      this.data = { ...this.defaults };
    }
  }
  get(key) {
    return this.data[key];
  }
  set(key, value) {
    this.data[key] = value;
    localStorage.setItem("win2k.settings", JSON.stringify(this.data));
    this.bus.emit("settings:change", { key, value });
  }
  patch(values) {
    Object.assign(this.data, values);
    localStorage.setItem("win2k.settings", JSON.stringify(this.data));
    this.bus.emit("settings:change", { values });
  }
}
export class Clipboard {
  constructor(bus) {
    this.bus = bus;
    this.files = [];
    this.mode = "copy";
    this.text = "";
  }
  setFiles(paths, mode = "copy") {
    this.files = [...paths];
    this.mode = mode;
    this.bus.emit("clipboard:change", this);
  }
  async setText(text) {
    this.text = String(text);
    this.files = [];
    try {
      await navigator.clipboard.writeText(this.text);
    } catch {}
    this.bus.emit("clipboard:change", this);
  }
  async getText() {
    try {
      return await navigator.clipboard.readText();
    } catch {
      return this.text;
    }
  }
  async pasteFiles(fs, target) {
    const pasted = [];
    for (const path of [...this.files]) {
      const name = fs.uniqueName(target, basename(path));
      pasted.push(
        await fs.move(path, joinPath(target, name), {
          copy: this.mode === "copy",
        }),
      );
      if (this.mode === "cut")
        this.files = this.files.filter((p) => p !== path);
    }
    this.bus.emit("clipboard:change", this);
    return pasted;
  }
}
export class SoundService {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
  }
  play(kind = "click") {
    if (
      this.settings.get("muted") ||
      this.settings.get("soundScheme") === "No Sounds"
    )
      return;
    try {
      this.ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      this.ctx.resume();
      const ctx = this.ctx,
        gain = ctx.createGain();
      gain.gain.value = this.settings.get("volume") / 500;
      gain.connect(ctx.destination);
      const tones =
        kind === "startup"
          ? [523, 659, 784, 1047]
          : kind === "error"
            ? [330, 220]
            : kind === "win"
              ? [523, 659, 784, 1047, 1318]
              : [880];
      tones.forEach((f, i) => {
        const o = ctx.createOscillator(),
          g = ctx.createGain(),
          t = ctx.currentTime + i * 0.12;
        o.type = "sine";
        o.frequency.value = f;
        o.connect(g);
        g.connect(gain);
        g.gain.setValueAtTime(0.4, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        o.start(t);
        o.stop(t + 0.22);
      });
    } catch {}
  }
}
export function downloadFile(
  name,
  content,
  mime = "text/plain",
  encoding = null,
) {
  let url,
    revoke = false;
  if (
    typeof content === "string" &&
    (encoding === "data-url" ||
      (/^(image|audio|video)\//.test(mime) &&
        /^data:[^,]+;base64,/.test(content)))
  )
    url = content;
  else {
    url = URL.createObjectURL(
      content instanceof Blob ? content : new Blob([content], { type: mime }),
    );
    revoke = true;
  }
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  if (revoke) setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function pickFiles({ accept = "", multiple = false } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.multiple = multiple;
    input.addEventListener("change", () => resolve([...input.files]), {
      once: true,
    });
    input.addEventListener("cancel", () => resolve([]), { once: true });
    input.click();
  });
}
export class Registry {
  constructor(fs) {
    this.fs = fs;
    this.path = "C:/WINNT/system32/config/registry.json";
  }
  read() {
    try {
      return JSON.parse(this.fs.readFile(this.path));
    } catch {
      return {};
    }
  }
  async save(data) {
    await this.fs.writeFile(this.path, JSON.stringify(data, null, 2), {
      mime: "application/json",
    });
  }
  async set(path, name, value) {
    const parts = path.split("\\").filter(Boolean);
    if (
      [...parts, name].some((p) =>
        ["__proto__", "constructor", "prototype"].includes(p),
      )
    )
      throw new Error("That registry key name is reserved.");
    await this.fs.updateJSON(
      this.path,
      (data) => {
        let node = data;
        for (const p of parts) {
          if (!Object.hasOwn(node, p)) node[p] = {};
          if (!node[p] || typeof node[p] !== "object" || Array.isArray(node[p]))
            throw new Error("A registry value occupies this key path.");
          node = node[p];
        }
        node[name] = value;
        return data;
      },
      {},
    );
  }
}
