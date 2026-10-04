import {
  EventBus,
  VirtualFileSystem,
  Settings,
  Clipboard,
  SoundService,
  Registry,
  DOCS,
  DESKTOP,
  extension,
  normalizePath,
  basename,
} from "/packages/core/index.js";
import {
  WindowManager,
  DialogService,
  setErrorHandler,
  el,
  button,
  icon,
} from "/packages/ui/index.js";
import { DesktopRenderer } from "/packages/rendering/index.js";
import {
  DesktopShell,
  openRun,
  openHelp,
  openWelcome,
  openAbout,
} from "/packages/shell/index.js";
import { openExplorer } from "/packages/explorer/index.js";
import {
  openNotepad,
  openWordPad,
  openCalculator,
  openPaint,
  openMediaPlayer,
  openVolume,
  openSoundRecorder,
  openImaging,
} from "/packages/accessories/index.js";
import {
  openMinesweeper,
  openSolitaire,
  openPinball,
} from "/packages/games/index.js";
import {
  openControlPanel,
  controlItems,
  applyTheme,
} from "/packages/control-panel/index.js";
import {
  openInternetExplorer,
  openMail,
  openAddressBook,
  openHyperTerminal,
  openPhoneDialer,
  openSynchronize,
} from "/packages/internet/index.js";
import {
  openTerminal,
  openTaskManager,
  openRegistry,
  openSystemInfo,
  openEventViewer,
  openTasks,
  openCharacterMap,
  openClipboardViewer,
  openKeyboard,
  openMagnifier,
  openDiskManager,
} from "/packages/system/index.js";

const bus = new EventBus(),
  settings = new Settings(bus),
  fs = new VirtualFileSystem(bus),
  wm = new WindowManager(bus);
const ctx = {
  bus,
  settings,
  fs,
  wm,
  clipboard: new Clipboard(bus),
  sound: new SoundService(settings),
  events: [],
  controlItems,
};
ctx.dialogs = new DialogService(wm, fs);
ctx.registry = new Registry(fs);
ctx.renderer = new DesktopRenderer(
  document.querySelector("#desktop-surface"),
  settings,
  bus,
);
setErrorHandler((error) => {
  ctx.log?.("Error", "Application", error?.message || String(error));
  ctx.dialogs.error(error);
});
ctx.log = (level, source, message) => {
  ctx.events.push({ time: Date.now(), level, source, message });
  if (ctx.events.length > 500) ctx.events.shift();
  bus.emit("event:added");
};
ctx.apps = [
  {
    id: "explorer",
    name: "Windows Explorer",
    icon: "folder",
    aliases: ["explorer.exe"],
    open: openExplorer,
  },
  {
    id: "notepad",
    name: "Notepad",
    icon: "notepad",
    aliases: ["notepad.exe"],
    open: openNotepad,
  },
  {
    id: "wordpad",
    name: "WordPad",
    icon: "wordpad",
    aliases: ["write", "write.exe", "wordpad.exe"],
    open: openWordPad,
  },
  {
    id: "paint",
    name: "Paint",
    icon: "paint",
    aliases: ["mspaint", "pbrush", "mspaint.exe"],
    open: openPaint,
  },
  {
    id: "calculator",
    name: "Calculator",
    icon: "calculator",
    aliases: ["calc", "calc.exe"],
    open: openCalculator,
  },
  {
    id: "cmd",
    name: "Command Prompt",
    icon: "cmd",
    aliases: ["cmd.exe", "command", "command.com"],
    open: openTerminal,
  },
  {
    id: "ie",
    name: "Internet Explorer",
    icon: "ie",
    aliases: ["iexplore", "iexplore.exe"],
    open: openInternetExplorer,
  },
  {
    id: "outlook",
    name: "Outlook Express",
    icon: "mail",
    aliases: ["msimn", "msimn.exe"],
    open: openMail,
  },
  {
    id: "hyperterminal",
    name: "HyperTerminal",
    icon: "cmd",
    aliases: ["hypertrm", "hypertrm.exe"],
    open: openHyperTerminal,
  },
  {
    id: "dialer",
    name: "Phone Dialer",
    icon: "network",
    aliases: ["dialer.exe"],
    open: openPhoneDialer,
  },
  {
    id: "synchronize",
    name: "Synchronize",
    icon: "network",
    aliases: ["mobsync", "mobsync.exe"],
    open: openSynchronize,
  },
  {
    id: "address",
    name: "Address Book",
    icon: "address",
    aliases: ["wab", "wab.exe"],
    open: openAddressBook,
  },
  {
    id: "mediaplayer",
    name: "Windows Media Player",
    icon: "media",
    aliases: ["mplayer2", "mplayer2.exe", "wmplayer"],
    open: openMediaPlayer,
  },
  {
    id: "cdplayer",
    name: "CD Player",
    icon: "cd",
    aliases: ["cdplayer.exe"],
    open: (ctx, args) => openMediaPlayer(ctx, { ...args, cd: true }),
  },
  {
    id: "recorder",
    name: "Sound Recorder",
    icon: "speaker",
    aliases: ["sndrec32", "sndrec32.exe"],
    open: openSoundRecorder,
  },
  {
    id: "volume",
    name: "Volume Control",
    icon: "speaker",
    aliases: ["sndvol32", "sndvol32.exe"],
    singleton: true,
    open: openVolume,
  },
  {
    id: "imaging",
    name: "Imaging",
    icon: "paint",
    aliases: ["kodakimg", "kodakimg.exe"],
    open: openImaging,
  },
  {
    id: "minesweeper",
    name: "Minesweeper",
    icon: "minesweeper",
    aliases: ["winmine", "winmine.exe"],
    open: openMinesweeper,
  },
  {
    id: "solitaire",
    name: "Solitaire",
    icon: "solitaire",
    aliases: ["sol", "sol.exe"],
    open: openSolitaire,
  },
  {
    id: "freecell",
    name: "FreeCell",
    icon: "freecell",
    aliases: ["freecell.exe"],
    open: (ctx, args) => openSolitaire(ctx, { ...args, freecell: true }),
  },
  {
    id: "pinball",
    name: "Pinball",
    icon: "pinball",
    aliases: ["pinball.exe"],
    open: openPinball,
  },
  {
    id: "taskmgr",
    name: "Task Manager",
    icon: "taskmgr",
    aliases: ["taskmgr.exe"],
    singleton: true,
    open: openTaskManager,
  },
  {
    id: "regedit",
    name: "Registry Editor",
    icon: "registry",
    aliases: ["regedt32", "regedit.exe"],
    singleton: true,
    open: openRegistry,
  },
  {
    id: "systeminfo",
    name: "System Information",
    icon: "computer",
    aliases: ["msinfo32", "msinfo32.exe"],
    singleton: true,
    open: openSystemInfo,
  },
  {
    id: "devices",
    name: "Device Manager",
    icon: "computer",
    aliases: ["devmgmt.msc"],
    open: (ctx, args) => openSystemInfo(ctx, { ...args, devices: true }),
  },
  {
    id: "events",
    name: "Event Viewer",
    icon: "settings",
    aliases: ["eventvwr", "eventvwr.msc"],
    singleton: true,
    open: openEventViewer,
  },
  {
    id: "tasks",
    name: "Scheduled Tasks",
    icon: "settings",
    aliases: ["tasks"],
    singleton: true,
    open: openTasks,
  },
  {
    id: "diskmanager",
    name: "Disk Management",
    icon: "drive",
    aliases: ["diskmgmt.msc"],
    open: openDiskManager,
  },
  {
    id: "defrag",
    name: "Disk Defragmenter",
    icon: "drive",
    aliases: ["dfrg.msc"],
    open: (ctx, args) => openDiskManager(ctx, { ...args, defrag: true }),
  },
  {
    id: "charmap",
    name: "Character Map",
    icon: "font",
    aliases: ["charmap.exe"],
    open: openCharacterMap,
  },
  {
    id: "clipboard",
    name: "ClipBook Viewer",
    icon: "document",
    aliases: ["clipbrd", "clipbrd.exe"],
    open: openClipboardViewer,
  },
  {
    id: "keyboard",
    name: "On-Screen Keyboard",
    icon: "keyboard",
    aliases: ["osk", "osk.exe"],
    singleton: true,
    open: openKeyboard,
  },
  {
    id: "magnifier",
    name: "Magnifier",
    icon: "display",
    aliases: ["magnify", "magnify.exe"],
    singleton: true,
    open: openMagnifier,
  },
  {
    id: "control",
    name: "Control Panel",
    icon: "control",
    aliases: ["control.exe"],
    hidden: true,
    open: openControlPanel,
  },
  {
    id: "help",
    name: "Windows Help",
    icon: "help",
    aliases: ["winhelp", "hh"],
    open: openHelp,
  },
  {
    id: "welcome",
    name: "Getting Started",
    icon: "windows",
    hidden: true,
    singleton: true,
    open: openWelcome,
  },
  {
    id: "about",
    name: "About Windows",
    icon: "computer",
    aliases: ["winver", "winver.exe"],
    hidden: true,
    open: openAbout,
  },
  {
    id: "run",
    name: "Run",
    icon: "run",
    hidden: true,
    singleton: true,
    open: openRun,
  },
];
ctx.launch = async (id, args = {}) => {
  ctx.shell?.closeStart();
  const app = ctx.apps.find((a) => a.id === id);
  if (!app)
    throw new Error(
      `Windows cannot find “${id}”. Check the name and try again.`,
    );
  if (app.singleton) {
    const existing = wm.windows.find((w) => w.appId === id && !w.closed);
    if (existing) {
      existing.focus();
      return existing;
    }
  }
  const win = await app.open(ctx, args);
  ctx.log("Information", "Application", app.name + " started");
  return win;
};
ctx.openFile = async (path) => {
  path = normalizePath(path);
  const node = fs.stat(path);
  if (node.trashed)
    throw new Error(
      "Restore this item from the Recycle Bin before opening it.",
    );
  if (node.type === "folder") return ctx.launch("explorer", { path });
  settings.set(
    "recentFiles",
    [
      path,
      ...(settings.get("recentFiles") || []).filter((p) => p !== path),
    ].slice(0, 12),
  );
  const ext = extension(path);
  if (ext === "lnk") {
    try {
      return ctx.run(JSON.parse(node.content).command);
    } catch {
      throw new Error("This shortcut is invalid.");
    }
  }
  if (["wdoc", "rtf"].includes(ext)) return ctx.launch("wordpad", { path });
  if (
    ["png", "jpg", "jpeg", "bmp", "gif", "webp", "svg"].includes(ext) ||
    node.mime?.startsWith("image/")
  )
    return ctx.launch("imaging", { path });
  if (
    ["wav", "mp3", "ogg", "m4a", "mp4", "webm"].includes(ext) ||
    /^(audio|video)\//.test(node.mime)
  )
    return ctx.launch("mediaplayer", { path });
  if (["html", "htm"].includes(ext)) return ctx.launch("ie", { path });
  if (["exe", "dll", "sys", "msi"].includes(ext))
    return ctx.dialogs.message(
      "This is a native Windows binary. The browser desktop does not include an x86/NT emulator to execute it.\n\nUse a built-in browser program or open it in a compatible emulator.",
      { title: "Windows", icon: "computer" },
    );
  return ctx.launch("notepad", { path });
};
ctx.run = async (command) => {
  const str = String(command || "").trim();
  if (!str) return;
  if (/^https?:\/\//i.test(str)) return ctx.launch("ie", { url: str });
  const bare = str.replace(/^"|"$/g, "");
  if (/^[a-z]:[\\/]/i.test(bare) && fs.exists(bare)) return ctx.openFile(bare);
  const match = str.match(/^(?:"([^"]+)"|(\S+))(?:\s+(.*))?$/),
    name = (match?.[1] || match?.[2] || "").toLowerCase(),
    argument = (match?.[3] || "").replace(/^"|"$/g, "");
  if (name === "control" || name === "control.exe") {
    if (!argument) return ctx.launch("explorer", { path: "control" });
    const map = {
      "desk.cpl": "display",
      "sysdm.cpl": "system",
      "main.cpl": "mouse",
      "timedate.cpl": "datetime",
      "mmsys.cpl": "sounds",
      "inetcpl.cpl": "internet",
      "appwiz.cpl": "programs",
      "intl.cpl": "regional",
      "access.cpl": "accessibility",
    };
    return ctx.launch("control", {
      page: map[argument.toLowerCase()] || argument.toLowerCase(),
    });
  }
  if (name === "shutdown") return ctx.shell.shutdown();
  if (name === "logoff") return ctx.lock();
  const app = ctx.apps.find(
    (a) =>
      a.id === name ||
      a.aliases?.includes(name) ||
      a.name.toLowerCase() === name,
  );
  if (!app)
    throw new Error(
      `Windows cannot find “${name}”. Make sure you typed the name correctly, and then try again.\n\nTry: notepad, calc, mspaint, cmd, explorer, winmine, sol, regedit, or winver.`,
    );
  const args = {};
  if (argument) {
    if (app.id === "ie") args.url = argument;
    else if (app.id === "cmd")
      args.command = argument.replace(/^\/[ck]\s+/i, "");
    else if (app.id === "explorer") args.path = argument;
    else if (fs.exists(argument)) args.path = normalizePath(argument);
  }
  return ctx.launch(app.id, args);
};
ctx.lock = () => ctx.shell.lock();
ctx.previewScreensaver = (type) => ctx.shell.previewScreensaver(type);
const escapeHTML = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const printHTML = (html) => {
  const frame = document.createElement("iframe");
  frame.className = "print-frame";
  frame.srcdoc =
    '<!doctype html><html><head><meta charset="utf-8"><style>body{font:12pt Arial;margin:24px}pre{white-space:pre-wrap}img{max-width:100%}</style></head><body>' +
    html +
    "</body></html>";
  document.body.append(frame);
  frame.addEventListener(
    "load",
    () => {
      frame.contentWindow.focus();
      frame.contentWindow.print();
      setTimeout(() => frame.remove(), 60000);
    },
    { once: true },
  );
};
ctx.printText = (text, title) =>
  printHTML(
    "<h2>" + escapeHTML(title) + "</h2><pre>" + escapeHTML(text) + "</pre>",
  );
ctx.printImage = (data) => {
  if (!/^data:image\//.test(data)) throw new Error("Invalid image.");
  printHTML('<img src="' + escapeHTML(data) + '">');
};
async function start() {
  try {
    await fs.init();
  } catch (error) {
    console.error(error);
    document.querySelector("#overlay-layer").append(
      el(
        "div",
        { class: "startup-error" },
        el("h1", { text: "Windows could not open the virtual hard drive." }),
        el("p", {
          text: "Allow this site to store browser data, then reload. Your existing files have not been replaced.",
        }),
        el("p", { text: error.message }),
        button("Try Again", () => location.reload()),
      ),
    );
    return;
  }
  await ctx.renderer.init();
  applyTheme(settings);
  ctx.shell = new DesktopShell(ctx).init();
  ctx.log("Information", "System", "Windows 2000 browser desktop started");
  bus.on("fs:change", () =>
    ctx.log(
      "Information",
      "File System",
      "Virtual drive transaction committed",
    ),
  );
  bus.on("settings:change", () =>
    ctx.log("Information", "Control Panel", "Desktop settings updated"),
  );
  const explorer = await ctx.launch("explorer", { path: "computer" });
  explorer.geometry.x = Math.max(85, Math.round(innerWidth * 0.12));
  explorer.geometry.y = Math.max(38, Math.round(innerHeight * 0.12));
  explorer.geometry.width = Math.min(690, innerWidth - 100);
  explorer.geometry.height = Math.min(460, innerHeight - 90);
  wm.applyGeometry(explorer);
  if (settings.get("showWelcome")) await ctx.launch("welcome");
  wm.fit();
  document.body.classList.add("ready");
  const params = new URLSearchParams(location.search);
  if (params.has("app")) {
    const id = params.get("app");
    if (ctx.apps.some((a) => a.id === id)) await ctx.launch(id);
  }
  if (document.modelContext?.registerTool) {
    const lifecycle = new AbortController(),
      register = (tool) =>
        Promise.resolve(
          document.modelContext.registerTool(tool, {
            signal: lifecycle.signal,
          }),
        ).catch(console.error);
    register({
      name: "list_desktop_programs",
      title: "List desktop programs",
      description:
        "List the installed browser desktop programs and currently open windows.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: () => ({
        programs: ctx.apps.map(({ id, name }) => ({ id, name })),
        windows: wm.windows.map(({ id, appId, title }) => ({
          id,
          appId,
          title,
        })),
      }),
    });
    register({
      name: "open_desktop_program",
      title: "Open desktop program",
      description: "Launch an installed Windows 2000 browser desktop program.",
      inputSchema: {
        type: "object",
        properties: {
          program: { type: "string", enum: ctx.apps.map((a) => a.id) },
        },
        required: ["program"],
        additionalProperties: false,
      },
      execute: async (input) => {
        if (
          !input ||
          typeof input.program !== "string" ||
          !ctx.apps.some((a) => a.id === input.program)
        )
          throw new Error("Unknown program.");
        const win = await ctx.launch(input.program);
        return { windowId: win?.id, title: win?.title };
      },
    });
    register({
      name: "list_virtual_files",
      title: "List virtual files",
      description: "Read a directory on the desktop virtual hard drive.",
      inputSchema: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: (input) => {
        if (typeof input?.path !== "string")
          throw new Error("A path is required.");
        const n = fs.stat(input.path);
        if (n.type !== "folder")
          throw new Error("The path is not a directory.");
        return {
          files: fs
            .list(input.path)
            .map(({ name, path, type, size }) => ({ name, path, type, size })),
        };
      },
    });
    window.addEventListener("pagehide", () => lifecycle.abort(), {
      once: true,
    });
  }
  window.win2k = { version: "1.0.0", ...ctx };
  if ("serviceWorker" in navigator && !location.hostname.endsWith(".local"))
    navigator.serviceWorker
      .register("/sw.js")
      .catch((e) => console.info("Offline cache unavailable:", e.message));
}
start().catch((error) => {
  console.error(error);
  document.querySelector("#overlay-layer").append(
    el(
      "div",
      { class: "startup-error" },
      el("h1", { text: "Windows could not start" }),
      el("p", { text: error.message }),
      button("Restart", () => location.reload()),
    ),
  );
});
