import {
  el,
  button,
  icon,
  tabs,
  field,
  checkbox,
  statusBar,
} from "../ui/index.js";
import { downloadFile, pickFiles, DOCS } from "../core/index.js";
export const controlItems = [
  {
    id: "accessibility",
    name: "Accessibility Options",
    icon: "keyboard",
    description: "Change keyboard, display, and mouse accessibility settings.",
  },
  {
    id: "hardware",
    name: "Add/Remove Hardware",
    icon: "computer",
    description: "View devices available to this browser.",
  },
  {
    id: "programs",
    name: "Add/Remove Programs",
    icon: "programs",
    description: "View the programs installed on your computer.",
  },
  {
    id: "administrative",
    name: "Administrative Tools",
    icon: "settings",
    description: "Manage your virtual computer.",
  },
  {
    id: "datetime",
    name: "Date/Time",
    icon: "settings",
    description: "Change the clock and date display.",
  },
  {
    id: "display",
    name: "Display",
    icon: "display",
    description: "Change your desktop background, colors, and screen saver.",
  },
  {
    id: "folder",
    name: "Folder Options",
    icon: "folder",
    description: "Change how files and folders are displayed.",
  },
  {
    id: "fonts",
    name: "Fonts",
    icon: "font",
    description: "View and preview available fonts.",
  },
  {
    id: "internet",
    name: "Internet Options",
    icon: "ie",
    description: "Change your home page and browser preferences.",
  },
  {
    id: "keyboard",
    name: "Keyboard",
    icon: "keyboard",
    description: "Change keyboard settings and language.",
  },
  {
    id: "mouse",
    name: "Mouse",
    icon: "settings",
    description: "Change mouse and double-click settings.",
  },
  {
    id: "network",
    name: "Network and Dial-up Connections",
    icon: "network",
    description: "View browser network status.",
  },
  {
    id: "power",
    name: "Power Options",
    icon: "computer",
    description: "Change virtual screen saver and idle settings.",
  },
  {
    id: "printers",
    name: "Printers",
    icon: "document",
    description: "Use browser printing and PDF output.",
  },
  {
    id: "regional",
    name: "Regional Options",
    icon: "settings",
    description: "Change time and number formats.",
  },
  {
    id: "sounds",
    name: "Sounds and Multimedia",
    icon: "speaker",
    description: "Change volume, sounds, and media settings.",
  },
  {
    id: "system",
    name: "System",
    icon: "computer",
    description: "View system information and back up the virtual disk.",
  },
  {
    id: "users",
    name: "Users and Passwords",
    icon: "computer",
    description: "Change the desktop user name.",
  },
];
const schemes = {
  "Windows Standard": {
    desktopColor: "#3a6ea5",
    face: "#d4d0c8",
    active: "#0a246a",
    gradient: "#a6caf0",
    text: "#000000",
  },
  "Windows Classic": {
    desktopColor: "#008080",
    face: "#c0c0c0",
    active: "#000080",
    gradient: "#1084d0",
    text: "#000000",
  },
  Desert: {
    desktopColor: "#a28d68",
    face: "#d5cbb7",
    active: "#79603b",
    gradient: "#c6b28b",
    text: "#000000",
  },
  Lilac: {
    desktopColor: "#786c8f",
    face: "#d2ccd7",
    active: "#45395c",
    gradient: "#bba9d0",
    text: "#000000",
  },
  "High Contrast Black": {
    desktopColor: "#000000",
    face: "#000000",
    active: "#800080",
    gradient: "#800080",
    text: "#ffffff",
  },
};
export function applyTheme(settings) {
  const theme = schemes[settings.get("scheme")] || schemes["Windows Standard"];
  const root = document.documentElement;
  root.style.setProperty("--face", theme.face);
  root.style.setProperty("--active", theme.active);
  root.style.setProperty("--active-gradient", theme.gradient);
  root.style.setProperty("--text", theme.text);
  root.style.setProperty(
    "--ui-font-size",
    (Number(settings.get("fontSize")) || 11) + "px",
  );
  root.classList.toggle(
    "high-contrast",
    settings.get("scheme") === "High Contrast Black" ||
      settings.get("highContrast"),
  );
  document.querySelector("#desktop").style.backgroundColor =
    settings.get("desktopColor");
}
export function openControlPanel(ctx, { page = "system" } = {}) {
  const entry =
      controlItems.find((p) => p.id === page) ||
      controlItems.find((p) => p.id === "system"),
    w = ctx.wm.create({
      title:
        entry.name +
        (page === "display" ||
        page === "system" ||
        page === "mouse" ||
        page === "keyboard"
          ? " Properties"
          : ""),
      icon: entry.icon,
      width: page === "display" ? 430 : 460,
      height: page === "display" ? 470 : 440,
      appId: "control",
      dialog: true,
      resizable: false,
      minimizable: false,
      maximizable: false,
    });
  const draft = { ...ctx.settings.data };
  const changed = new Set();
  const set = (key, value) => {
    draft[key] = value;
    changed.add(key);
  };
  const select = (key, values) =>
    el(
      "select",
      { "aria-label": key, onchange: (e) => set(key, e.target.value) },
      ...values.map((v) => {
        const [value, label] = Array.isArray(v) ? v : [v, v];
        return el("option", {
          value,
          text: label,
          selected: String(draft[key]) === String(value),
        });
      }),
    );
  const range = (key, min, max) =>
    el("input", {
      type: "range",
      min,
      max,
      value: draft[key],
      "aria-label": key,
      oninput: (e) => set(key, Number(e.target.value)),
    });
  const textInput = (key) =>
    el("input", {
      value: draft[key] || "",
      "aria-label": key,
      oninput: (e) => set(key, e.target.value),
    });
  let pages = [];
  let customApply = null;
  if (page === "display") {
    const monitor = () =>
      el(
        "div",
        { class: "display-monitor" },
        el(
          "div",
          { class: "monitor-bezel" },
          el(
            "div",
            {
              class: "monitor-screen",
              style: { background: draft.desktopColor },
            },
            el(
              "div",
              { class: "mini-window" },
              el("div", { class: "mini-title", text: "Active Window" }),
              el("div", {
                class: "mini-menu",
                text: "File   Edit   View   Help",
              }),
              el("div", { class: "mini-content", text: "Window Text" }),
            ),
            el("div", { class: "mini-taskbar", text: "▣ Start" }),
          ),
        ),
        el("div", { class: "monitor-foot" }),
      );
    const color = el("input", {
      type: "color",
      value: draft.desktopColor,
      "aria-label": "Desktop color",
      oninput: (e) => {
        set("desktopColor", e.target.value);
        w.el
          .querySelectorAll(".monitor-screen")
          .forEach((m) => (m.style.background = e.target.value));
      },
    });
    const backgrounds = select("wallpaper", [
      ["none", "(None)"],
      ["pattern", "Pattern"],
      ["waves", "Waves"],
    ]);
    const appearance = select("scheme", Object.keys(schemes));
    appearance.addEventListener("change", () => {
      set("desktopColor", schemes[draft.scheme].desktopColor);
    });
    pages = [
      {
        label: "Background",
        content: el(
          "div",
          {},
          monitor(),
          el("p", {
            text: "Select a background picture or color for your desktop.",
          }),
          field("Wallpaper:", backgrounds),
          field("Color:", color),
        ),
      },
      {
        label: "Screen Saver",
        content: el(
          "div",
          {},
          monitor(),
          field(
            "Screen saver:",
            select("screensaver", [
              ["none", "(None)"],
              ["starfield", "Starfield"],
              ["pipes", "Mystify"],
              ["blank", "Blank Screen"],
            ]),
          ),
          field(
            "Wait (minutes):",
            el("input", {
              type: "number",
              min: 1,
              max: 120,
              value: draft.screenSaverMinutes,
              "aria-label": "Wait minutes",
              oninput: (e) =>
                set("screenSaverMinutes", Math.max(1, +e.target.value)),
            }),
          ),
          button("Preview", () => ctx.previewScreensaver(draft.screensaver)),
        ),
      },
      {
        label: "Appearance",
        content: el(
          "div",
          {},
          monitor(),
          field("Scheme:", appearance),
          field(
            "Font size:",
            select("fontSize", [
              [11, "Normal (11 px)"],
              [12, "Large (12 px)"],
              [14, "Extra Large (14 px)"],
            ]),
          ),
          el("p", {
            text: "Changes apply to windows, menus, and other desktop items.",
          }),
        ),
      },
      {
        label: "Effects",
        content: el(
          "div",
          {},
          checkbox(
            "Use transition effects for menus and tooltips",
            draft.animations,
            (v) => set("animations", v),
          ),
          checkbox(
            "Show window contents while dragging",
            draft.dragFullWindows,
            (v) => set("dragFullWindows", v),
          ),
          checkbox("Use large icons", draft.largeIcons, (v) =>
            set("largeIcons", v),
          ),
          el("p", {
            text: "Display effects are rendered using the active browser graphics backend.",
          }),
        ),
      },
      {
        label: "Settings",
        content: el(
          "div",
          {},
          monitor(),
          field(
            "Display:",
            el("input", {
              value: "Default Monitor on Browser Graphics Adapter",
              readonly: true,
            }),
          ),
          el("p", {
            text: `Screen area: ${innerWidth} by ${innerHeight} pixels`,
          }),
          el("p", { text: "Colors: True Color (32 bit)" }),
          el("p", {
            text:
              "Rendering: " + (ctx.renderer?.surface.backend || "Initializing"),
          }),
          button("Advanced...", () => ctx.launch("systeminfo")),
        ),
      },
    ];
  } else if (page === "system") {
    pages = [
      {
        label: "General",
        content: el(
          "div",
          { class: "system-general" },
          icon("computer", 32),
          el(
            "div",
            {},
            el("h3", { text: "System:" }),
            el("p", {
              text: "Microsoft Windows 2000\nProfessional\nVersion 5.0 · Browser Edition",
            }),
            el("h3", { text: "Registered to:" }),
            el("p", {
              text:
                ctx.settings.get("username") +
                "\n" +
                ctx.settings.get("computerName"),
            }),
            el("h3", { text: "Computer:" }),
            el("p", {
              text: `${navigator.hardwareConcurrency || "Unknown"} logical processors\n${navigator.deviceMemory ? navigator.deviceMemory + " GB reported device memory" : "Browser managed memory"}\n${ctx.renderer?.surface.backend || "Canvas"} graphics`,
            }),
          ),
        ),
      },
      {
        label: "Network Identification",
        content: el(
          "div",
          {},
          el("p", {
            text: "Windows uses the following information to identify your computer on the virtual desktop.",
          }),
          field("Computer name:", textInput("computerName")),
          field("User name:", textInput("username")),
          el("p", { text: "Workgroup: WORKGROUP" }),
        ),
      },
      {
        label: "Hardware",
        content: el(
          "div",
          {},
          el(
            "fieldset",
            {},
            el("legend", { text: "Device Manager" }),
            el("p", {
              text: "The device manager lists browser-accessible hardware and capabilities.",
            }),
            button("Device Manager...", () => ctx.launch("devices")),
          ),
          el(
            "fieldset",
            {},
            el("legend", { text: "Hardware Profiles" }),
            el("p", { text: "Current profile: Browser Computer" }),
          ),
        ),
      },
      {
        label: "Advanced",
        content: el(
          "div",
          {},
          el(
            "fieldset",
            {},
            el("legend", { text: "Performance" }),
            button("System Information...", () => ctx.launch("systeminfo")),
            el("p", {
              text: "Inspect the active graphics backend, filesystem, and environment.",
            }),
          ),
          el(
            "fieldset",
            {},
            el("legend", { text: "Backup and Recovery" }),
            el("p", {
              text: "Your virtual drive is saved in this browser. Export a backup to keep a portable copy.",
            }),
            button("Back Up Virtual Disk...", () =>
              downloadFile(
                "Windows2000-Backup.json",
                JSON.stringify(ctx.fs.snapshot()),
                "application/json",
              ),
            ),
            button("Restore Backup...", async () => {
              const [file] = await pickFiles({ accept: ".json" });
              if (
                file &&
                (await ctx.dialogs.confirm(
                  "Replace the current virtual hard drive with this backup?",
                  "Restore Backup",
                ))
              ) {
                await ctx.fs.importSnapshot(JSON.parse(await file.text()));
                await ctx.dialogs.message(
                  "Your virtual hard drive has been restored.",
                  { title: "Backup" },
                );
              }
            }),
          ),
        ),
      },
    ];
  } else if (page === "datetime") {
    const current = new Date(Date.now() + (draft.clockOffset || 0)),
      date = el("input", {
        type: "date",
        value: current.toISOString().slice(0, 10),
        "aria-label": "Date",
      }),
      time = el("input", {
        type: "time",
        step: 1,
        value: current.toTimeString().slice(0, 8),
        "aria-label": "Time",
      }),
      preview = el("div", {
        class: "date-clock",
        text: current.toLocaleTimeString(),
      });
    customApply = () => {
      const value = new Date(date.value + "T" + time.value);
      if (!Number.isFinite(+value))
        throw new Error("Enter a valid date and time.");
      set("clockOffset", +value - Date.now());
    };
    pages = [
      {
        label: "Date & Time",
        content: el(
          "div",
          {},
          preview,
          field("Date:", date),
          field("Time:", time),
          checkbox("Show seconds in taskbar clock", draft.showSeconds, (v) =>
            set("showSeconds", v),
          ),
          el("p", {
            text: "This changes the virtual desktop clock. Your device clock stays under the control of your operating system.",
          }),
        ),
      },
      {
        label: "Time Zone",
        content: el(
          "div",
          {},
          field(
            "Time format:",
            select("timeFormat", [
              ["12", "12-hour clock"],
              ["24", "24-hour clock"],
            ]),
          ),
          el("p", {
            text:
              "Time zone: " + Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
        ),
      },
    ];
  } else if (page === "mouse") {
    pages = [
      {
        label: "Buttons",
        content: el(
          "div",
          {},
          el(
            "fieldset",
            {},
            el("legend", { text: "Button configuration" }),
            checkbox("Left-handed", !!draft.leftHanded, (v) =>
              set("leftHanded", v),
            ),
          ),
          el(
            "fieldset",
            {},
            el("legend", { text: "Double-click speed" }),
            range("doubleClickSpeed", 180, 900),
            el("p", { text: "Double-click the folder to test your setting." }),
            button(icon("folder", 32), () => {}, {
              ondblclick: (e) => {
                e.currentTarget.replaceChildren(icon("folderOpen", 32));
                setTimeout(
                  () => e.currentTarget?.replaceChildren(icon("folder", 32)),
                  900,
                );
              },
              class: "folder-test",
            }),
          ),
        ),
      },
      {
        label: "Motion",
        content: el(
          "div",
          {},
          field("Pointer speed:", range("mouseSpeed", 1, 10)),
          el("p", {
            text: "Native pointer acceleration is managed by your operating system.",
          }),
        ),
      },
      {
        label: "Wheel",
        content: el(
          "div",
          {},
          field(
            "Scroll lines:",
            el("input", {
              type: "number",
              min: 1,
              max: 20,
              value: draft.scrollLines || 3,
              oninput: (e) => set("scrollLines", +e.target.value),
            }),
          ),
        ),
      },
    ];
  } else if (page === "keyboard") {
    pages = [
      {
        label: "Speed",
        content: el(
          "div",
          {},
          field("Repeat delay:", range("repeatDelay", 100, 1500)),
          field("Repeat rate:", range("repeatRate", 1, 50)),
          el(
            "fieldset",
            {},
            el("legend", {
              text: "Click here and hold down a key to test repeat rate:",
            }),
            el("input", { "aria-label": "Test keyboard repeat" }),
          ),
          button("On-Screen Keyboard...", () => ctx.launch("keyboard")),
        ),
      },
      {
        label: "Input Locales",
        content: el(
          "div",
          {},
          field(
            "Default input locale:",
            select("keyboardLayout", [
              "English (United States)",
              "Polish (Programmers)",
              "German (Germany)",
            ]),
          ),
          el("p", {
            text: "The physical keyboard layout follows your device. This setting labels the virtual keyboard.",
          }),
        ),
      },
    ];
  } else if (page === "sounds") {
    pages = [
      {
        label: "Sounds",
        content: el(
          "div",
          {},
          field(
            "Sound Scheme:",
            select("soundScheme", ["Windows Default", "No Sounds"]),
          ),
          el(
            "fieldset",
            {},
            el("legend", { text: "Sound Events" }),
            ...["startup", "click", "error", "win"].map((kind) =>
              button(
                "▶ " +
                  {
                    startup: "Start Windows",
                    click: "Default Beep",
                    error: "Critical Stop",
                    win: "Program Complete",
                  }[kind],
                () => ctx.sound.play(kind),
              ),
            ),
          ),
          el("p", {
            text: "Original synthesized sounds are used in this browser edition.",
          }),
        ),
      },
      {
        label: "Audio",
        content: el(
          "div",
          {},
          el(
            "fieldset",
            {},
            el("legend", { text: "Sound Playback" }),
            el("p", { text: "Preferred device: Default Audio Device" }),
            field("Volume:", range("volume", 0, 100)),
            checkbox("Mute", draft.muted, (v) => set("muted", v)),
            button("Volume...", () => ctx.launch("volume")),
          ),
          el(
            "fieldset",
            {},
            el("legend", { text: "Sound Recording" }),
            button("Sound Recorder...", () => ctx.launch("recorder")),
          ),
        ),
      },
    ];
  } else if (page === "folder") {
    pages = [
      {
        label: "General",
        content: el(
          "div",
          {},
          el(
            "fieldset",
            {},
            el("legend", { text: "Click items as follows" }),
            el("p", {
              text: "Double-click to open an item (single-click to select)",
            }),
          ),
          el(
            "fieldset",
            {},
            el("legend", { text: "Browse folders" }),
            el("p", {
              text: "Open each folder in the same window. Use File > Open in New Window to open another Explorer.",
            }),
          ),
        ),
      },
      {
        label: "View",
        content: el(
          "div",
          {},
          checkbox(
            "Show hidden files and folders",
            draft.showHiddenFiles,
            (v) => set("showHiddenFiles", v),
          ),
          checkbox("Use large desktop icons", draft.largeIcons, (v) =>
            set("largeIcons", v),
          ),
          el("p", {
            text: "File extensions are always visible to make file types clear.",
          }),
        ),
      },
      {
        label: "File Types",
        content: el(
          "div",
          {},
          el(
            "table",
            { class: "classic-table" },
            el(
              "thead",
              {},
              el(
                "tr",
                {},
                el("th", { text: "Extension" }),
                el("th", { text: "Application" }),
              ),
            ),
            el(
              "tbody",
              {},
              ...[
                ["TXT", "Notepad"],
                ["WDOC", "WordPad"],
                ["PNG, JPG, BMP", "Imaging / Paint"],
                ["MP3, WAV, OGG", "Windows Media Player"],
                ["HTM, HTML", "Internet Explorer"],
                ["REG, JSON", "Notepad"],
              ].map((row) =>
                el("tr", {}, ...row.map((v) => el("td", { text: v }))),
              ),
            ),
          ),
        ),
      },
    ];
  } else if (page === "fonts") {
    const preview = el("div", {
        class: "font-preview",
        text: "The quick brown fox jumps over the lazy dog.\nABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz\n0123456789",
      }),
      fontList = el(
        "select",
        {
          size: 6,
          "aria-label": "Installed fonts",
          onchange: (e) => (preview.style.fontFamily = e.target.value),
        },
        ...[
          "Tahoma",
          "Arial",
          "Times New Roman",
          "Courier New",
          "Verdana",
          "Georgia",
        ].map((n) => el("option", { text: n })),
      );
    pages = [
      {
        label: "Installed Fonts",
        content: el(
          "div",
          {},
          fontList,
          preview,
          el("p", {
            text: "Tahoma-compatible regular and bold fonts are bundled; other fonts use your browser’s installed fonts.",
          }),
        ),
      },
    ];
  } else if (page === "internet") {
    pages = [
      {
        label: "General",
        content: el(
          "div",
          {},
          el(
            "fieldset",
            {},
            el("legend", { text: "Home page" }),
            field("Address:", textInput("homePage")),
            button("Use Default", () => {
              set("homePage", "about:home");
              w.el.querySelector("input").value = "about:home";
            }),
          ),
          button("Open Internet Explorer", () => ctx.launch("ie")),
        ),
      },
      {
        label: "Connections",
        content: el(
          "div",
          {},
          el("p", {
            text: "Connection: " + (navigator.onLine ? "Online" : "Offline"),
          }),
          el("p", {
            text: "Internet connections are provided by your browser. Dial-up modems, proxies, and native network adapters are managed by your operating system.",
          }),
        ),
      },
      {
        label: "Advanced",
        content: el(
          "div",
          {},
          el("p", {
            text: "External websites may block embedded browsing. Use Open in Browser in Internet Explorer when a site cannot be displayed.",
          }),
        ),
      },
    ];
  } else if (page === "network") {
    pages = [
      {
        label: "General",
        content: el(
          "div",
          {},
          icon("network", 32),
          el("h3", { text: "Local Area Connection" }),
          el("p", {
            text:
              "Status: " + (navigator.onLine ? "Connected" : "Disconnected"),
          }),
          el("p", { text: "Device: Browser Network Adapter" }),
          el("p", { text: "Network origin: " + location.origin }),
          el("p", {
            text: "HTTP and HTTPS are available through the browser. Raw TCP, ICMP, SMB file sharing, and dial-up are not exposed to this desktop.",
          }),
          button("Internet Options...", () =>
            ctx.launch("control", { page: "internet" }),
          ),
        ),
      },
    ];
  } else if (page === "accessibility") {
    pages = [
      {
        label: "Keyboard",
        content: el(
          "div",
          {},
          button("On-Screen Keyboard...", () => ctx.launch("keyboard")),
          el("p", {
            text: "Use a mouse or touch screen to enter text in the active application.",
          }),
        ),
      },
      {
        label: "Display",
        content: el(
          "div",
          {},
          checkbox("Use High Contrast", draft.highContrast, (v) =>
            set("highContrast", v),
          ),
          field(
            "Text size:",
            select("fontSize", [
              [11, "Normal"],
              [14, "Large"],
              [16, "Extra Large"],
            ]),
          ),
          button("Magnifier...", () => ctx.launch("magnifier")),
        ),
      },
      {
        label: "General",
        content: el(
          "div",
          {},
          el("p", {
            text: "Keyboard navigation is available in menus and dialogs. Tab moves between controls. Escape closes menus. Browser zoom and screen readers remain available.",
          }),
        ),
      },
    ];
  } else if (page === "programs") {
    pages = [
      {
        label: "Change or Remove Programs",
        content: el(
          "div",
          {},
          el("p", { text: "Currently installed programs:" }),
          el(
            "div",
            { class: "program-list inset" },
            ...ctx.apps
              .filter((a) => !a.hidden)
              .map((a) =>
                button([icon(a.icon), a.name], () => ctx.launch(a.id), {
                  class: "program-row",
                }),
              ),
          ),
          el("p", {
            text: "These programs are included with the browser desktop. Native Windows installers require an emulator.",
          }),
        ),
      },
    ];
  } else if (page === "administrative") {
    pages = [
      {
        label: "Administrative Tools",
        content: el(
          "div",
          { class: "admin-tools" },
          ...[
            ["Task Manager", "taskmgr"],
            ["System Information", "systeminfo"],
            ["Registry Editor", "regedit"],
            ["Device Manager", "devices"],
            ["Event Viewer", "events"],
            ["Scheduled Tasks", "tasks"],
            ["Disk Management", "diskmanager"],
          ].map(([label, id]) =>
            button([icon("settings", 32), label], () => ctx.launch(id)),
          ),
        ),
      },
    ];
  } else if (page === "hardware") {
    pages = [
      {
        label: "Hardware",
        content: el(
          "div",
          {},
          icon("computer", 32),
          el("h3", { text: "Add/Remove Hardware Wizard" }),
          el("p", {
            text: "The browser grants access to hardware through secure device permissions.",
          }),
          button("View Available Devices", () => ctx.launch("devices")),
          button("Check Microphone", () => ctx.launch("recorder")),
          el("p", {
            text: "Windows device drivers (.sys) cannot be installed in the browser. The Device Manager describes the devices exposed by browser APIs.",
          }),
        ),
      },
    ];
  } else if (page === "power") {
    pages = [
      {
        label: "Power Schemes",
        content: el(
          "div",
          {},
          field(
            "Power scheme:",
            select("powerScheme", [
              "Home/Office Desk",
              "Portable/Laptop",
              "Always On",
            ]),
          ),
          field(
            "Screen saver after (minutes):",
            el("input", {
              type: "number",
              min: 1,
              value: draft.screenSaverMinutes,
              oninput: (e) =>
                set("screenSaverMinutes", Math.max(1, +e.target.value)),
            }),
          ),
          el("p", {
            text: "The browser suspends rendering when windows are minimized or the page is hidden. System sleep is controlled by your device.",
          }),
        ),
      },
    ];
  } else if (page === "printers") {
    pages = [
      {
        label: "Printers",
        content: el(
          "div",
          {},
          icon("document", 32),
          el("h3", { text: "Browser Printer" }),
          el("p", {
            text: "Print documents through your device’s print dialog, or choose Save as PDF.",
          }),
          button("Print Test Page", () =>
            ctx.printText(
              "Windows 2000 Printer Test Page\n\nBrowser Printer\n" +
                new Date().toLocaleString(),
              "Printer Test Page",
            ),
          ),
          el("p", {
            text: "Use File > Print in Notepad, WordPad, Paint, and Internet Explorer.",
          }),
        ),
      },
    ];
  } else if (page === "regional") {
    pages = [
      {
        label: "General",
        content: el(
          "div",
          {},
          field(
            "Your locale:",
            select("locale", ["en-US", "en-GB", "pl-PL", "de-DE", "fr-FR"]),
          ),
          el("p", {
            text:
              "Number sample: " +
              new Intl.NumberFormat(draft.locale || navigator.language).format(
                1234567.89,
              ),
          }),
        ),
      },
      {
        label: "Time",
        content: el(
          "div",
          {},
          field(
            "Time format:",
            select("timeFormat", [
              ["12", "h:mm tt"],
              ["24", "HH:mm"],
            ]),
          ),
          checkbox("Show seconds", draft.showSeconds, (v) =>
            set("showSeconds", v),
          ),
        ),
      },
    ];
  } else if (page === "users") {
    pages = [
      {
        label: "Users",
        content: el(
          "div",
          {},
          el("p", { text: "User for this computer:" }),
          field("User name:", textInput("username")),
          field("Computer name:", textInput("computerName")),
          el("p", {
            text: "This virtual desktop uses one local profile. Access to the hosted site is controlled by your site account. The virtual lock screen does not replace account authentication.",
          }),
          button("Lock Computer", () => ctx.lock()),
        ),
      },
    ];
  }
  const apply = () => {
    customApply?.();
    ctx.settings.patch(
      Object.fromEntries([...changed].map((key) => [key, draft[key]])),
    );
    changed.clear();
    applyTheme(ctx.settings);
  };
  w.setContent(
    tabs(
      pages.length
        ? pages
        : [
            {
              label: "General",
              content: el("div", { text: entry.description }),
            },
          ],
    ),
    el(
      "div",
      { class: "dialog-buttons" },
      button(
        "OK",
        () => {
          apply();
          w.close();
        },
        { class: "default-button" },
      ),
      button("Cancel", () => w.close()),
      button("Apply", apply),
    ),
  );
  return w;
}
