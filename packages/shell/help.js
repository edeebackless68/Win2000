import { el, button, icon, statusBar, tabs, checkbox } from "../ui/index.js";
const topics = {
  welcome: {
    title: "Welcome to Windows 2000",
    paragraphs: [
      "Welcome to your Windows 2000 Professional browser desktop. Open programs from the Start menu, manage files in My Computer, and customize the computer through Control Panel.",
      "The shell follows the Windows 2000 visual language: Tahoma text, square beveled controls, gradient title bars, and a classic taskbar. Applications share the same virtual drive, clipboard, settings, and window manager.",
    ],
    links: [
      ["Open My Computer", "explorer", { path: "computer" }],
      [
        "Read the welcome document",
        "notepad",
        {
          path: "C:/Documents and Settings/Administrator/My Documents/Welcome.txt",
        },
      ],
      ["Customize the desktop", "control", { page: "display" }],
    ],
  },
  files: {
    title: "Working with files and folders",
    paragraphs: [
      "My Computer provides the C: virtual hard drive and D: read-only virtual CD-ROM. My Documents is your main workspace. Double-click folders to navigate, use Back, Forward, and Up, or enter a path in the Address bar.",
      "Create, rename, move, copy, and delete files from the File or Edit menus, by using keyboard shortcuts, or through the right-click menu. Drag files between folders. Drop files from your real computer into Explorer to import them.",
      "Deleted files go to the Recycle Bin. Restore returns them to their original folder. Empty Recycle Bin permanently removes the recycled records. Command Prompt DEL performs a permanent deletion.",
      "Files are saved transactionally to IndexedDB in this browser. Browser data clearing, private browsing, or a different site origin can remove or isolate the virtual disk. Use System Properties > Advanced > Back Up Virtual Disk to export a portable backup.",
    ],
    links: [
      ["Open My Documents", "explorer", { path: "documents" }],
      ["Back up your virtual disk", "control", { page: "system" }],
    ],
  },
  windows: {
    title: "Using the desktop",
    paragraphs: [
      "Drag a window by its title bar. Resize it from any edge or corner. Double-click the title bar to maximize or restore. The three title-bar controls minimize, maximize, and close.",
      "The taskbar shows open applications. Click a task to switch to it or minimize the active window. Right-click the taskbar to cascade, tile, or minimize all windows. The Show Desktop button is in Quick Launch.",
      "Right-click the desktop to create a folder or text document, refresh icons, or open Display Properties. Use F2 to rename selected files and Delete to send them to the Recycle Bin.",
      "Shortcuts: Ctrl+Esc opens Start; Ctrl+Shift+Esc opens Task Manager; Alt+F4 closes the active window; Ctrl+S saves documents. Browser-reserved shortcuts may be handled by the host operating system.",
    ],
    links: [["Display Properties", "control", { page: "display" }]],
  },
  notepad: {
    title: "Notepad",
    paragraphs: [
      "Notepad edits plain text files. Use File > Open to select a file, or open a .txt file from Explorer. Save and Save As use the same virtual filesystem as every other application.",
      "The Edit menu provides selection, clipboard operations, Find, Replace, and Time/Date. Format changes word wrapping and the editor font. Download writes the document to your device; Print opens the browser print dialog.",
    ],
    links: [["Open Notepad", "notepad", {}]],
  },
  wordpad: {
    title: "WordPad",
    paragraphs: [
      "WordPad edits formatted documents with fonts, sizes, colors, bold, italic, underlining, alignment, lists, and embedded images.",
      "Save as .wdoc to preserve formatting and embedded pictures. Save as .txt for plain text. Export as HTML from the File menu for use outside this desktop. Basic RTF text can be read, but full native RTF binary-object and layout compatibility is not implemented.",
    ],
    links: [["Open WordPad", "wordpad", {}]],
  },
  paint: {
    title: "Paint",
    paragraphs: [
      "Choose a drawing tool, a foreground color, and a brush size. Right-click a color to select the background color. Drag to draw lines and shapes; hold Shift while drawing shapes to constrain proportions.",
      "The fill tool uses a contiguous pixel flood fill. Select an area to move, copy, clear, or crop it. The Image menu provides rotation, reflection, color inversion, canvas attributes, and clearing. Double-click to finish a polygon. Escape cancels a pending selection or polygon.",
      "Images save as lossless PNG. Open imported PNG, JPEG, BMP, GIF, or WebP files. Browser-supported decoders determine image format availability. Undo history is bounded to avoid exhausting memory.",
      "Paint rasterizes brush strokes into a canvas bitmap and presents that bitmap through WebGPU when available, with WebGL 2 and Canvas 2D fallback. The DOM renders native-feeling controls and text.",
    ],
    links: [["Open Paint", "paint", {}]],
  },
  calculator: {
    title: "Calculator",
    paragraphs: [
      "Calculator provides standard arithmetic, repeat equals, percentage, reciprocal, square root, and memory functions. Choose View > Scientific for trigonometric functions, logarithms, powers, and factorials.",
      "Enter numbers from the keyboard or use the buttons. The engine parses digits and operations directly; it does not evaluate entered text as JavaScript.",
    ],
    links: [["Open Calculator", "calculator", {}]],
  },
  games: {
    title: "Games",
    paragraphs: [
      "Minesweeper offers beginner, intermediate, expert, and custom fields, flagging, chording, a safe first click, and best times. Right-click or touch and hold to mark a square.",
      "Solitaire supports Klondike draw-one and draw-three rules, scoring, hints, undo, card backs, dragging, and automatic foundation moves. FreeCell supports free cells, ordered runs, legal move capacity, and numbered deterministic deals. FreeCell deal numbers are specific to this implementation.",
      "Pinball uses fixed-step physics, bumpers, flippers, a plunger, nudging, scoring, and three balls. Its table geometry, artwork, and mission rules are an approximation; the original Space Cadet game data and engine are not included.",
    ],
    links: [
      ["Play Minesweeper", "minesweeper", {}],
      ["Play Solitaire", "solitaire", {}],
      ["Play FreeCell", "freecell", {}],
      ["Play Pinball", "pinball", {}],
    ],
  },
  internet: {
    title: "Internet and e-mail",
    paragraphs: [
      "Internet Explorer provides an address bar, history, favorites, local HTML viewing, and embedded web pages. Websites can reject embedding. Use Open in Browser when a page cannot be shown inside the desktop. ActiveX, VBScript, and legacy browser plugins are not supported.",
      "Outlook Express stores local messages and drafts. The Send button saves a draft and opens your device’s mail application through mailto. Complete sending there. This desktop does not connect directly to SMTP or POP3.",
      "Address Book stores contacts on the virtual drive. Create, edit, search, and export contacts; choose Send Mail to address a new message.",
    ],
    links: [
      ["Open Internet Explorer", "ie", {}],
      ["Open Outlook Express", "outlook", {}],
      ["Open Address Book", "address", {}],
    ],
  },
  media: {
    title: "Sound, pictures, and video",
    paragraphs: [
      "Windows Media Player opens audio and video files supported by the browser and displays a live audio spectrum. Import Media adds files from your real computer to the virtual drive. A short original synthesized melody is included for playback.",
      "Sound Recorder requests microphone access only when you press Record. Stop the recording, listen to it, and save it as a PCM WAV. Volume Control adjusts desktop sounds.",
      "Imaging views pictures, zooms and rotates the view, prints, downloads, and opens pictures in Paint for editing. CD Player uses imported audio because a web page cannot read an optical drive.",
    ],
    links: [
      ["Open Media Player", "mediaplayer", {}],
      ["Open Sound Recorder", "recorder", {}],
      ["Open Imaging", "imaging", {}],
    ],
  },
  system: {
    title: "System tools",
    paragraphs: [
      "Task Manager lists the actual application windows running in this desktop and lets you switch to or close them. Its performance graph measures browser event-loop delay. The browser does not expose native process CPU counters.",
      "Registry Editor edits the virtual registry stored as JSON on the C: drive. System Information and Device Manager report actual browser capabilities. Event Viewer records activity in the current desktop session.",
      "Command Prompt operates on the shared virtual filesystem and supports common directory, file, environment, text, and process commands. Type HELP for the full supported command list.",
      "Scheduled Tasks starts programs while this desktop is open. It cannot wake a closed browser. Disk Management analyzes virtual file records; the browser manages physical storage allocation.",
    ],
    links: [
      ["Task Manager", "taskmgr", {}],
      ["Command Prompt", "cmd", {}],
      ["System Information", "systeminfo", {}],
    ],
  },
  architecture: {
    title: "Implementation and compatibility",
    paragraphs: [
      "This is a JavaScript reimplementation of the desktop environment, not an x86 emulator or an NT kernel. It cannot execute arbitrary Windows binaries, install native drivers, start native NT services, join Active Directory, or implement original kernel security and networking semantics.",
      "The implementation is split into reusable ES module packages: core, ui, rendering, shell, explorer, accessories, games, control-panel, internet, and system. They share a context containing filesystem, event bus, window manager, settings, clipboard, registry, and application services.",
      "WebGPU is used for desktop and canvas presentation. WebGL 2 and Canvas 2D are automatic fallbacks. Controls and editable text use HTML/CSS for browser input and accessibility. Use ?renderer=canvas2d or ?renderer=webgl2 in the URL to select a fallback explicitly.",
      "Visual fidelity is based on period screenshots, palette values, and icon imagery. Browser font rasterization, responsive window sizing, approximated application screens, and unavailable native features mean this is not a verified pixel-for-pixel reproduction of every Windows 2000 screen.",
      "Windows and associated historic imagery belong to Microsoft. Bundled icon provenance and font licenses are documented in the source. The Tahoma-compatible bundled font comes from Wine.",
    ],
    links: [["System Information", "systeminfo", {}]],
  },
  updates: {
    title: "Windows Update",
    paragraphs: [
      "This browser desktop is maintained as a web application. The original Windows Update service and Windows 2000 operating-system patches are not part of this environment.",
      "Desktop version: 1.0.0. Refresh the page to load the current published version. Your virtual files are preserved in this browser.",
    ],
    links: [],
  },
  shortcuts: {
    title: "Keyboard shortcuts",
    paragraphs: [
      "Ctrl+Esc — Open Start\nCtrl+Shift+Esc — Task Manager\nAlt+F4 — Close active window\nAlt+Tab — Switch windows when the host browser allows it\nWin+D — Show desktop when the host browser allows it",
      "Explorer: F2 rename, Delete delete, F5 refresh, Backspace up, Ctrl+A select all, Ctrl+C copy, Ctrl+X cut, Ctrl+V paste.",
      "Editors: Ctrl+N new, Ctrl+O open, Ctrl+S save. Notepad: Ctrl+F find, Ctrl+H replace, F5 time/date. Games: F2 new game.",
    ],
    links: [],
  },
};
export function openHelp(ctx, { topic = "welcome" } = {}) {
  const w = ctx.wm.create({
    title: "Windows Help",
    icon: "help",
    width: 720,
    height: 480,
    appId: "help",
  });
  let current = topic in topics ? topic : "welcome",
    history = [],
    query = "";
  const sidebar = el("div", { class: "help-sidebar" }),
    article = el("article", { class: "help-article" }),
    list = el("div", { class: "help-topics" }),
    search = el("input", {
      placeholder: "Type a keyword",
      "aria-label": "Search help",
      oninput: (e) => {
        query = e.target.value.toLowerCase();
        renderList();
      },
    });
  const show = (key) => {
    history.push(current);
    current = key;
    const t = topics[key];
    article.replaceChildren(
      el("h1", { text: t.title }),
      ...t.paragraphs.map((p) => el("p", { text: p })),
      ...(t.links?.length
        ? [
            el(
              "div",
              { class: "help-related" },
              el("b", { text: "Related tasks" }),
              ...t.links.map(([label, id, args]) =>
                button(label, () => ctx.launch(id, args), {
                  class: "text-link",
                }),
              ),
            ),
          ]
        : []),
    );
  };
  function renderList() {
    list.replaceChildren(
      ...Object.entries(topics)
        .filter(
          ([key, t]) =>
            !query ||
            (t.title + " " + t.paragraphs.join(" "))
              .toLowerCase()
              .includes(query),
        )
        .map(([key, t]) =>
          button([icon("help"), t.title], () => show(key), {
            class: "help-topic",
          }),
        ),
    );
  }
  sidebar.append(
    el("div", { class: "help-contents-title", text: "Contents" }),
    search,
    list,
  );
  w.setContent(
    el(
      "div",
      { class: "help-toolbar" },
      button("◀ Back", () => {
        const last = history.pop();
        if (last) {
          const saved = history;
          show(last);
          history = saved.slice(0, -1);
        }
      }),
      button("Home", () => show("welcome")),
      button("Print", () => ctx.printText(article.innerText, "Windows Help")),
    ),
    el("div", { class: "help-main" }, sidebar, article),
    statusBar("Windows 2000 Professional"),
  );
  renderList();
  show(current);
  return w;
}

export function openWelcome(ctx) {
  const w = ctx.wm.create({
    title: "Getting Started with Windows 2000",
    icon: "windows",
    width: 620,
    height: 400,
    appId: "welcome",
    resizable: false,
    maximizable: false,
    x: Math.max(100, Math.round((innerWidth - 620) / 2) + 48),
    y: Math.max(40, Math.round((innerHeight - 430) / 2) - 20),
  });
  const tasks = [
    [
      "Take a tour of Windows",
      "Discover your desktop, programs, and system tools.",
      "help",
      { topic: "welcome" },
      "help",
    ],
    [
      "Connect to the Internet",
      "Explore the World Wide Web with Internet Explorer.",
      "ie",
      {},
      "ie",
    ],
    [
      "Customize your computer",
      "Choose a background, colors, and display settings.",
      "control",
      { page: "display" },
      "display",
    ],
    [
      "Start working with your files",
      "Open My Documents and make yourself at home.",
      "explorer",
      { path: "documents" },
      "documents",
    ],
  ];
  w.setContent(
    el(
      "div",
      { class: "welcome-content" },
      el(
        "aside",
        { class: "welcome-brand" },
        icon("windows", 32),
        el("div", { class: "welcome-microsoft", text: "Microsoft" }),
        el("div", { class: "welcome-windows", text: "Windows" }),
        el("div", { class: "welcome-2000", text: "2000" }),
        el("div", { class: "welcome-professional", text: "Professional" }),
        el("div", {
          class: "welcome-brand-bottom",
          text: "Built on NT Technology",
        }),
      ),
      el(
        "div",
        { class: "welcome-main" },
        el("h1", { text: "Welcome to Windows 2000" }),
        el("p", {
          class: "welcome-intro",
          text: "A new world of possibilities.",
        }),
        el(
          "div",
          { class: "welcome-tasks" },
          ...tasks.map(([title, desc, app, args, ico]) =>
            button(
              [
                icon(ico, 32),
                el(
                  "span",
                  {},
                  el("b", { text: title }),
                  el("span", { text: desc }),
                ),
              ],
              () => ctx.launch(app, args),
              { class: "welcome-task" },
            ),
          ),
        ),
      ),
    ),
    el(
      "div",
      { class: "welcome-footer" },
      checkbox(
        "Show this screen at startup",
        ctx.settings.get("showWelcome"),
        (v) => ctx.settings.set("showWelcome", v),
      ),
      button("Close", () => w.close(), { class: "default-button" }),
    ),
  );
  return w;
}
export function openAbout(ctx) {
  const w = ctx.wm.create({
    title: "About Windows",
    icon: "computer",
    width: 460,
    height: 325,
    appId: "about",
    dialog: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
  });
  w.setContent(
    el(
      "div",
      { class: "about-banner" },
      icon("windows", 32),
      el(
        "div",
        {},
        el("span", { text: "Microsoft" }),
        el("h1", { text: "Windows 2000" }),
        el("b", { text: "Professional" }),
      ),
    ),
    el(
      "div",
      { class: "about-content" },
      el("p", {
        text: "Microsoft Windows 2000\nVersion 5.0 (Build 2195) · Browser recreation",
      }),
      el("p", {
        text: "This product is registered to:\n" + ctx.settings.get("username"),
      }),
      el("hr"),
      el("p", {
        text:
          "Browser desktop 1.0.0\nRendering: " + ctx.renderer.surface.backend,
      }),
      button(
        "Implementation and compatibility",
        () => ctx.launch("help", { topic: "architecture" }),
        { class: "text-link" },
      ),
    ),
    el(
      "div",
      { class: "dialog-buttons" },
      button("OK", () => w.close(), { class: "default-button" }),
    ),
  );
  return w;
}
