import {
  el,
  button,
  icon,
  tabs,
  field,
  checkbox,
  toolbar,
  statusBar,
  popup,
  separator,
  safely,
} from "../ui/index.js";
import {
  DOCS,
  basename,
  dirname,
  formatBytes,
  downloadFile,
  pickFiles,
} from "../core/index.js";

export function openTaskManager(ctx) {
  const w = ctx.wm.create({
    title: "Windows Task Manager",
    icon: "taskmgr",
    width: 500,
    height: 400,
    appId: "taskmgr",
  });
  let selected = null,
    currentTab = 0;
  const appsBody = el("tbody"),
    processBody = el("tbody"),
    status = statusBar("", ""),
    chart = el("canvas", {
      width: 420,
      height: 140,
      class: "performance-chart",
      "aria-label": "Event loop delay history",
    }),
    metrics = el("div", { class: "task-metrics" });
  const samples = Array(80).fill(0);
  let expected = performance.now() + 1000;
  const end = async () => {
    const target = ctx.wm.windows.find((a) => a.id === selected);
    if (target) await target.close();
  };
  const render = () => {
    appsBody.replaceChildren();
    processBody.replaceChildren();
    for (const win of ctx.wm.windows.filter((a) => !a.dialog)) {
      const row = el(
        "tr",
        {
          class: win.id === selected ? "selected" : "",
          onclick: () => {
            selected = win.id;
            render();
          },
          ondblclick: () => win.focus(),
        },
        el("td", {}, icon(win.icon), win.title),
        el("td", { text: win.minimized ? "Minimized" : "Running" }),
      );
      appsBody.append(row);
      processBody.append(
        el(
          "tr",
          {
            class: win.id === selected ? "selected" : "",
            onclick: () => {
              selected = win.id;
              render();
            },
          },
          el("td", { text: win.appId + ".exe" }),
          el("td", { text: String(win.id) }),
          el("td", { text: ctx.settings.get("username") }),
          el("td", { text: win.minimized ? "Suspended UI" : "Running" }),
        ),
      );
    }
    status.children[0].textContent =
      "Processes: " + ctx.wm.windows.filter((a) => !a.dialog).length;
    status.children[1].textContent =
      "Browser memory: " +
      (performance.memory
        ? formatBytes(performance.memory.usedJSHeapSize)
        : "Unavailable");
  };
  const applicationTable = el(
      "table",
      { class: "classic-table task-table" },
      el(
        "thead",
        {},
        el("tr", {}, el("th", { text: "Task" }), el("th", { text: "Status" })),
      ),
      appsBody,
    ),
    processTable = el(
      "table",
      { class: "classic-table task-table" },
      el(
        "thead",
        {},
        el(
          "tr",
          {},
          ...["Image Name", "PID", "User Name", "Status"].map((x) =>
            el("th", { text: x }),
          ),
        ),
      ),
      processBody,
    );
  const tabview = tabs([
    {
      label: "Applications",
      content: el(
        "div",
        { class: "task-tab" },
        el("div", { class: "inset table-scroll" }, applicationTable),
        el(
          "div",
          { class: "task-buttons" },
          button("End Task", end),
          button("Switch To", () =>
            ctx.wm.windows.find((a) => a.id === selected)?.focus(),
          ),
          button("New Task...", () => ctx.launch("run")),
        ),
      ),
    },
    {
      label: "Processes",
      content: el(
        "div",
        { class: "task-tab" },
        el("div", { class: "inset table-scroll" }, processTable),
        el("div", { class: "task-buttons" }, button("End Process", end)),
      ),
    },
    {
      label: "Performance",
      content: el(
        "div",
        {},
        el(
          "fieldset",
          {},
          el("legend", { text: "Event Loop Delay History" }),
          chart,
        ),
        metrics,
        el("p", {
          class: "small-note",
          text: "The graph shows measured browser scheduling delay. Native CPU and per-process memory counters are not available to a web page.",
        }),
      ),
    },
  ]);
  w.setMenu({
    File: [
      { label: "New Task (Run...)", action: () => ctx.launch("run") },
      { label: "Exit Task Manager", action: () => w.close() },
    ],
    Options: [
      { label: "Always On Top", checked: true, action: () => w.focus() },
      { label: "Minimize On Use", action: () => w.minimize() },
    ],
    View: [{ label: "Refresh Now", action: render }],
    Help: [
      {
        label: "Task Manager Help",
        action: () => ctx.launch("help", { topic: "system" }),
      },
    ],
  });
  w.setContent(tabview, status);
  w.addCleanup(ctx.bus.on("windows:change", render));
  const timer = setInterval(() => {
    const now = performance.now(),
      delay = Math.max(0, now - expected);
    expected = now + 1000;
    samples.shift();
    samples.push(Math.min(250, delay));
    const c = chart.getContext("2d");
    c.fillStyle = "#000";
    c.fillRect(0, 0, 420, 140);
    c.strokeStyle = "#003600";
    c.lineWidth = 1;
    for (let x = 0; x < 420; x += 20) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, 140);
      c.stroke();
    }
    for (let y = 0; y < 140; y += 20) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(420, y);
      c.stroke();
    }
    c.strokeStyle = "#00ff00";
    c.beginPath();
    samples.forEach((v, i) => {
      const x = (i * 420) / 79,
        y = 135 - v * 0.5;
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    });
    c.stroke();
    metrics.replaceChildren(
      el("div", { text: "Scheduling delay: " + delay.toFixed(1) + " ms" }),
      el("div", {
        text:
          "JS heap: " +
          (performance.memory
            ? formatBytes(performance.memory.usedJSHeapSize)
            : "Unavailable"),
      }),
      el("div", { text: "Graphics: " + ctx.renderer.surface.backend }),
      el("div", { text: "Virtual files: " + ctx.fs.nodes.size }),
    );
    render();
  }, 1000);
  w.addCleanup(() => clearInterval(timer));
  render();
  return w;
}

export function openRegistry(ctx) {
  const w = ctx.wm.create({
    title: "Registry Editor",
    icon: "registry",
    width: 690,
    height: 470,
    appId: "regedit",
  });
  let data = ctx.registry.read(),
    current = ["HKEY_CURRENT_USER"],
    selected = null;
  const tree = el("div", { class: "registry-tree inset" }),
    body = el("tbody"),
    status = statusBar("My Computer\\HKEY_CURRENT_USER");
  const get = () => current.reduce((a, k) => a?.[k], data) || {},
    save = async () => {
      await ctx.registry.save(data);
      render();
    };
  const selectPath = (path) => {
    current = path;
    selected = null;
    renderValues();
  };
  function renderTree() {
    tree.replaceChildren(
      button([icon("computer"), "My Computer"], () => selectPath([]), {
        class: "tree-item",
      }),
    );
    const visit = (node, path, depth) => {
      for (const [key, value] of Object.entries(node)) {
        if (typeof value === "object" && value !== null) {
          const newPath = [...path, key];
          tree.append(
            button(
              [
                el("span", { text: "⊟", class: "tree-expand" }),
                icon("folder"),
                key,
              ],
              () => selectPath(newPath),
              { class: "tree-item", style: { paddingLeft: depth * 14 + "px" } },
            ),
          );
          if (depth < 6) visit(value, newPath, depth + 1);
        }
      }
    };
    visit(data, [], 1);
  }
  function renderValues() {
    const node = get();
    body.replaceChildren();
    const entries = Object.entries(node).filter(
      ([, v]) => typeof v !== "object",
    );
    if (!entries.some(([k]) => k === "(Default)"))
      entries.unshift(["(Default)", "(value not set)"]);
    for (const [key, value] of entries) {
      const row = el(
        "tr",
        {
          class: selected === key ? "selected" : "",
          onclick: () => {
            selected = key;
            renderValues();
          },
          ondblclick: () => edit(key),
        },
        el("td", {}, icon("document"), key),
        el("td", { text: typeof value === "number" ? "REG_DWORD" : "REG_SZ" }),
        el("td", { text: String(value) }),
      );
      row.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        selected = key;
        popup(
          [
            { label: "Modify", action: () => edit(key) },
            { label: "Delete", action: remove },
          ],
          e.clientX,
          e.clientY,
        );
      });
      body.append(row);
    }
    status.children[0].textContent =
      "My Computer" + (current.length ? "\\" + current.join("\\") : "");
  }
  function render() {
    renderTree();
    renderValues();
  }
  const edit = async (key = selected) => {
    if (!key) return;
    const node = get(),
      value = await ctx.dialogs.prompt("Value data:", node[key] ?? "", {
        title: "Edit String",
      });
    if (value != null) {
      node[key] = typeof node[key] === "number" ? Number(value) || 0 : value;
      await save();
    }
  };
  const remove = async () => {
    if (
      selected &&
      (await ctx.dialogs.confirm(
        "Are you sure you want to delete this value?",
        "Confirm Value Delete",
      ))
    ) {
      delete get()[selected];
      await save();
    }
  };
  const newValue = async (type) => {
    const name = await ctx.dialogs.prompt("Value name:", "New Value #1", {
      title: "New Registry Value",
    });
    if (name) {
      get()[name] = type === "number" ? 0 : "";
      await save();
    }
  };
  const newKey = async () => {
    const name = await ctx.dialogs.prompt("Key name:", "New Key #1", {
      title: "New Key",
    });
    if (name) {
      if (
        name === "__proto__" ||
        name === "constructor" ||
        name === "prototype"
      )
        throw new Error("This key name is reserved.");
      get()[name] = {};
      current.push(name);
      await save();
    }
  };
  w.setMenu({
    Registry: [
      {
        label: "Import Registry File...",
        action: async () => {
          const p = await ctx.dialogs.file({
            filter: (n) => /\.(json|reg)$/i.test(n.name),
          });
          if (!p) return;
          const raw = ctx.fs.readFile(p);
          let imported;
          try {
            imported = JSON.parse(raw);
          } catch {
            throw new Error(
              "This editor imports registry JSON files. Use Export Registry File to create a compatible file.",
            );
          }
          if (
            !imported ||
            typeof imported !== "object" ||
            Array.isArray(imported)
          )
            throw new Error("Invalid registry file.");
          if (
            await ctx.dialogs.confirm(
              "Replace the virtual registry with this file?",
              "Registry Editor",
            )
          ) {
            data = imported;
            await save();
          }
        },
      },
      {
        label: "Export Registry File...",
        action: () =>
          downloadFile(
            "Registry.json",
            JSON.stringify(data, null, 2),
            "application/json",
          ),
      },
      separator(),
      { label: "Exit", action: () => w.close() },
    ],
    Edit: () => [
      {
        label: "New",
        submenu: [
          { label: "Key", action: newKey },
          { label: "String Value", action: () => newValue("string") },
          { label: "DWORD Value", action: () => newValue("number") },
        ],
      },
      { label: "Modify", disabled: !selected, action: () => edit() },
      { label: "Delete", disabled: !selected, action: remove },
      {
        label: "Find...",
        action: async () => {
          const q = await ctx.dialogs.prompt("Find what:", "", {
            title: "Find",
          });
          if (!q) return;
          const search = (node, path = []) => {
            for (const [k, v] of Object.entries(node)) {
              if (k.toLowerCase().includes(q.toLowerCase()))
                return typeof v === "object" ? [...path, k] : path;
              if (v && typeof v === "object") {
                const r = search(v, [...path, k]);
                if (r) return r;
              }
            }
          };
          const found = search(data);
          if (found) selectPath(found);
          else
            ctx.dialogs.message("Finished searching through the registry.", {
              title: "Registry Editor",
            });
        },
      },
    ],
    View: [
      {
        label: "Refresh",
        action: () => {
          data = ctx.registry.read();
          render();
        },
      },
    ],
    Help: [
      {
        label: "Help Topics",
        action: () =>
          ctx.dialogs.message(
            "Edit keys and values in the virtual registry. Changes are saved to C:\\WINNT\\system32\\config\\registry.json.\n\nThis registry belongs to the browser desktop. It does not modify your device’s operating system.",
            { title: "Registry Editor Help", icon: "registry" },
          ),
      },
    ],
  });
  w.setContent(
    el(
      "div",
      { class: "registry-main" },
      tree,
      el(
        "div",
        { class: "registry-values inset" },
        el(
          "table",
          { class: "classic-table" },
          el(
            "thead",
            {},
            el(
              "tr",
              {},
              ...["Name", "Type", "Data"].map((x) => el("th", { text: x })),
            ),
          ),
          body,
        ),
      ),
    ),
    status,
  );
  render();
  return w;
}

export function openSystemInfo(ctx, { devices = false } = {}) {
  const w = ctx.wm.create({
      title: devices ? "Device Manager" : "System Information",
      icon: "computer",
      width: 690,
      height: 440,
      appId: devices ? "devices" : "systeminfo",
    }),
    list = el("tbody"),
    tree = el("div", { class: "systeminfo-tree inset" });
  const sections = {
    "System Summary": [
      ["OS Name", "Windows 2000 Professional — Browser Edition"],
      ["Version", "5.0.2195 (recreated shell)"],
      ["System Name", ctx.settings.get("computerName")],
      ["User Name", ctx.settings.get("username")],
      [
        "Processor",
        `${navigator.hardwareConcurrency || "Unknown"} logical cores`,
      ],
      [
        "Device Memory",
        navigator.deviceMemory
          ? navigator.deviceMemory + " GB (approximate)"
          : "Not exposed",
      ],
      ["Platform", navigator.platform],
      ["Browser", navigator.userAgent],
      [
        "Display",
        `${innerWidth} × ${innerHeight} CSS pixels @ ${devicePixelRatio}×`,
      ],
      ["Language", navigator.language],
      ["Time Zone", Intl.DateTimeFormat().resolvedOptions().timeZone],
    ],
    Display: [
      ["Graphics Backend", ctx.renderer.surface.backend],
      ["WebGPU", navigator.gpu ? "API available" : "Unavailable"],
      ["Color Depth", screen.colorDepth + " bits"],
      ["Pixel Ratio", String(devicePixelRatio)],
      [
        "Canvas Dimensions",
        ctx.renderer.surface.canvas.width +
          " × " +
          ctx.renderer.surface.canvas.height,
      ],
      [
        "Average submission",
        ctx.renderer.surface.stats().averageSubmitMs.toFixed(3) +
          " ms (CPU time)",
      ],
    ],
    Storage: [
      ["Virtual filesystem", "IndexedDB transactional volume"],
      ["Entries", String(ctx.fs.nodes.size)],
      [
        "Virtual data size",
        formatBytes(
          new TextEncoder().encode(JSON.stringify(ctx.fs.snapshot())).length,
        ),
      ],
      ["C:", "Writable virtual disk"],
      ["D:", "Read-only virtual CD-ROM"],
      ["Persistence", "This browser / this site origin"],
    ],
    Network: [
      ["Connection", navigator.onLine ? "Online" : "Offline"],
      ["Origin", location.origin],
      ["Secure Context", String(isSecureContext)],
      [
        "Service Worker",
        "serviceWorker" in navigator ? "Supported" : "Unsupported",
      ],
    ],
    Devices: [
      ["Display Adapter", ctx.renderer.surface.backend + " graphics adapter"],
      ["Keyboard", "Browser keyboard input"],
      ["Mouse", "Pointer Events"],
      ["Sound", "AudioContext" in window ? "Web Audio" : "Unavailable"],
      [
        "Microphone",
        navigator.mediaDevices ? "Available on request" : "Unavailable",
      ],
      [
        "Game Controllers",
        "getGamepads" in navigator ? "Gamepad API" : "Unavailable",
      ],
      [
        "Serial Ports",
        "serial" in navigator ? "Available on request" : "Unavailable",
      ],
      [
        "USB Devices",
        "usb" in navigator ? "Available on request" : "Unavailable",
      ],
    ],
  };
  const show = (section) => {
    list.replaceChildren(
      ...sections[section].map(([k, v]) =>
        el("tr", {}, el("td", { text: k }), el("td", { text: v })),
      ),
    );
  };
  for (const label of Object.keys(sections))
    tree.append(
      button([icon("computer"), label], () => show(label), {
        class: "tree-item",
      }),
    );
  w.setMenu({
    File: [
      {
        label: "Export...",
        action: () =>
          downloadFile(
            "System-Information.txt",
            Object.entries(sections)
              .map(
                ([title, rows]) =>
                  title + "\n" + rows.map(([k, v]) => k + ": " + v).join("\n"),
              )
              .join("\n\n"),
          ),
      },
      { label: "Exit", action: () => w.close() },
    ],
    View: [{ label: "Refresh", action: () => show("System Summary") }],
    Help: [
      {
        label: "About System Information",
        action: () =>
          ctx.dialogs.message(
            "This utility reports real browser capabilities and the state of the virtual desktop. Native kernel and device-driver information is outside the browser sandbox.",
            { title: "System Information", icon: "computer" },
          ),
      },
    ],
  });
  w.setContent(
    el(
      "div",
      { class: "systeminfo-main" },
      tree,
      el(
        "div",
        { class: "inset systeminfo-values" },
        el(
          "table",
          { class: "classic-table" },
          el(
            "thead",
            {},
            el(
              "tr",
              {},
              el("th", { text: "Item" }),
              el("th", { text: "Value" }),
            ),
          ),
          list,
        ),
      ),
    ),
    statusBar(devices ? "Browser devices" : "System Summary"),
  );
  show(devices ? "Devices" : "System Summary");
  return w;
}

export function openEventViewer(ctx) {
  const w = ctx.wm.create({
      title: "Event Viewer",
      icon: "settings",
      width: 700,
      height: 430,
      appId: "events",
    }),
    body = el("tbody");
  const render = () => {
    body.replaceChildren(
      ...ctx.events
        .slice()
        .reverse()
        .map((event) =>
          el(
            "tr",
            {
              ondblclick: () =>
                ctx.dialogs.message(event.message, {
                  title: "Event Properties",
                  icon: "computer",
                }),
            },
            el(
              "td",
              {},
              icon(event.level === "Error" ? "computer" : "help"),
              event.level,
            ),
            el("td", { text: new Date(event.time).toLocaleString() }),
            el("td", { text: event.source }),
            el("td", { text: event.message }),
          ),
        ),
    );
  };
  w.setMenu({
    Action: [
      { label: "Refresh", action: render },
      {
        label: "Clear all Events",
        action: () => {
          ctx.events.length = 0;
          render();
        },
      },
      {
        label: "Save Log File As...",
        action: () =>
          downloadFile(
            "Application-Events.json",
            JSON.stringify(ctx.events, null, 2),
            "application/json",
          ),
      },
    ],
    Help: [
      {
        label: "About Event Viewer",
        action: () =>
          ctx.dialogs.message(
            "Live events from the current browser desktop session.",
            { title: "Event Viewer" },
          ),
      },
    ],
  });
  w.setContent(
    el(
      "div",
      { class: "inset fill-scroll" },
      el(
        "table",
        { class: "classic-table" },
        el(
          "thead",
          {},
          el(
            "tr",
            {},
            ...["Type", "Date and Time", "Source", "Description"].map((s) =>
              el("th", { text: s }),
            ),
          ),
        ),
        body,
      ),
    ),
    statusBar("Application log"),
  );
  w.addCleanup(ctx.bus.on("event:added", render));
  render();
  return w;
}

export function openTasks(ctx) {
  const w = ctx.wm.create({
      title: "Scheduled Tasks",
      icon: "settings",
      width: 640,
      height: 410,
      appId: "tasks",
    }),
    body = el("tbody");
  let selected = null;
  const read = () => ctx.settings.get("scheduledTasks") || [],
    write = (tasks) => ctx.settings.set("scheduledTasks", tasks);
  const render = () => {
    body.replaceChildren(
      ...read().map((t) =>
        el(
          "tr",
          {
            class: selected === t.id ? "selected" : "",
            onclick: () => {
              selected = t.id;
              render();
            },
          },
          el("td", {}, icon("programs"), t.name),
          el("td", {
            text: ctx.apps.find((a) => a.id === t.app)?.name || t.app,
          }),
          el("td", { text: new Date(t.next).toLocaleString() }),
          el("td", { text: t.enabled ? "Scheduled" : "Disabled" }),
        ),
      ),
    );
  };
  const create = () => {
    const d = ctx.wm.create({
        title: "Scheduled Task Wizard",
        width: 400,
        height: 270,
        dialog: true,
        resizable: false,
        minimizable: false,
        maximizable: false,
        appId: "taskwizard",
      }),
      name = el("input", { value: "New Task", "aria-label": "Task name" }),
      app = el(
        "select",
        { "aria-label": "Program" },
        ...ctx.apps
          .filter((a) => !a.hidden)
          .map((a) => el("option", { value: a.id, text: a.name })),
      ),
      delay = el("input", {
        type: "number",
        min: 1,
        max: 10080,
        value: 5,
        "aria-label": "Minutes from now",
      }),
      repeat = el("input", { type: "checkbox", "aria-label": "Repeat" });
    d.setContent(
      el(
        "div",
        { class: "dialog-padding" },
        field("Task name:", name),
        field("Program:", app),
        field("Start in (minutes):", delay),
        el(
          "label",
          { class: "check-field" },
          repeat,
          "Repeat at this interval",
        ),
        el("p", { text: "Scheduled programs run while this desktop is open." }),
      ),
      el(
        "div",
        { class: "dialog-buttons" },
        button("Finish", () => {
          const minutes = Math.max(1, Math.min(10080, +delay.value || 5));
          write([
            ...read(),
            {
              id: crypto.randomUUID(),
              name: name.value || "New Task",
              app: app.value,
              next: Date.now() + minutes * 60000,
              interval: repeat.checked ? minutes * 60000 : 0,
              enabled: true,
            },
          ]);
          d.close();
          render();
        }),
        button("Cancel", () => d.close()),
      ),
    );
  };
  w.setMenu({
    File: [
      { label: "New Scheduled Task...", action: create },
      {
        label: "Delete",
        action: () => {
          write(read().filter((t) => t.id !== selected));
          render();
        },
      },
      { label: "Close", action: () => w.close() },
    ],
    Advanced: [
      {
        label: "Run Selected Task",
        action: () => {
          const t = read().find((t) => t.id === selected);
          if (t) ctx.launch(t.app);
        },
      },
      {
        label: "Pause / Resume Task",
        action: () => {
          write(
            read().map((t) =>
              t.id === selected ? { ...t, enabled: !t.enabled } : t,
            ),
          );
          render();
        },
      },
    ],
    Help: [
      {
        label: "Help Topics",
        action: () =>
          ctx.dialogs.message(
            "Scheduled Tasks starts a program after a delay and can repeat it.\n\nThe virtual desktop must remain open. Browser suspension can delay scheduled programs.",
            { title: "Scheduled Tasks Help" },
          ),
      },
    ],
  });
  w.setContent(
    toolbar([
      { icon: "settings", label: "Add Scheduled Task", action: create },
    ]),
    el(
      "div",
      { class: "inset fill-scroll" },
      el(
        "table",
        { class: "classic-table" },
        el(
          "thead",
          {},
          el(
            "tr",
            {},
            ...["Name", "Program", "Next Run Time", "Status"].map((x) =>
              el("th", { text: x }),
            ),
          ),
        ),
        body,
      ),
    ),
    statusBar("Tasks run while the desktop is open."),
  );
  w.addCleanup(ctx.bus.on("settings:change", render));
  render();
  return w;
}

export function openCharacterMap(ctx) {
  const w = ctx.wm.create({
    title: "Character Map",
    icon: "font",
    width: 430,
    height: 365,
    appId: "charmap",
    resizable: false,
    maximizable: false,
  });
  let selected = "A";
  const grid = el("div", { class: "character-grid inset" }),
    copyInput = el("input", { "aria-label": "Characters to copy" }),
    info = el("div", {
      class: "char-info",
      text: "U+0041: Latin Capital Letter A",
    }),
    font = el(
      "select",
      {
        "aria-label": "Font",
        onchange: (e) => (grid.style.fontFamily = e.target.value),
      },
      ...["Tahoma", "Arial", "Times New Roman", "Courier New", "Georgia"].map(
        (f) => el("option", { text: f }),
      ),
    );
  for (let code = 32; code < 256; code++) {
    if (code >= 127 && code < 160) continue;
    const char = String.fromCharCode(code);
    const b = button(
      char,
      () => {
        selected = char;
        grid.querySelector(".selected")?.classList.remove("selected");
        b.classList.add("selected");
        info.textContent =
          "U+" + code.toString(16).padStart(4, "0").toUpperCase() + ": " + char;
      },
      { title: "U+" + code.toString(16).padStart(4, "0") },
    );
    b.addEventListener("dblclick", () => (copyInput.value += char));
    grid.append(b);
  }
  w.setContent(
    el(
      "div",
      { class: "dialog-padding charmap" },
      field("Font:", font),
      grid,
      field("Characters to copy:", copyInput),
      el(
        "div",
        { class: "dialog-buttons" },
        button("Select", () => (copyInput.value += selected)),
        button("Copy", () => ctx.clipboard.setText(copyInput.value)),
      ),
      info,
    ),
  );
  return w;
}

export function openClipboardViewer(ctx) {
  const w = ctx.wm.create({
      title: "ClipBook Viewer",
      icon: "document",
      width: 520,
      height: 360,
      appId: "clipboard",
    }),
    content = el("pre", { class: "clipboard-content" });
  const render = () =>
    (content.textContent = ctx.clipboard.files.length
      ? ctx.clipboard.mode.toUpperCase() + "\n" + ctx.clipboard.files.join("\n")
      : ctx.clipboard.text || "(The clipboard is empty.)");
  w.setMenu({
    File: [
      {
        label: "Save As...",
        action: () => downloadFile("Clipboard.txt", ctx.clipboard.text),
      },
      { label: "Exit", action: () => w.close() },
    ],
    Edit: [
      { label: "Delete", action: () => ctx.clipboard.setText("") },
      { label: "Refresh", action: render },
    ],
    Help: [
      {
        label: "About ClipBook Viewer",
        action: () =>
          ctx.dialogs.message(
            "Displays the shared clipboard used by this desktop.",
            { title: "ClipBook Viewer" },
          ),
      },
    ],
  });
  w.setContent(content);
  w.addCleanup(ctx.bus.on("clipboard:change", render));
  render();
  return w;
}

export function openKeyboard(ctx) {
  const w = ctx.wm.create({
    title: "On-Screen Keyboard",
    icon: "keyboard",
    width: 650,
    height: 215,
    appId: "keyboard",
    resizable: false,
    maximizable: false,
  });
  let caps = false,
    shift = false;
  const root = el("div", { class: "onscreen-keyboard" });
  const rows = [
    [
      "Esc",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "0",
      "-",
      "=",
      "Backspace",
    ],
    ["Tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
    ["Caps", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "Enter"],
    ["Shift", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "Shift"],
    ["Ctrl", "Alt", "Space", "Alt", "Ctrl"],
  ];
  const type = (key) => {
    if (key === "Caps") {
      caps = !caps;
      render();
      return;
    }
    if (key === "Shift") {
      shift = !shift;
      render();
      return;
    }
    if (["Ctrl", "Alt", "Esc", "Tab"].includes(key)) {
      if (key === "Esc")
        ctx.wm.active?.el.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
      return;
    }
    const target = ctx.lastTextTarget;
    if (!target || !target.isConnected) return;
    const value =
      key === "Space"
        ? " "
        : key === "Enter"
          ? "\n"
          : caps !== shift
            ? key.toUpperCase()
            : key;
    if (
      target.matches("input,textarea") &&
      typeof target.selectionStart === "number"
    ) {
      const s = target.selectionStart,
        e = target.selectionEnd;
      target.setRangeText(
        key === "Backspace" ? "" : value,
        key === "Backspace" && s === e ? Math.max(0, s - 1) : s,
        e,
        "end",
      );
      target.dispatchEvent(new Event("input", { bubbles: true }));
    } else if (target.isContentEditable) {
      target.focus();
      document.execCommand(
        key === "Backspace" ? "delete" : "insertText",
        false,
        key === "Backspace" ? null : value,
      );
      target.dispatchEvent(new Event("input", { bubbles: true }));
    }
    shift = false;
    render();
  };
  function render() {
    root.replaceChildren(
      ...rows.map((row) =>
        el(
          "div",
          { class: "keyboard-row" },
          ...row.map((k) =>
            button(
              caps !== shift && k.length === 1 ? k.toUpperCase() : k,
              () => type(k),
              {
                class:
                  "keyboard-key" +
                  (k === "Space" ? " space-key" : "") +
                  (["Caps", "Shift"].includes(k) &&
                  ((k === "Caps" && caps) || (k === "Shift" && shift))
                    ? " pressed"
                    : ""),
                onpointerdown: (e) => e.preventDefault(),
              },
            ),
          ),
        ),
      ),
    );
  }
  w.setContent(root);
  render();
  return w;
}

export function openMagnifier(ctx) {
  const w = ctx.wm.create({
    title: "Magnifier Settings",
    icon: "display",
    width: 370,
    height: 220,
    appId: "magnifier",
    resizable: false,
    maximizable: false,
  });
  let level = 1;
  const update = (value) => {
    level = value;
    document.querySelector("#windows").style.zoom = value;
    document.querySelector("#desktop-icons").style.zoom = value;
  };
  w.setContent(
    el(
      "div",
      { class: "dialog-padding" },
      el("p", { text: "Magnify desktop windows and icons." }),
      field(
        "Magnification level:",
        el(
          "select",
          { onchange: (e) => update(+e.target.value) },
          ...[1, 1.25, 1.5, 2].map((v) =>
            el("option", { value: v, text: Math.round(v * 100) + "%" }),
          ),
        ),
      ),
    ),
    el(
      "div",
      { class: "dialog-buttons" },
      button("Reset", () => update(1)),
      button("Exit", () => w.close()),
    ),
  );
  w.addCleanup(() => update(1));
  return w;
}

export function openDiskManager(ctx, { defrag = false } = {}) {
  const w = ctx.wm.create({
      title: defrag ? "Disk Defragmenter" : "Disk Management",
      icon: "drive",
      width: 650,
      height: 440,
      appId: defrag ? "defrag" : "diskmanager",
    }),
    map = el("div", { class: "disk-map" }),
    report = el("pre", { class: "disk-report" }),
    usage = new TextEncoder().encode(JSON.stringify(ctx.fs.snapshot())).length;
  const analyze = () => {
    const live = [...ctx.fs.nodes.values()].filter((n) => !n.trashed),
      orphans = live.filter(
        (n) => n.path.length > 3 && !ctx.fs.exists(dirname(n.path)),
      );
    report.textContent = `Volume: Local Disk (C:)\nFile system: Browser Virtual File System\nEntries: ${live.length}\nStored data: ${formatBytes(usage)}\nOrphaned records: ${orphans.length}\n\n${defrag ? "IndexedDB manages physical allocation. Native disk sectors are not exposed. The map represents virtual file records." : "The C: volume is writable. D: is a virtual read-only CD-ROM. Export a disk image from System Properties to back up your files."}`;
    map.replaceChildren(
      ...Array.from({ length: 192 }, (_, i) =>
        el("span", {
          class: i < live.length ? "disk-block used" : "disk-block",
          title: i < live.length ? live[i].path : "Unallocated display slot",
        }),
      ),
    );
  };
  w.setContent(
    el(
      "div",
      { class: "dialog-padding fill-column" },
      el(
        "table",
        { class: "classic-table" },
        el(
          "thead",
          {},
          el(
            "tr",
            {},
            ...["Volume", "File System", "Status"].map((s) =>
              el("th", { text: s }),
            ),
          ),
        ),
        el(
          "tbody",
          {},
          el(
            "tr",
            {},
            el("td", { text: "Local Disk (C:)" }),
            el("td", { text: "Virtual FS / IndexedDB" }),
            el("td", { text: "Healthy" }),
          ),
          el(
            "tr",
            {},
            el("td", { text: "Compact Disc (D:)" }),
            el("td", { text: "Virtual CD-ROM" }),
            el("td", { text: "Read-only" }),
          ),
        ),
      ),
      map,
      report,
      el(
        "div",
        { class: "dialog-buttons" },
        button("Analyze", analyze),
        button("Back Up...", () =>
          downloadFile(
            "Windows2000-Backup.json",
            JSON.stringify(ctx.fs.snapshot()),
            "application/json",
          ),
        ),
        button("Close", () => w.close()),
      ),
    ),
  );
  analyze();
  return w;
}
