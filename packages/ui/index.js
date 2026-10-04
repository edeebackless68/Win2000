/** @package @win2k/ui — classic controls, menus, dialogs, and window management. */
import {
  DOCS,
  basename,
  dirname,
  joinPath,
  normalizePath,
  formatBytes,
  extension,
} from "../core/index.js";
let errorHandler = (e) => console.error(e);
export const setErrorHandler = (fn) => {
  errorHandler = fn;
};
export const safely =
  (fn) =>
  (...args) => {
    try {
      Promise.resolve(fn(...args)).catch(errorHandler);
    } catch (e) {
      errorHandler(e);
    }
  };
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k === "style" && typeof v === "object")
      Object.assign(node.style, v);
    else if (k.startsWith("on") && typeof v === "function")
      node.addEventListener(k.slice(2).toLowerCase(), safely(v));
    else if (
      k === "checked" ||
      k === "disabled" ||
      k === "value" ||
      k === "selected"
    )
      node[k] = v;
    else node.setAttribute(k, v === true ? "" : v);
  }
  for (const child of children.flat(Infinity)) {
    if (child != null && child !== false)
      node.append(
        child instanceof Node ? child : document.createTextNode(String(child)),
      );
  }
  return node;
}
export const button = (label, action, attrs = {}) =>
  el("button", { type: "button", onclick: action, ...attrs }, label);
const icons = {
  computer: "my-computer",
  documents: "my-documents",
  network: "network",
  recycle: "recycle-bin",
  recycleFull: "recycle-bin-full",
  ie: "internet-explorer",
  folder: "folder",
  folderOpen: "folder-open",
  drive: "hard-disk-drive",
  notepad: "notepad",
  paint: "paint",
  calculator: "calculator",
  solitaire: "solitaire",
  freecell: "solitaire",
  minesweeper: "minesweeper",
  pinball: "games",
  games: "games",
  programs: "programs",
  settings: "settings",
  control: "control-panel",
  run: "run",
  shutdown: "shutdown",
  logoff: "logoff",
  help: "help",
  search: "find-file",
  document: "document",
  wordpad: "document",
  cmd: "run",
  speaker: "speaker",
  media: "speaker",
  registry: "settings",
  taskmgr: "my-computer",
  keyboard: "my-computer",
  display: "my-computer",
  mail: "document",
  address: "document",
  font: "document",
  cd: "hard-disk-drive",
};
export function icon(name = "document", size = 16) {
  const resolved = icons[name] || name;
  return el("img", {
    class: "icon",
    src:
      name === "windows"
        ? `/assets/icons/windows-${size === 32 ? "32x32" : "22x22"}-8bpp.png`
        : `/assets/icons/${resolved}-${size === 32 ? "32x32" : "16x16"}.png`,
    width: size,
    height: size,
    alt: "",
    draggable: "false",
    onerror: (e) => {
      if (!e.target.dataset.fallback) {
        e.target.dataset.fallback = "1";
        e.target.src = "/assets/icons/document-16x16.png";
      }
    },
  });
}
export function fileIcon(file) {
  if (file.type === "folder") return "folder";
  const ext = extension(file.name);
  if (["png", "bmp", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext))
    return "paint";
  if (["mp3", "wav", "ogg", "mp4", "webm"].includes(ext)) return "media";
  if (["htm", "html", "url"].includes(ext)) return "ie";
  if (["rtf", "wdoc"].includes(ext)) return "wordpad";
  if (
    ["txt", "ini", "log", "md", "js", "json", "css", "bat", "csv"].includes(ext)
  )
    return "notepad";
  return "document";
}
export function separator() {
  return { separator: true };
}
let menuRoots = [];
export function closeMenus() {
  for (const m of menuRoots) m.remove();
  menuRoots = [];
  document
    .querySelectorAll(".menu-open")
    .forEach((n) => n.classList.remove("menu-open"));
}
document.addEventListener("pointerdown", (e) => {
  if (!e.target.closest(".popup-menu,.menu-bar,.start-menu,#start-button"))
    closeMenus();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenus();
});
export function popup(items, x, y, { parent = null, anchor = null } = {}) {
  if (!parent) closeMenus();
  const menu = el("div", { class: "popup-menu", role: "menu", tabindex: -1 });
  let child = null;
  for (const item of items) {
    if (!item) continue;
    if (item.separator) {
      menu.append(el("div", { class: "menu-separator", role: "separator" }));
      continue;
    }
    const row = el(
      "button",
      {
        class: "popup-item",
        type: "button",
        role: item.checked != null ? "menuitemcheckbox" : "menuitem",
        "aria-checked": item.checked != null ? String(item.checked) : null,
        disabled: item.disabled,
        tabindex: -1,
      },
      el("span", { class: "menu-check", text: item.checked ? "✓" : "" }),
      item.icon ? icon(item.icon) : el("span", { class: "menu-icon-space" }),
      el("span", { class: "menu-label", text: item.label }),
      el("span", { class: "menu-shortcut", text: item.shortcut || "" }),
      item.submenu ? el("span", { class: "menu-arrow", text: "▶" }) : null,
    );
    const openChild = () => {
      if (child) {
        child.remove();
        child = null;
      }
      menu
        .querySelectorAll(".selected")
        .forEach((n) => n.classList.remove("selected"));
      row.classList.add("selected");
      if (item.submenu && !item.disabled) {
        const r = row.getBoundingClientRect();
        child = popup(
          typeof item.submenu === "function" ? item.submenu() : item.submenu,
          r.right - 3,
          r.top - 3,
          { parent: menu },
        );
      }
    };
    row.addEventListener("pointerenter", openChild);
    row.addEventListener("focus", () => {
      menu
        .querySelectorAll(".selected")
        .forEach((n) => n.classList.remove("selected"));
      row.classList.add("selected");
    });
    row.addEventListener(
      "click",
      safely(() => {
        if (item.submenu) {
          openChild();
          child?.querySelector("button:not(:disabled)")?.focus();
        } else {
          closeMenus();
          return item.action?.();
        }
      }),
    );
    row.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" && item.submenu) {
        e.preventDefault();
        openChild();
        child?.querySelector("button:not(:disabled)")?.focus();
      }
    });
    menu.append(row);
  }
  menu.addEventListener("keydown", (e) => {
    const rows = [...menu.querySelectorAll(":scope > button:not(:disabled)")],
      i = rows.indexOf(document.activeElement);
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      const n =
        e.key === "Home"
          ? 0
          : e.key === "End"
            ? rows.length - 1
            : (i + (e.key === "ArrowDown" ? 1 : -1) + rows.length) %
              rows.length;
      rows[n]?.focus();
    }
    if (e.key === "Escape" || e.key === "ArrowLeft") {
      e.preventDefault();
      if (parent) {
        menu.remove();
        parent.querySelector(".selected")?.focus();
      } else closeMenus();
    }
  });
  document.querySelector("#menu-layer").append(menu);
  menuRoots.push(menu);
  const r = menu.getBoundingClientRect();
  if (x + r.width > innerWidth)
    x = parent
      ? Math.max(0, x - r.width - parent.offsetWidth + 7)
      : innerWidth - r.width - 2;
  y = Math.max(0, Math.min(y, innerHeight - r.height - 3));
  menu.style.left = Math.max(0, x) + "px";
  menu.style.top = y + "px";
  anchor?.classList.add("menu-open");
  return menu;
}
export function menuBar(groups) {
  const bar = el("nav", {
    class: "menu-bar",
    "aria-label": "Application menu",
  });
  for (const [label, items] of Object.entries(groups)) {
    const b = button(
      label,
      () => {
        const r = b.getBoundingClientRect();
        popup(typeof items === "function" ? items() : items, r.left, r.bottom, {
          anchor: b,
        });
      },
      { class: "menu-bar-item", "aria-haspopup": "menu" },
    );
    b.addEventListener("pointerenter", () => {
      if (
        document.querySelector(".popup-menu") &&
        bar.querySelector(".menu-open")
      )
        b.click();
    });
    bar.append(b);
  }
  return bar;
}
export function toolbar(items) {
  const row = el("div", { class: "toolbar" });
  for (const item of items) {
    if (item.separator) {
      row.append(el("span", { class: "toolbar-separator" }));
      continue;
    }
    const b = button(
      [
        item.icon ? icon(item.icon, item.large ? 32 : 16) : null,
        item.glyph
          ? el("span", { class: "toolbar-glyph", text: item.glyph })
          : null,
        item.label ? el("span", { text: item.label }) : null,
      ],
      item.action,
      {
        class: "tool-button" + (item.vertical ? " vertical" : ""),
        title: item.title || item.label,
        "aria-label": item.title || item.label,
        disabled: item.disabled,
      },
    );
    row.append(b);
  }
  return row;
}
export function statusBar(...texts) {
  return el(
    "div",
    { class: "status-bar" },
    texts.map((t) => el("div", { class: "status-panel", text: t })),
    el("span", { class: "status-grip" }),
  );
}
export function tabs(pages) {
  const root = el("div", { class: "tabs" }),
    strip = el("div", { class: "tab-strip", role: "tablist" }),
    body = el("div", { class: "tab-body" });
  let current = 0;
  const show = (i) => {
    current = i;
    strip.querySelectorAll("button").forEach((b, j) => {
      b.classList.toggle("active", j === i);
      b.setAttribute("aria-selected", j === i);
    });
    body.replaceChildren(
      typeof pages[i].content === "function"
        ? pages[i].content()
        : pages[i].content,
    );
  };
  pages.forEach((p, i) =>
    strip.append(button(p.label, () => show(i), { class: "tab", role: "tab" })),
  );
  root.append(strip, body);
  show(0);
  root.select = show;
  return root;
}
export const field = (label, input) =>
  el("label", { class: "field" }, el("span", { text: label }), input);
export const checkbox = (label, checked, onchange) =>
  el(
    "label",
    { class: "check-field" },
    el("input", {
      type: "checkbox",
      checked,
      onchange: (e) => onchange?.(e.target.checked),
    }),
    label,
  );

export class WindowManager {
  constructor(bus) {
    this.bus = bus;
    this.windows = [];
    this.nextId = 1;
    this.z = 20;
    this.active = null;
    window.addEventListener("resize", () => this.fit());
  }
  create({
    title = "",
    icon: ico = "document",
    width = 620,
    height = 420,
    x,
    y,
    appId = "app",
    resizable = true,
    minimizable = true,
    maximizable = true,
    dialog = false,
    owner = null,
  } = {}) {
    if (dialog && !owner) owner = this.active;
    const id = this.nextId++,
      offset = (this.windows.length % 7) * 22;
    const area = this.area();
    width = Math.min(width, area.width - 8);
    height = Math.min(height, area.height - 8);
    x = x ?? Math.max(2, Math.round((area.width - width) / 2) + offset - 20);
    y = y ?? Math.max(2, Math.round((area.height - height) / 2) + offset - 30);
    const w = {
      id,
      title,
      appId,
      icon: ico,
      owner,
      dialog,
      resizable,
      minimizable,
      maximizable,
      minimized: false,
      maximized: false,
      closed: false,
      cleanups: [],
      geometry: { x, y, width, height },
    };
    const close = button("", () => w.close(), {
        class: "caption-button close-button",
        "aria-label": "Close",
        title: "Close",
      }),
      maximize = button("", () => this.maximize(w), {
        class: "caption-button maximize-button",
        "aria-label": "Maximize",
        title: "Maximize",
      }),
      minimize = button("", () => this.minimize(w), {
        class: "caption-button minimize-button",
        "aria-label": "Minimize",
        title: "Minimize",
      });
    const controls = el(
      "div",
      { class: "caption-controls" },
      minimizable ? minimize : null,
      maximizable ? maximize : null,
      close,
    );
    const caption = el("span", { class: "window-caption", text: title });
    const titleIcon = button(
      icon(ico),
      (e) => {
        const r = w.el.getBoundingClientRect();
        this.systemMenu(w, r.left + 3, r.top + 22);
      },
      { class: "caption-icon", "aria-label": "Window menu" },
    );
    titleIcon.addEventListener("dblclick", () => w.close());
    w.titlebar = el(
      "header",
      { class: "title-bar" },
      titleIcon,
      caption,
      controls,
    );
    w.body = el("div", { class: "window-body" });
    w.el = el(
      "section",
      {
        class: "window" + (dialog ? " dialog-window" : ""),
        role: dialog ? "dialog" : "region",
        "aria-label": title,
        "data-window-id": id,
        "data-app": appId,
        tabindex: -1,
      },
      w.titlebar,
      w.body,
    );
    w.el.style.zIndex = ++this.z;
    this.applyGeometry(w);
    document.querySelector("#windows").append(w.el);
    this.windows.push(w);
    w.setTitle = (t) => {
      w.title = t;
      caption.textContent = t;
      w.el.setAttribute("aria-label", t);
      this.bus.emit("windows:change");
    };
    w.setContent = (...children) => w.body.replaceChildren(...children);
    w.setMenu = (groups) => {
      w.el.querySelector(":scope > .menu-bar")?.remove();
      w.titlebar.after(menuBar(groups));
    };
    w.addCleanup = (fn) => w.cleanups.push(fn);
    w.focus = () => this.focus(w);
    w.close = () => this.close(w);
    w.minimize = () => this.minimize(w);
    w.maximize = () => this.maximize(w);
    w.el.addEventListener("pointerdown", () => this.focus(w));
    w.el.addEventListener("focusin", () => this.focus(w));
    w.titlebar.addEventListener("dblclick", (e) => {
      if (maximizable && !e.target.closest("button")) this.maximize(w);
    });
    w.titlebar.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.systemMenu(w, e.clientX, e.clientY);
    });
    w.titlebar.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.target.closest("button") || w.maximized) return;
      this.#drag(w, e, "move");
    });
    if (resizable)
      for (const direction of ["n", "s", "e", "w", "ne", "nw", "se", "sw"]) {
        const handle = el("div", {
          class: "resize-handle " + direction,
          "aria-hidden": "true",
        });
        handle.addEventListener("pointerdown", (e) =>
          this.#drag(w, e, direction),
        );
        w.el.append(handle);
      }
    if (owner && dialog) {
      owner.modalChildren ??= [];
      owner.modalChildren.push(w);
      owner.el.inert = true;
      if (!owner.modalBlocker) {
        owner.modalBlocker = el("div", { class: "modal-blocker" });
        owner.modalBlocker.addEventListener("pointerdown", () =>
          this.focus(owner),
        );
        owner.el.append(owner.modalBlocker);
      }
      w.el.setAttribute("aria-modal", "true");
    }
    this.focus(w);
    this.bus.emit("windows:change");
    return w;
  }
  area() {
    return { width: innerWidth, height: innerHeight - 30 };
  }
  applyGeometry(w) {
    const g = w.geometry;
    Object.assign(w.el.style, {
      left: g.x + "px",
      top: g.y + "px",
      width: g.width + "px",
      height: g.height + "px",
    });
  }
  #drag(w, e, direction) {
    e.preventDefault();
    closeMenus();
    this.focus(w);
    const start = { ...w.geometry },
      sx = e.clientX,
      sy = e.clientY,
      target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    document.body.classList.add("dragging-window");
    const move = (ev) => {
      const dx = ev.clientX - sx,
        dy = ev.clientY - sy,
        area = this.area();
      let { x, y, width, height } = start;
      if (direction === "move") {
        x = Math.max(-width + 90, Math.min(area.width - 90, x + dx));
        y = Math.max(0, Math.min(area.height - 20, y + dy));
      } else {
        const minW = Math.min(230, area.width - 8),
          minH = Math.min(120, area.height - 8);
        if (direction.includes("e")) width = Math.max(minW, width + dx);
        if (direction.includes("s")) height = Math.max(minH, height + dy);
        if (direction.includes("w")) {
          width = Math.max(minW, width - dx);
          x = start.x + start.width - width;
        }
        if (direction.includes("n")) {
          height = Math.max(minH, height - dy);
          y = Math.max(0, start.y + start.height - height);
        }
      }
      w.geometry = { x, y, width, height };
      this.applyGeometry(w);
      w.el.dispatchEvent(new Event("windowresize"));
    };
    const end = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", end);
      target.removeEventListener("pointercancel", end);
      document.body.classList.remove("dragging-window");
      this.bus.emit("windows:geometry", w);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", end, { once: true });
    target.addEventListener("pointercancel", end, { once: true });
  }
  focus(w) {
    if (!w || w.closed) return;
    const child = w.modalChildren?.findLast((a) => !a.closed);
    if (child) {
      this.focus(child);
      if (!child.el.contains(document.activeElement))
        (
          child.el.querySelector(
            "input:not([disabled]), textarea, button:not([disabled]), select",
          ) || child.el
        ).focus({ preventScroll: true });
      return;
    }
    if (w.minimized) {
      w.minimized = false;
      w.el.hidden = false;
    }
    if (this.active === w) return;
    this.active = w;
    w.el.style.zIndex = ++this.z;
    for (const other of this.windows)
      other.el.classList.toggle("active", other === w);
    this.bus.emit("windows:change");
  }
  minimize(w) {
    if (w.closed || !w.minimizable) return;
    if (w.modalChildren?.length) return this.focus(w);
    w.minimized = true;
    w.el.hidden = true;
    if (this.active === w) {
      this.active = null;
      const next = this.windows
        .filter((a) => !a.minimized && a !== w)
        .sort(
          (a, b) => Number(b.el.style.zIndex) - Number(a.el.style.zIndex),
        )[0];
      this.focus(next);
    }
    this.bus.emit("windows:change");
  }
  maximize(w) {
    if (w.closed || !w.maximizable) return;
    if (w.maximized) {
      w.geometry = { ...w.restoreGeometry };
      w.maximized = false;
    } else {
      w.restoreGeometry = { ...w.geometry };
      w.geometry = {
        x: 0,
        y: 0,
        width: this.area().width,
        height: this.area().height,
      };
      w.maximized = true;
    }
    w.el.classList.toggle("maximized", w.maximized);
    const b = w.el.querySelector(".maximize-button");
    b?.classList.toggle("restore-button", w.maximized);
    b?.setAttribute("aria-label", w.maximized ? "Restore" : "Maximize");
    this.applyGeometry(w);
    this.focus(w);
    w.el.dispatchEvent(new Event("windowresize"));
  }
  async close(w, { force = false } = {}) {
    if (w.closed) return true;
    if (w.closing) return w.closing;
    const finish = async () => {
      for (const child of [...(w.modalChildren || [])])
        if (!(await this.close(child, { force }))) return false;
      this.focus(w);
      if (!force && w.onClose && (await w.onClose()) === false) return false;
      w.closed = true;
      for (const cleanup of w.cleanups)
        try {
          cleanup();
        } catch (e) {
          console.error(e);
        }
      if (w.owner) {
        w.owner.modalChildren = w.owner.modalChildren?.filter((c) => c !== w);
        if (!w.owner.modalChildren?.length) {
          w.owner.modalBlocker?.remove();
          w.owner.modalBlocker = null;
          w.owner.el.inert = false;
        }
      }
      w.el.remove();
      this.windows = this.windows.filter((a) => a !== w);
      if (this.active === w) {
        this.active = null;
        this.focus(
          w.owner && !w.owner.closed
            ? w.owner
            : this.windows
                .filter((a) => !a.minimized)
                .sort(
                  (a, b) =>
                    Number(b.el.style.zIndex) - Number(a.el.style.zIndex),
                )[0],
        );
      }
      this.bus.emit("windows:change");
      return true;
    };
    w.closing = finish();
    try {
      return await w.closing;
    } finally {
      w.closing = null;
    }
  }
  systemMenu(w, x, y) {
    popup(
      [
        {
          label: "Restore",
          disabled: !w.maximized && !w.minimized,
          action: () => (w.maximized ? this.maximize(w) : this.focus(w)),
        },
        {
          label: "Minimize",
          disabled: !w.minimizable,
          action: () => this.minimize(w),
        },
        {
          label: "Maximize",
          disabled: !w.maximizable || w.maximized,
          action: () => this.maximize(w),
        },
        separator(),
        { label: "Close", shortcut: "Alt+F4", action: () => w.close() },
      ],
      x,
      y,
    );
  }
  showDesktop() {
    const visible = this.windows.filter((w) => !w.minimized && !w.dialog);
    if (visible.length) {
      this.desktopRestore = visible;
      visible.forEach((w) => this.minimize(w));
    } else {
      this.desktopRestore?.forEach((w) => this.focus(w));
      this.desktopRestore = [];
    }
  }
  arrange(mode) {
    const wins = this.windows.filter((w) => !w.minimized && !w.dialog),
      area = this.area();
    wins.forEach((w, i) => {
      w.maximized = false;
      w.el.classList.remove("maximized");
      if (mode === "cascade")
        w.geometry = {
          x: 32 + i * 25,
          y: 25 + i * 25,
          width: Math.min(650, area.width - 60),
          height: Math.min(450, area.height - 90),
        };
      else if (mode === "horizontal")
        w.geometry = {
          x: 0,
          y: (i * area.height) / wins.length,
          width: area.width,
          height: area.height / wins.length,
        };
      else
        w.geometry = {
          x: (i * area.width) / wins.length,
          y: 0,
          width: area.width / wins.length,
          height: area.height,
        };
      this.applyGeometry(w);
    });
  }
  fit() {
    const a = this.area();
    for (const w of this.windows) {
      if (w.maximized)
        w.geometry = { x: 0, y: 0, width: a.width, height: a.height };
      else {
        w.geometry.x = Math.max(0, Math.min(w.geometry.x, a.width - 120));
        w.geometry.y = Math.max(0, Math.min(w.geometry.y, a.height - 70));
        if (a.width < 600) {
          w.geometry.width = Math.min(w.geometry.width, a.width - 8);
          w.geometry.height = Math.min(w.geometry.height, a.height - 8);
        }
      }
      this.applyGeometry(w);
    }
  }
}

export class DialogService {
  constructor(wm, fs) {
    this.wm = wm;
    this.fs = fs;
  }
  message(
    message,
    {
      title = "Windows",
      icon: ico = "help",
      buttons = ["OK"],
      defaultButton = 0,
    } = {},
  ) {
    return new Promise((resolve) => {
      const w = this.wm.create({
        title,
        icon: ico,
        width: 400,
        height: 180,
        dialog: true,
        resizable: false,
        minimizable: false,
        maximizable: false,
        appId: "dialog",
      });
      const finish = async (value) => {
        w.onClose = null;
        await w.close();
        resolve(value);
      };
      const row = el("div", { class: "dialog-buttons" });
      buttons.forEach((label, i) =>
        row.append(
          button(label, () => finish(label), {
            class: i === defaultButton ? "default-button" : "",
          }),
        ),
      );
      w.setContent(
        el(
          "div",
          { class: "message-content" },
          icon(ico, 32),
          el("div", { class: "message-text", text: message }),
        ),
        row,
      );
      w.onClose = () => {
        resolve(buttons.includes("Cancel") ? "Cancel" : buttons.at(-1));
        return true;
      };
      w.el.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          finish(buttons.includes("Cancel") ? "Cancel" : buttons.at(-1));
        }
        if (e.key === "Enter" && !e.target.closest("button"))
          finish(buttons[defaultButton]);
      });
      queueMicrotask(() => row.children[defaultButton]?.focus());
    });
  }
  error(error) {
    console.error(error);
    return this.message(error?.message || String(error), {
      title: "Windows",
      icon: "computer",
    });
  }
  confirm(message, title = "Windows") {
    return this.message(message, { title, buttons: ["Yes", "No"] }).then(
      (v) => v === "Yes",
    );
  }
  prompt(message, value = "", { title = "Windows", label = "" } = {}) {
    return new Promise((resolve) => {
      const w = this.wm.create({
        title,
        width: 390,
        height: 168,
        dialog: true,
        resizable: false,
        minimizable: false,
        maximizable: false,
        appId: "dialog",
      });
      const input = el("input", {
        type: "text",
        value,
        "aria-label": label || message,
      });
      const finish = (v) => {
        w.onClose = null;
        w.close();
        resolve(v);
      };
      w.setContent(
        el(
          "div",
          { class: "dialog-padding" },
          el("p", { text: message }),
          input,
        ),
        el(
          "div",
          { class: "dialog-buttons" },
          button("OK", () => finish(input.value), { class: "default-button" }),
          button("Cancel", () => finish(null)),
        ),
      );
      w.onClose = () => {
        resolve(null);
        return true;
      };
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") finish(input.value);
        if (e.key === "Escape") finish(null);
      });
      queueMicrotask(() => {
        input.focus();
        input.select();
      });
    });
  }
  file({
    mode = "open",
    path = DOCS,
    name = "",
    filter = null,
    title,
    normalizeName = null,
  } = {}) {
    return new Promise((resolve) => {
      const w = this.wm.create({
        title: title || (mode === "save" ? "Save As" : "Open"),
        icon: "folder",
        width: 570,
        height: 380,
        dialog: true,
        minimizable: false,
        maximizable: false,
        appId: "filedialog",
      });
      let folder =
        this.fs.get(path)?.type === "folder"
          ? normalizePath(path)
          : dirname(path);
      const input = el("input", {
          type: "text",
          value: name,
          "aria-label": "File name",
        }),
        address = el("input", { value: folder, "aria-label": "Look in" }),
        listing = el("div", {
          class: "file-dialog-list inset",
          role: "listbox",
        }),
        finish = (value) => {
          w.onClose = null;
          w.close();
          resolve(value);
        };
      const render = () => {
        address.value = folder;
        listing.replaceChildren();
        for (const n of this.fs.list(folder)) {
          if (n.type === "file" && filter && !filter(n)) continue;
          const b = button(
            [icon(fileIcon(n)), n.name],
            () => {
              listing
                .querySelectorAll(".selected")
                .forEach((b) => b.classList.remove("selected"));
              b.classList.add("selected");
              input.value = n.name;
            },
            { class: "file-dialog-item", role: "option" },
          );
          b.addEventListener(
            "dblclick",
            safely(async () => {
              if (n.type === "folder") {
                folder = n.path;
                render();
                input.value = "";
              } else {
                input.value = n.name;
                await submit();
              }
            }),
          );
          listing.append(b);
        }
      };
      const submit = async () => {
        if (!input.value.trim()) return;
        const entered =
          mode === "save" && normalizeName
            ? normalizeName(input.value.trim())
            : input.value.trim();
        const full = /^[A-Z]:/i.test(entered)
          ? normalizePath(entered)
          : joinPath(folder, entered);
        const node = this.fs.get(full);
        if (node?.type === "folder") {
          folder = full;
          input.value = "";
          render();
          return;
        }
        if (mode === "open" && !node) {
          await this.error(
            new Error("File not found. Check the file name and try again."),
          );
          return;
        }
        if (
          mode === "save" &&
          node &&
          !(await this.confirm(
            `${basename(full)} already exists.\nDo you want to replace it?`,
            "Confirm Save As",
          ))
        )
          return;
        finish(full);
      };
      address.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const p = normalizePath(address.value);
          if (this.fs.get(p)?.type === "folder") {
            folder = p;
            render();
          }
        }
      });
      input.addEventListener(
        "keydown",
        safely((e) => {
          if (e.key === "Enter") return submit();
        }),
      );
      w.setContent(
        el(
          "div",
          { class: "file-dialog-top" },
          el("label", { text: "Look in:" }),
          address,
          button(
            "↑",
            () => {
              folder = dirname(folder);
              render();
            },
            { title: "Up One Level", "aria-label": "Up One Level" },
          ),
          button("New Folder", async () => {
            const n = await this.prompt(
              "Name of the new folder:",
              "New Folder",
              { title: "New Folder" },
            );
            if (n) {
              await this.fs.mkdir(joinPath(folder, n));
              render();
            }
          }),
        ),
        listing,
        el(
          "div",
          { class: "file-dialog-bottom" },
          field("File name:", input),
          field(
            "Files of type:",
            el(
              "select",
              {},
              el("option", {
                text: filter ? "Supported files" : "All Files (*.*)",
              }),
            ),
          ),
          el(
            "div",
            { class: "dialog-buttons" },
            button(mode === "save" ? "Save" : "Open", submit, {
              class: "default-button",
            }),
            button("Cancel", () => finish(null)),
          ),
        ),
      );
      w.onClose = () => {
        resolve(null);
        return true;
      };
      render();
      queueMicrotask(() => input.focus());
    });
  }
}
