import {
  el,
  button,
  icon,
  toolbar,
  statusBar,
  separator,
  field,
} from "../ui/index.js";
import { basename, downloadFile } from "../core/index.js";
const normalizeAddress = (input) => {
  let target = String(input || "about:home").trim();
  if (!/^(about:|https?:\/\/|[A-Z]:[\\/])/i.test(target))
    target =
      target.includes(".") && !target.includes(" ")
        ? "https://" + target
        : "https://www.bing.com/search?q=" + encodeURIComponent(target);
  if (/^https?:/i.test(target)) target = new URL(target).href;
  if (
    /^about:/i.test(target) &&
    ![
      "about:home",
      "about:welcome",
      "about:blank",
      "about:favorites",
      "about:history",
    ].includes(target)
  )
    throw new Error("This built-in page does not exist.");
  return target;
};
export function openInternetExplorer(ctx, { url = null, path = null } = {}) {
  const initial = normalizeAddress(path || url || ctx.settings.get("homePage"));
  const w = ctx.wm.create({
    title: "Microsoft Internet Explorer",
    icon: "ie",
    width: 790,
    height: 545,
    appId: "ie",
  });
  let current = initial,
    history = [current],
    index = 0,
    loading = false;
  const address = el("input", { value: current, "aria-label": "Address" }),
    viewport = el("div", { class: "ie-viewport" }),
    status = statusBar("Done", "Internet");
  const external = () => {
    if (/^https?:\/\//i.test(current))
      window.open(current, "_blank", "noopener,noreferrer");
  };
  const navigate = (target, push = true) => {
    target = normalizeAddress(target);
    current = target;
    address.value = current;
    if (push) {
      history = history.slice(0, index + 1);
      history.push(current);
      index++;
    }
    render();
  };
  const favorites = () =>
    ctx.settings.get("favorites") || [
      { title: "Microsoft", url: "https://www.microsoft.com/" },
      { title: "Wikipedia", url: "https://www.wikipedia.org/" },
      { title: "The Internet Archive", url: "https://archive.org/" },
    ];
  const home = () => navigate(ctx.settings.get("homePage") || "about:home");
  function render() {
    viewport.replaceChildren();
    status.children[0].textContent = "Done";
    status.children[1].textContent = current.startsWith("about:")
      ? "My Computer"
      : "Internet";
    if (current === "about:blank") {
      w.setTitle("about:blank - Microsoft Internet Explorer");
      return;
    }
    if (current === "about:home" || current === "about:welcome") {
      w.setTitle("Welcome to the Internet - Microsoft Internet Explorer");
      const search = el("input", {
        "aria-label": "Search the Web",
        placeholder: "Type a word or phrase",
      });
      const page = el(
        "article",
        { class: "ie-home" },
        el(
          "header",
          { class: "ie-home-header" },
          icon("ie", 32),
          el(
            "div",
            {},
            el("h1", { text: "Microsoft Internet Explorer" }),
            el("p", { text: "Your window to the world. " }),
          ),
        ),
        el(
          "nav",
          { class: "ie-home-nav" },
          button("Home", home, { class: "text-link" }),
          button("Favorites", () => navigate("about:favorites"), {
            class: "text-link",
          }),
          button("History", () => navigate("about:history"), {
            class: "text-link",
          }),
          button("Help", () => ctx.launch("help", { topic: "internet" }), {
            class: "text-link",
          }),
        ),
        el(
          "div",
          { class: "ie-home-body" },
          el("h2", { text: "Welcome to the Internet" }),
          el("p", {
            text: "Explore the Web, visit your favorite sites, or find something new. Type a website address in the Address bar and click Go.",
          }),
          el(
            "fieldset",
            { class: "ie-search-box" },
            el("legend", { text: "Search the Web" }),
            el(
              "div",
              { class: "search-line" },
              search,
              button("Search", () => navigate(search.value)),
            ),
          ),
          el("h3", { text: "A few places to start" }),
          el(
            "div",
            { class: "ie-start-links" },
            ...favorites().map((f) =>
              button([icon("ie"), f.title], () => navigate(f.url), {
                class: "text-link",
              }),
            ),
          ),
          el("hr"),
          el("h3", { text: "Make yourself at home" }),
          el("p", {
            text: "Add a page to Favorites to keep it close at hand. Use Back and Forward to revisit pages you have opened.",
          }),
          button("Internet Options...", () =>
            ctx.launch("control", { page: "internet" }),
          ),
          el("p", {
            class: "ie-browser-note",
            text: "Some websites do not allow embedded browsing. Choose Open in Browser from the toolbar to open them in a full browser tab.",
          }),
        ),
      );
      search.addEventListener("keydown", (e) => {
        if (e.key === "Enter") navigate(search.value);
      });
      viewport.append(page);
      return;
    }
    if (current === "about:favorites" || current === "about:history") {
      const list =
        current === "about:favorites"
          ? favorites()
          : history
              .filter((x) => /^https?:/.test(x))
              .map((url) => ({ url, title: url }));
      viewport.append(
        el(
          "div",
          { class: "ie-local-list" },
          el("h2", {
            text: current === "about:favorites" ? "Favorites" : "History",
          }),
          ...list.map((f) =>
            button([icon("ie"), f.title], () => navigate(f.url), {
              class: "text-link",
            }),
          ),
          !list.length ? el("p", { text: "No pages to display." }) : null,
        ),
      );
      return;
    }
    if (/^[A-Z]:/i.test(current)) {
      const text = ctx.fs.readFile(current),
        frame = el("iframe", {
          class: "ie-frame",
          sandbox: "allow-forms",
          title: basename(current),
        });
      frame.srcdoc = text;
      viewport.append(frame);
      w.setTitle(basename(current) + " - Microsoft Internet Explorer");
      return;
    }
    const url = new URL(current);
    if (!["http:", "https:"].includes(url.protocol))
      throw new Error("Only HTTP and HTTPS addresses can be opened.");
    loading = true;
    status.children[0].textContent = "Opening " + url.hostname + "...";
    w.setTitle(url.hostname + " - Microsoft Internet Explorer");
    const frame = el("iframe", {
      class: "ie-frame",
      src: current,
      title: "Web page: " + url.hostname,
      sandbox:
        "allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox",
      referrerpolicy: "no-referrer",
    });
    frame.addEventListener("load", () => {
      loading = false;
      status.children[0].textContent = "Done";
    });
    viewport.append(
      el(
        "div",
        { class: "ie-frame-notice" },
        el("span", {
          text: "If this page cannot be displayed, open it in your browser.",
        }),
        button("Open in Browser", external),
      ),
      frame,
    );
  }
  const back = () => {
      if (index > 0) navigate(history[--index], false);
    },
    forward = () => {
      if (index < history.length - 1) navigate(history[++index], false);
    };
  const tools = toolbar([
    { glyph: "◀", label: "Back", action: back },
    { glyph: "▶", title: "Forward", action: forward },
    {
      glyph: "×",
      label: "Stop",
      action: () => {
        viewport.querySelector("iframe")?.remove();
        status.children[0].textContent = "Stopped";
      },
    },
    { glyph: "↻", label: "Refresh", action: render },
    { icon: "ie", label: "Home", action: home },
    { separator: true },
    {
      icon: "search",
      label: "Search",
      action: async () => {
        const q = await ctx.dialogs.prompt("Search the Web:", "", {
          title: "Search",
        });
        if (q) navigate(q);
      },
    },
    {
      icon: "folder",
      label: "Favorites",
      action: () => navigate("about:favorites"),
    },
    {
      icon: "document",
      label: "History",
      action: () => navigate("about:history"),
    },
    { separator: true },
    { icon: "ie", label: "Open in Browser", action: external },
  ]);
  w.setMenu({
    File: [
      {
        label: "New Window",
        shortcut: "Ctrl+N",
        action: () => ctx.launch("ie", { url: current }),
      },
      {
        label: "Open...",
        shortcut: "Ctrl+O",
        action: async () => {
          const p = await ctx.dialogs.prompt(
            "Type an Internet address:",
            current,
            { title: "Open" },
          );
          if (p) navigate(p);
        },
      },
      {
        label: "Open Local File...",
        action: async () => {
          const p = await ctx.dialogs.file({
            filter: (n) => /\.html?$/i.test(n.name),
          });
          if (p) navigate(p);
        },
      },
      { label: "Open in Browser", action: external },
      separator(),
      {
        label: "Print...",
        action: () => ctx.printText(viewport.innerText, current),
      },
      { label: "Close", action: () => w.close() },
    ],
    Edit: [
      { label: "Copy Address", action: () => ctx.clipboard.setText(current) },
      {
        label: "Select All",
        action: () => {
          const range = document.createRange();
          range.selectNodeContents(viewport);
          window.getSelection().removeAllRanges();
          window.getSelection().addRange(range);
        },
      },
    ],
    View: [
      {
        label: "Go To",
        submenu: [
          { label: "Back", action: back },
          { label: "Forward", action: forward },
          { label: "Home Page", action: home },
        ],
      },
      { label: "Refresh", shortcut: "F5", action: render },
      {
        label: "Source",
        action: () =>
          ctx.launch("notepad", {
            text: current.startsWith("C:")
              ? ctx.fs.readFile(current)
              : viewport.innerHTML,
          }),
      },
    ],
    Favorites: () => [
      {
        label: "Add to Favorites...",
        action: async () => {
          const title = await ctx.dialogs.prompt(
            "Name:",
            w.title.replace(" - Microsoft Internet Explorer", ""),
            { title: "Add Favorite" },
          );
          if (title)
            ctx.settings.set("favorites", [
              ...favorites(),
              { title, url: current },
            ]);
        },
      },
      {
        label: "Organize Favorites...",
        action: () => navigate("about:favorites"),
      },
      separator(),
      ...favorites().map((f) => ({
        label: f.title,
        icon: "ie",
        action: () => navigate(f.url),
      })),
    ],
    Tools: [
      {
        label: "Internet Options...",
        action: () => ctx.launch("control", { page: "internet" }),
      },
    ],
    Help: [
      {
        label: "Contents and Index",
        action: () => ctx.launch("help", { topic: "internet" }),
      },
      {
        label: "About Internet Explorer",
        action: () =>
          ctx.dialogs.message(
            "Microsoft Internet Explorer\nVersion: 5.01 — Browser recreation\n\nUses your browser engine for web pages. ActiveX, VBScript, legacy plugins, and unrestricted cross-origin access are not supported.",
            { title: "About Internet Explorer", icon: "ie" },
          ),
      },
    ],
  });
  w.setContent(
    tools,
    el(
      "div",
      { class: "address-bar" },
      el("span", { text: "Address" }),
      icon("ie"),
      address,
      button("Go", () => navigate(address.value), { class: "tool-button" }),
    ),
    viewport,
    status,
  );
  address.addEventListener("keydown", (e) => {
    if (e.key === "Enter") navigate(address.value);
  });
  w.el.addEventListener("keydown", (e) => {
    if (e.key === "F5") {
      e.preventDefault();
      render();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l") {
      e.preventDefault();
      address.focus();
      address.select();
    }
  });
  if (path) {
    current = path;
    address.value = current;
  }
  render();
  return w;
}
