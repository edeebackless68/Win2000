import {
  el,
  button,
  icon,
  popup,
  closeMenus,
  separator,
  fileIcon,
  checkbox,
  field,
  safely,
} from "../ui/index.js";
import { DESKTOP, DOCS, joinPath, basename, pickFiles } from "../core/index.js";
export { openHelp, openWelcome, openAbout } from "./help.js";
export class DesktopShell {
  constructor(ctx) {
    this.ctx = ctx;
    this.start = null;
    this.selected = new Set();
    this.clockTimer = null;
    this.activeIcons = [];
    this.screenSaverTimer = null;
    this.lastActivity = Date.now();
  }
  init() {
    const ctx = this.ctx;
    this.renderDesktop();
    this.renderTaskbar();
    ctx.bus.on("windows:change", () => this.renderTasks());
    ctx.bus.on("fs:change", () => this.renderDesktop());
    ctx.bus.on("settings:change", () => {
      this.renderDesktop();
      this.updateClock();
      document.querySelector("#quick-launch").hidden =
        !ctx.settings.get("quickLaunch");
    });
    document.addEventListener("pointerdown", (e) => {
      this.lastActivity = Date.now();
      if (!e.target.closest("#start-button,.start-menu,.popup-menu"))
        this.closeStart();
    });
    document.addEventListener(
      "keydown",
      safely((e) => this.keydown(e)),
    );
    document.addEventListener("focusin", (e) => {
      if (e.target.closest('[data-app="keyboard"]')) return;
      if (
        e.target.matches(
          "textarea,input:not([type=button]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color])",
        ) ||
        e.target.isContentEditable
      )
        ctx.lastTextTarget = e.target;
    });
    this.clockTimer = setInterval(() => this.updateClock(), 1000);
    this.updateClock();
    const desktop = document.querySelector("#desktop-icons");
    desktop.addEventListener("contextmenu", (e) => {
      if (e.target.closest(".desktop-icon")) return;
      e.preventDefault();
      this.backgroundMenu(e.clientX, e.clientY);
    });
    desktop.addEventListener("pointerdown", (e) => this.marquee(e));
    desktop.addEventListener("dragover", (e) => e.preventDefault());
    desktop.addEventListener(
      "drop",
      safely(async (e) => {
        e.preventDefault();
        if (e.target.closest(".desktop-icon")) return;
        const iconId = e.dataTransfer.getData(
          "application/x-win2k-desktop-icon",
        );
        if (iconId) {
          const positions = ctx.settings.get("desktopPositions") || {};
          positions[iconId] = {
            x: Math.max(0, Math.min(innerWidth - 76, e.clientX - 36)),
            y: Math.max(0, Math.min(innerHeight - 105, e.clientY - 24)),
          };
          ctx.settings.set("desktopPositions", positions);
          return;
        }
        const paths = e.dataTransfer.getData("application/x-win2k-files");
        if (paths) {
          for (const p of JSON.parse(paths))
            if (!p.toLowerCase().startsWith(DESKTOP.toLowerCase() + "/"))
              await ctx.fs.move(
                p,
                joinPath(DESKTOP, ctx.fs.uniqueName(DESKTOP, basename(p))),
                { copy: e.ctrlKey },
              );
        } else
          for (const file of e.dataTransfer.files)
            await ctx.fs.importFile(file, DESKTOP);
      }),
    );
    this.scheduler = setInterval(() => {
      const tasks = ctx.settings.get("scheduledTasks") || [],
        now = Date.now();
      let changed = false;
      for (const task of tasks) {
        if (task.enabled && task.next <= now) {
          ctx.launch(task.app);
          task.lastRun = now;
          if (task.interval) task.next = now + task.interval;
          else task.enabled = false;
          changed = true;
        }
      }
      if (changed) ctx.settings.set("scheduledTasks", tasks);
      const saver = ctx.settings.get("screensaver");
      if (
        saver !== "none" &&
        now - this.lastActivity >
          ctx.settings.get("screenSaverMinutes") * 60000 &&
        !document.querySelector(".screensaver")
      )
        this.previewScreensaver(saver);
    }, 1000);
    window.addEventListener("resize", () => this.renderDesktop());
    return this;
  }
  renderDesktop() {
    const ctx = this.ctx,
      root = document.querySelector("#desktop-icons"),
      positions = ctx.settings.get("desktopPositions") || {};
    const icons = [
      {
        id: "documents",
        name: "My Documents",
        icon: "documents",
        action: () => ctx.launch("explorer", { path: "documents" }),
        folder: DOCS,
      },
      {
        id: "computer",
        name: "My Computer",
        icon: "computer",
        action: () => ctx.launch("explorer", { path: "computer" }),
      },
      {
        id: "network",
        name: "My Network Places",
        icon: "network",
        action: () => ctx.launch("explorer", { path: "network" }),
      },
      {
        id: "recycle",
        name: "Recycle Bin",
        icon: ctx.fs.recycled().length ? "recycleFull" : "recycle",
        action: () => ctx.launch("explorer", { path: "recycle" }),
      },
      {
        id: "ie",
        name: "Internet Explorer",
        icon: "ie",
        action: () => ctx.launch("ie"),
      },
      ...ctx.fs.list(DESKTOP).map((n) => ({
        id: n.path,
        name: n.name,
        icon: fileIcon(n),
        action: () => ctx.openFile(n.path),
        folder: n.type === "folder" ? n.path : null,
        path: n.path,
      })),
    ];
    this.activeIcons = icons;
    root.replaceChildren();
    icons.forEach((item, i) => {
      const rows = Math.max(1, Math.floor((innerHeight - 60) / 82)),
        pos = positions[item.id] || {
          x: Math.floor(i / rows) * 80 + 6,
          y: (i % rows) * 82 + 10,
        },
        b = button(
          [
            icon(item.icon, ctx.settings.get("largeIcons") ? 32 : 16),
            el("span", { text: item.name }),
          ],
          (e) => {
            if (!e.ctrlKey && !e.metaKey) this.selected.clear();
            this.selected.add(item.id);
            this.updateSelection();
          },
          {
            class:
              "desktop-icon" + (this.selected.has(item.id) ? " selected" : ""),
            "data-id": item.id,
            title: item.name,
            style: {
              left: Math.min(pos.x, innerWidth - 77) + "px",
              top: Math.min(pos.y, innerHeight - 105) + "px",
            },
            draggable: true,
          },
        );
      b.addEventListener(
        "dblclick",
        safely(() => item.action()),
      );
      b.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.selected = new Set([item.id]);
        this.updateSelection();
        popup(
          [
            { label: "Open", action: item.action },
            ...(item.path
              ? [
                  separator(),
                  {
                    label: "Cut",
                    action: () => ctx.clipboard.setFiles([item.path], "cut"),
                  },
                  {
                    label: "Copy",
                    action: () => ctx.clipboard.setFiles([item.path]),
                  },
                  { label: "Rename", action: () => this.renameSelected() },
                  { label: "Delete", action: () => this.deleteSelected() },
                ]
              : []),
            separator(),
            {
              label: "Properties",
              action: () =>
                item.id === "recycle"
                  ? ctx.dialogs.message(
                      "Items in the Recycle Bin can be restored or permanently deleted.",
                      { title: "Recycle Bin Properties", icon: "recycle" },
                    )
                  : ctx.launch("control", {
                      page:
                        item.id === "computer"
                          ? "system"
                          : item.id === "network"
                            ? "network"
                            : item.id === "ie"
                              ? "internet"
                              : "folder",
                    }),
            },
          ],
          e.clientX,
          e.clientY,
        );
      });
      b.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("application/x-win2k-desktop-icon", item.id);
        if (item.path)
          e.dataTransfer.setData(
            "application/x-win2k-files",
            JSON.stringify([item.path]),
          );
      });
      if (item.folder || item.id === "recycle") {
        b.addEventListener("dragover", (e) => {
          e.preventDefault();
          e.stopPropagation();
          b.classList.add("drop-target");
        });
        b.addEventListener("dragleave", () =>
          b.classList.remove("drop-target"),
        );
        b.addEventListener(
          "drop",
          safely(async (e) => {
            e.preventDefault();
            e.stopPropagation();
            b.classList.remove("drop-target");
            const data = e.dataTransfer.getData("application/x-win2k-files");
            if (data) {
              for (const p of JSON.parse(data))
                if (item.id === "recycle") await ctx.fs.remove(p);
                else if (p !== item.folder)
                  await ctx.fs.move(
                    p,
                    joinPath(
                      item.folder,
                      ctx.fs.uniqueName(item.folder, basename(p)),
                    ),
                    { copy: e.ctrlKey },
                  );
            } else if (item.folder)
              for (const file of e.dataTransfer.files)
                await ctx.fs.importFile(file, item.folder);
          }),
        );
      }
      root.append(b);
    });
  }
  updateSelection() {
    document.querySelectorAll(".desktop-icon").forEach((el) => {
      el.classList.toggle("selected", this.selected.has(el.dataset.id));
      el.setAttribute("aria-selected", this.selected.has(el.dataset.id));
    });
  }
  marquee(e) {
    if (e.button !== 0 || e.target.closest(".desktop-icon")) return;
    this.selected.clear();
    this.updateSelection();
    const box = document.querySelector("#selection-rect"),
      sx = e.clientX,
      sy = e.clientY;
    box.hidden = false;
    const root = e.currentTarget;
    root.setPointerCapture(e.pointerId);
    const move = (ev) => {
      const x = Math.min(sx, ev.clientX),
        y = Math.min(sy, ev.clientY),
        width = Math.abs(ev.clientX - sx),
        height = Math.abs(ev.clientY - sy);
      Object.assign(box.style, {
        left: x + "px",
        top: y + "px",
        width: width + "px",
        height: height + "px",
      });
      this.selected.clear();
      document.querySelectorAll(".desktop-icon").forEach((n) => {
        const r = n.getBoundingClientRect();
        if (
          r.left < x + width &&
          r.right > x &&
          r.top < y + height &&
          r.bottom > y
        )
          this.selected.add(n.dataset.id);
      });
      this.updateSelection();
    };
    const stop = () => {
      box.hidden = true;
      root.removeEventListener("pointermove", move);
    };
    root.addEventListener("pointermove", move);
    root.addEventListener("pointerup", stop, { once: true });
    root.addEventListener("pointercancel", stop, { once: true });
  }
  async renameSelected() {
    const item = this.activeIcons.find(
      (a) => this.selected.has(a.id) && a.path,
    );
    if (!item) return;
    const n = await this.ctx.dialogs.prompt("Type a new name:", item.name, {
      title: "Rename",
    });
    if (n) await this.ctx.fs.rename(item.path, n);
  }
  async deleteSelected() {
    const items = this.activeIcons.filter(
      (a) => this.selected.has(a.id) && a.path,
    );
    if (
      items.length &&
      (await this.ctx.dialogs.confirm(
        "Send " + items.length + " item(s) to the Recycle Bin?",
        "Confirm File Delete",
      ))
    )
      for (const item of items) await this.ctx.fs.remove(item.path);
  }
  backgroundMenu(x, y) {
    const ctx = this.ctx;
    popup(
      [
        {
          label: "Arrange Icons",
          submenu: [
            {
              label: "By Name",
              action: () => {
                ctx.settings.set("desktopPositions", {});
                this.renderDesktop();
              },
            },
            {
              label: "Auto Arrange",
              action: () => ctx.settings.set("desktopPositions", {}),
            },
          ],
        },
        { label: "Refresh", action: () => this.renderDesktop() },
        separator(),
        {
          label: "Paste",
          disabled: !ctx.clipboard.files.length,
          action: () => ctx.clipboard.pasteFiles(ctx.fs, DESKTOP),
        },
        separator(),
        {
          label: "New",
          submenu: [
            {
              label: "Folder",
              icon: "folder",
              action: async () => {
                const n = await ctx.dialogs.prompt(
                  "Type a name for the new folder:",
                  ctx.fs.uniqueName(DESKTOP, "New Folder"),
                  { title: "New Folder" },
                );
                if (n) await ctx.fs.mkdir(joinPath(DESKTOP, n));
              },
            },
            {
              label: "Text Document",
              icon: "notepad",
              action: async () => {
                const name = ctx.fs.uniqueName(
                  DESKTOP,
                  "New Text Document.txt",
                );
                await ctx.fs.writeFile(joinPath(DESKTOP, name), "");
                this.renderDesktop();
              },
            },
            {
              label: "Shortcut",
              icon: "document",
              action: async () => {
                const command = await ctx.dialogs.prompt(
                  "Type the location of the item (program name or file path):",
                  "notepad",
                  { title: "Create Shortcut" },
                );
                if (!command) return;
                const name = await ctx.dialogs.prompt(
                  "Type a name for this shortcut:",
                  "New Shortcut",
                  { title: "Create Shortcut" },
                );
                if (name)
                  await ctx.fs.writeFile(
                    joinPath(
                      DESKTOP,
                      ctx.fs.uniqueName(DESKTOP, name + ".lnk"),
                    ),
                    JSON.stringify({ command }),
                    { mime: "application/x-win2k-shortcut" },
                  );
              },
            },
          ],
        },
        separator(),
        {
          label: "Properties",
          action: () => ctx.launch("control", { page: "display" }),
        },
      ],
      x,
      y,
    );
  }
  renderTaskbar() {
    const ctx = this.ctx,
      taskbar = document.querySelector("#taskbar");
    taskbar.replaceChildren(
      button(
        [icon("windows", 22), el("b", { text: "Start" })],
        () => this.toggleStart(),
        {
          id: "start-button",
          class: "start-button",
          "aria-haspopup": "menu",
          "aria-expanded": "false",
        },
      ),
      el("span", { class: "taskbar-grip" }),
      el(
        "div",
        { id: "quick-launch" },
        button(icon("computer"), () => ctx.wm.showDesktop(), {
          class: "quick-launch-button",
          title: "Show Desktop",
          "aria-label": "Show Desktop",
        }),
        button(icon("ie"), () => ctx.launch("ie"), {
          class: "quick-launch-button",
          title: "Launch Internet Explorer Browser",
          "aria-label": "Internet Explorer",
        }),
        button(icon("mail"), () => ctx.launch("outlook"), {
          class: "quick-launch-button",
          title: "Launch Outlook Express",
          "aria-label": "Outlook Express",
        }),
      ),
      el("span", { class: "taskbar-grip" }),
      el("div", { id: "task-buttons" }),
      el(
        "div",
        { class: "system-tray inset" },
        button("EN", () => ctx.launch("control", { page: "keyboard" }), {
          class: "tray-button language",
          title: "English (United States)",
        }),
        button(icon("speaker"), () => ctx.launch("volume"), {
          class: "tray-button",
          title: "Volume",
          "aria-label": "Volume",
        }),
        button(
          icon("network"),
          () => ctx.launch("control", { page: "network" }),
          {
            class: "tray-button",
            title: "Local Area Connection",
            "aria-label": "Network status",
          },
        ),
        button("", () => ctx.launch("control", { page: "datetime" }), {
          id: "taskbar-clock",
          class: "tray-button clock",
          "aria-label": "Date and time",
        }),
      ),
    );
    taskbar.addEventListener("contextmenu", (e) => {
      if (e.target.closest("#task-buttons button")) return;
      e.preventDefault();
      popup(
        [
          {
            label: "Toolbars",
            submenu: [
              {
                label: "Quick Launch",
                checked: ctx.settings.get("quickLaunch"),
                action: () =>
                  ctx.settings.set(
                    "quickLaunch",
                    !ctx.settings.get("quickLaunch"),
                  ),
              },
            ],
          },
          separator(),
          { label: "Cascade Windows", action: () => ctx.wm.arrange("cascade") },
          {
            label: "Tile Windows Horizontally",
            action: () => ctx.wm.arrange("horizontal"),
          },
          {
            label: "Tile Windows Vertically",
            action: () => ctx.wm.arrange("vertical"),
          },
          { label: "Minimize All Windows", action: () => ctx.wm.showDesktop() },
          separator(),
          { label: "Task Manager", action: () => ctx.launch("taskmgr") },
          { label: "Properties", action: () => this.taskbarProperties() },
        ],
        e.clientX,
        e.clientY,
      );
    });
    this.renderTasks();
  }
  renderTasks() {
    const ctx = this.ctx,
      root = document.querySelector("#task-buttons");
    if (!root) return;
    root.replaceChildren(
      ...ctx.wm.windows
        .filter((w) => !w.dialog && !w.closed)
        .map((w) => {
          const b = button(
            [icon(w.icon), el("span", { text: w.title })],
            () => {
              if (ctx.wm.active === w && !w.minimized) w.minimize();
              else w.focus();
            },
            {
              class: "task-button" + (ctx.wm.active === w ? " active" : ""),
              title: w.title,
              "aria-label": w.title,
              "data-task-id": w.id,
            },
          );
          b.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            ctx.wm.systemMenu(w, e.clientX, e.clientY - 100);
          });
          return b;
        }),
    );
  }
  updateClock() {
    const s = this.ctx.settings,
      date = new Date(Date.now() + (s.get("clockOffset") || 0)),
      clock = document.querySelector("#taskbar-clock");
    if (!clock) return;
    clock.textContent = date.toLocaleTimeString(s.get("locale") || "en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: s.get("showSeconds") ? "2-digit" : undefined,
      hour12: s.get("timeFormat") !== "24",
    });
    clock.title = date.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  appItems(ids) {
    return ids
      .map((id) => {
        const app = this.ctx.apps.find((a) => a.id === id);
        return app
          ? {
              label: app.name,
              icon: app.icon,
              action: () => this.ctx.launch(id),
            }
          : null;
      })
      .filter(Boolean);
  }
  toggleStart() {
    if (this.start) {
      this.closeStart();
      return;
    }
    closeMenus();
    const ctx = this.ctx,
      startButton = document.querySelector("#start-button");
    startButton.classList.add("pressed");
    startButton.setAttribute("aria-expanded", "true");
    const games = this.appItems([
        "freecell",
        "minesweeper",
        "pinball",
        "solitaire",
      ]),
      accessories = [
        {
          label: "Accessibility",
          icon: "folder",
          submenu: this.appItems(["magnifier", "keyboard"]),
        },
        {
          label: "Communications",
          icon: "folder",
          submenu: this.appItems([
            "hyperterminal",
            "dialer",
            "ie",
            "outlook",
            "address",
          ]),
        },
        {
          label: "Entertainment",
          icon: "folder",
          submenu: this.appItems([
            "cdplayer",
            "recorder",
            "volume",
            "mediaplayer",
          ]),
        },
        { label: "Games", icon: "games", submenu: games },
        {
          label: "System Tools",
          icon: "folder",
          submenu: this.appItems([
            "clipboard",
            "charmap",
            "defrag",
            "systeminfo",
            "tasks",
            "diskmanager",
          ]),
        },
        separator(),
        ...this.appItems([
          "address",
          "calculator",
          "cmd",
          "imaging",
          "notepad",
          "paint",
          "synchronize",
          "explorer",
          "wordpad",
        ]),
      ];
    const programs = [
        { label: "Accessories", icon: "folder", submenu: accessories },
        ...this.appItems(["ie", "outlook", "mediaplayer"]),
        separator(),
        {
          label: "Administrative Tools",
          icon: "settings",
          submenu: this.appItems(["taskmgr", "regedit", "events", "devices"]),
        },
      ],
      settings = [
        {
          label: "Control Panel",
          icon: "control",
          action: () => ctx.launch("explorer", { path: "control" }),
        },
        {
          label: "Network and Dial-up Connections",
          icon: "network",
          action: () => ctx.launch("control", { page: "network" }),
        },
        {
          label: "Printers",
          icon: "document",
          action: () => ctx.launch("control", { page: "printers" }),
        },
        {
          label: "Taskbar & Start Menu...",
          icon: "settings",
          action: () => this.taskbarProperties(),
        },
      ];
    const recent = (ctx.settings.get("recentFiles") || [])
      .filter((p) => ctx.fs.exists(p))
      .slice(0, 8);
    const rows = [
      {
        label: "Windows Update",
        icon: "windows",
        action: () => ctx.launch("help", { topic: "updates" }),
      },
      { separator: true },
      { label: "Programs", icon: "programs", submenu: programs },
      {
        label: "Documents",
        icon: "documents",
        submenu: [
          {
            label: "My Documents",
            icon: "documents",
            action: () => ctx.launch("explorer", { path: "documents" }),
          },
          separator(),
          ...(recent.length
            ? recent.map((path) => ({
                label: basename(path),
                icon: fileIcon(ctx.fs.stat(path)),
                action: () => ctx.openFile(path),
              }))
            : [{ label: "(Empty)", disabled: true }]),
        ],
      },
      { label: "Settings", icon: "settings", submenu: settings },
      {
        label: "Search",
        icon: "search",
        submenu: [
          {
            label: "For Files or Folders...",
            icon: "search",
            action: () => ctx.launch("explorer", { path: "search" }),
          },
          {
            label: "On the Internet...",
            icon: "ie",
            action: () => ctx.launch("ie"),
          },
        ],
      },
      { label: "Help", icon: "help", action: () => ctx.launch("help") },
      { label: "Run...", icon: "run", action: () => ctx.launch("run") },
      { separator: true },
      {
        label: "Shut Down...",
        icon: "shutdown",
        action: () => this.shutdown(),
      },
    ];
    let child = null;
    const items = el("div", { class: "start-items" });
    this.start = el(
      "div",
      { class: "start-menu", role: "menu" },
      el(
        "div",
        { class: "start-brand" },
        el(
          "div",
          {},
          el("strong", { text: "Windows" }),
          el("span", { text: "2000" }),
          el("small", { text: "Professional" }),
        ),
      ),
      items,
    );
    for (const item of rows) {
      if (item.separator) {
        items.append(el("div", { class: "menu-separator" }));
        continue;
      }
      const b = button(
        [
          icon(item.icon, 32),
          el("span", { text: item.label }),
          item.submenu
            ? el("span", { class: "start-arrow", text: "▶" })
            : null,
        ],
        () => {
          if (item.submenu) openChild();
          else {
            this.closeStart();
            return item.action?.();
          }
        },
        {
          class: "start-item",
          role: "menuitem",
          "aria-haspopup": item.submenu ? "menu" : null,
        },
      );
      const openChild = () => {
        closeMenus();
        items
          .querySelectorAll(".selected")
          .forEach((n) => n.classList.remove("selected"));
        b.classList.add("selected");
        if (item.submenu) {
          const r = b.getBoundingClientRect();
          child = popup(item.submenu, r.right - 1, r.top);
        }
      };
      b.addEventListener("pointerenter", openChild);
      b.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" && item.submenu) {
          e.preventDefault();
          openChild();
          child?.querySelector("button:not(:disabled)")?.focus();
        }
      });
      items.append(b);
    }
    document.querySelector("#menu-layer").append(this.start);
    this.start.addEventListener("keydown", (e) => {
      const buttons = [...items.querySelectorAll("button")],
        i = buttons.indexOf(document.activeElement);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        buttons[
          (i + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) %
            buttons.length
        ]?.focus();
      }
      if (e.key === "Escape") this.closeStart();
    });
  }
  closeStart() {
    this.start?.remove();
    this.start = null;
    const b = document.querySelector("#start-button");
    b?.classList.remove("pressed");
    b?.setAttribute("aria-expanded", "false");
    closeMenus();
  }
  taskbarProperties() {
    this.closeStart();
    const ctx = this.ctx,
      w = ctx.wm.create({
        title: "Taskbar and Start Menu Properties",
        icon: "settings",
        width: 400,
        height: 245,
        dialog: true,
        minimizable: false,
        maximizable: false,
        resizable: false,
        appId: "taskbarprops",
      });
    let quick = ctx.settings.get("quickLaunch"),
      seconds = ctx.settings.get("showSeconds");
    w.setContent(
      el(
        "div",
        { class: "dialog-padding" },
        el(
          "fieldset",
          {},
          el("legend", { text: "Taskbar appearance" }),
          checkbox("Show Quick Launch", quick, (v) => (quick = v)),
          checkbox("Show seconds in clock", seconds, (v) => (seconds = v)),
        ),
        el("p", {
          text: "Right-click the taskbar to arrange your open windows.",
        }),
      ),
      el(
        "div",
        { class: "dialog-buttons" },
        button("OK", () => {
          ctx.settings.patch({ quickLaunch: quick, showSeconds: seconds });
          w.close();
        }),
        button("Cancel", () => w.close()),
      ),
    );
  }
  async keydown(e) {
    this.lastActivity = Date.now();
    const ctx = this.ctx;
    if (e.ctrlKey && e.shiftKey && e.key === "Escape") {
      e.preventDefault();
      await ctx.launch("taskmgr");
      return;
    }
    if (e.key === "Escape" && !e.ctrlKey) {
      this.closeStart();
      return;
    }
    if ((e.ctrlKey && e.key === "Escape") || (e.key === "Meta" && !e.repeat)) {
      e.preventDefault();
      this.toggleStart();
      return;
    }
    if (e.ctrlKey && e.shiftKey && e.key === "Escape") {
      e.preventDefault();
      ctx.launch("taskmgr");
      return;
    }
    if (e.altKey && e.key === "F4") {
      e.preventDefault();
      await ctx.wm.active?.close();
      return;
    }
    if (e.altKey && e.key === "Tab") {
      e.preventDefault();
      const wins = ctx.wm.windows.filter((w) => !w.dialog),
        index = wins.indexOf(ctx.wm.active);
      wins[(index + 1) % wins.length]?.focus();
      return;
    }
    if (e.metaKey && e.key.toLowerCase() === "d") {
      e.preventDefault();
      ctx.wm.showDesktop();
      return;
    }
    if (
      e.target.closest(
        ".window, .start-menu, .popup-menu, #taskbar, #overlay-layer, #menu-layer",
      )
    )
      return;
    if (e.target.matches("input,textarea") || e.target.isContentEditable)
      return;
    if (e.key === "Enter") {
      for (const a of this.activeIcons.filter((a) => this.selected.has(a.id)))
        await a.action();
    }
    if (e.key === "Delete") {
      e.preventDefault();
      await this.deleteSelected();
    }
    if (e.key === "F2") {
      e.preventDefault();
      await this.renameSelected();
    }
    if (e.key === "F5") {
      e.preventDefault();
      this.renderDesktop();
    }
    if (e.ctrlKey && e.key.toLowerCase() === "a") {
      e.preventDefault();
      this.selected = new Set(this.activeIcons.map((a) => a.id));
      this.updateSelection();
    }
    if (e.ctrlKey && e.key.toLowerCase() === "v") {
      e.preventDefault();
      await ctx.clipboard.pasteFiles(ctx.fs, DESKTOP);
    }
    if (e.ctrlKey && ["c", "x"].includes(e.key.toLowerCase())) {
      e.preventDefault();
      ctx.clipboard.setFiles(
        this.activeIcons
          .filter((a) => this.selected.has(a.id) && a.path)
          .map((a) => a.path),
        e.key.toLowerCase() === "x" ? "cut" : "copy",
      );
    }
  }
  shutdown() {
    const ctx = this.ctx,
      w = ctx.wm.create({
        title: "Shut Down Windows",
        icon: "shutdown",
        width: 420,
        height: 230,
        dialog: true,
        resizable: false,
        minimizable: false,
        maximizable: false,
        appId: "shutdown",
      }),
      select = el(
        "select",
        { "aria-label": "What do you want the computer to do?" },
        el("option", { text: "Shut down", value: "shutdown" }),
        el("option", { text: "Restart", value: "restart" }),
        el("option", { text: "Log off Administrator", value: "logoff" }),
      );
    w.setContent(
      el(
        "div",
        { class: "shutdown-content" },
        icon("shutdown", 32),
        el(
          "div",
          {},
          el("p", { text: "What do you want the computer to do?" }),
          select,
          el("p", {
            text: "Closes your programs and saves the virtual desktop.",
          }),
        ),
      ),
      el(
        "div",
        { class: "dialog-buttons" },
        button("OK", async () => {
          const action = select.value;
          await w.close();
          for (const win of [...ctx.wm.windows])
            if (!(await win.close())) return;
          await ctx.fs.queue;
          if (action === "restart") {
            location.reload();
            return;
          }
          this.lock(action === "shutdown");
        }),
        button("Cancel", () => w.close()),
        button("Help", () => ctx.launch("help", { topic: "windows" })),
      ),
    );
    return w;
  }
  lock(shutdown = false) {
    this.closeStart();
    const overlay = el(
      "div",
      { class: "lock-screen" },
      el(
        "div",
        { class: "lock-dialog" },
        el(
          "div",
          { class: "lock-brand" },
          icon("windows", 32),
          el(
            "div",
            {},
            el("b", { text: "Microsoft Windows 2000" }),
            el("span", { text: "Professional" }),
          ),
        ),
        el(
          "div",
          { class: "lock-message" },
          el("h2", {
            text: shutdown
              ? "It is now safe to close your browser."
              : "This computer is locked.",
          }),
          el("p", {
            text: shutdown
              ? "Your virtual files have been saved."
              : this.ctx.settings.get("username") +
                " is signed in to this virtual desktop.",
          }),
          button(
            shutdown ? "Start Windows" : "Unlock Computer",
            () => {
              overlay.remove();
              if (shutdown) {
                this.ctx.sound.play("startup");
                this.ctx.launch("welcome");
              }
            },
            { class: "default-button" },
          ),
        ),
      ),
    );
    document.querySelector("#overlay-layer").append(overlay);
  }
  previewScreensaver(type) {
    if (type === "none") return;
    this.lastActivity = Date.now();
    const overlay = el("div", { class: "screensaver" }),
      canvas = el("canvas", { width: innerWidth, height: innerHeight });
    overlay.append(canvas);
    document.querySelector("#overlay-layer").append(overlay);
    const c = canvas.getContext("2d"),
      stars = Array.from({ length: 130 }, () => ({
        x: (Math.random() - 0.5) * innerWidth,
        y: (Math.random() - 0.5) * innerHeight,
        z: Math.random() * 1000,
      }));
    let raf,
      t = 0;
    const draw = () => {
      t += 0.016;
      c.fillStyle = type === "pipes" ? "rgba(0,0,0,.09)" : "#000";
      c.fillRect(0, 0, canvas.width, canvas.height);
      if (type === "starfield") {
        for (const s of stars) {
          s.z -= 3;
          if (s.z <= 1) s.z = 1000;
          const k = 240 / s.z;
          c.fillStyle = "#fff";
          c.fillRect(
            s.x * k + innerWidth / 2,
            s.y * k + innerHeight / 2,
            Math.max(1, k * 2),
            Math.max(1, k * 2),
          );
        }
      } else if (type === "pipes") {
        c.strokeStyle = `hsl(${(t * 28) % 360} 75% 55%)`;
        c.lineWidth = 2;
        c.beginPath();
        for (let i = 0; i < 6; i++) {
          const x =
              innerWidth / 2 + Math.sin(t * 0.6 + i * 1.2) * innerWidth * 0.42,
            y =
              innerHeight / 2 +
              Math.cos(t * 0.8 + i * 1.9) * innerHeight * 0.42;
          i ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.closePath();
        c.stroke();
      }
      raf = requestAnimationFrame(draw);
    };
    const dismiss = () => {
      cancelAnimationFrame(raf);
      overlay.remove();
      this.lastActivity = Date.now();
      document.removeEventListener("keydown", dismiss);
    };
    overlay.addEventListener("pointerdown", dismiss, { once: true });
    overlay.addEventListener(
      "pointermove",
      () => {
        if (t > 0.2) dismiss();
      },
      { once: true },
    );
    document.addEventListener("keydown", dismiss, { once: true });
    draw();
  }
}
export function openRun(ctx) {
  const w = ctx.wm.create({
      title: "Run",
      icon: "run",
      width: 360,
      height: 184,
      appId: "run",
      dialog: true,
      minimizable: false,
      maximizable: false,
      resizable: false,
      x: 10,
      y: Math.max(10, innerHeight - 235),
    }),
    input = el("input", {
      "aria-label": "Open",
      list: "run-history",
      value: "",
    }),
    history = el(
      "datalist",
      { id: "run-history" },
      ...(ctx.settings.get("runHistory") || []).map((s) =>
        el("option", { value: s }),
      ),
    );
  const run = async () => {
    const text = input.value.trim();
    if (!text) return;
    const launched = await ctx.run(text);
    if (launched?.owner === w) {
      w.modalChildren = w.modalChildren?.filter((child) => child !== launched);
      launched.owner = null;
      w.modalBlocker?.remove();
      w.modalBlocker = null;
      w.el.inert = false;
    }
    ctx.settings.set(
      "runHistory",
      [
        text,
        ...(ctx.settings.get("runHistory") || []).filter((x) => x !== text),
      ].slice(0, 15),
    );
    w.close();
  };
  w.setContent(
    el(
      "div",
      { class: "run-content" },
      icon("run", 32),
      el("p", {
        text: "Type the name of a program, folder, document, or Internet resource, and Windows will open it for you.",
      }),
    ),
    el(
      "div",
      { class: "run-input" },
      el("label", { for: "run-command-" + w.id, text: "Open:" }),
      input,
      history,
    ),
    el(
      "div",
      { class: "dialog-buttons" },
      button("OK", run, { class: "default-button" }),
      button("Cancel", () => w.close()),
      button("Browse...", async () => {
        const p = await ctx.dialogs.file();
        if (p) input.value = p.replaceAll("/", "\\");
      }),
    ),
  );
  input.id = "run-command-" + w.id;
  input.addEventListener(
    "keydown",
    safely((e) => {
      if (e.key === "Enter") return run();
      if (e.key === "Escape") return w.close();
    }),
  );
  queueMicrotask(() => input.focus());
  return w;
}
