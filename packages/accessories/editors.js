import { DOCS, basename, extension, downloadFile } from "../core/index.js";
import {
  el,
  button,
  icon,
  toolbar,
  statusBar,
  separator,
  checkbox,
  field,
  safely,
} from "../ui/index.js";

export function openNotepad(ctx, { path = null, text = "" } = {}) {
  let filename = path,
    saved = path ? ctx.fs.readFile(path) : text,
    wrap = false;
  const w = ctx.wm.create({
    title: (filename ? basename(filename) : "Untitled") + " - Notepad",
    icon: "notepad",
    width: 610,
    height: 410,
    appId: "notepad",
  });
  const input = el("textarea", {
    class: "notepad-editor",
    spellcheck: false,
    "aria-label": "Notepad text",
    wrap: "off",
    value: saved,
  });
  saved = input.value;
  const textUndo = [],
    textRedo = [];
  const recordText = () => {
    textUndo.push({
      value: input.value,
      start: input.selectionStart,
      end: input.selectionEnd,
      scroll: input.scrollTop,
    });
    let size = textUndo.reduce((n, x) => n + x.value.length, 0);
    while (textUndo.length > 1 && (textUndo.length > 100 || size > 4000000))
      size -= textUndo.shift().value.length;
    textRedo.length = 0;
  };
  const restoreText = (state) => {
    input.value = state.value;
    input.setSelectionRange(state.start, state.end);
    input.scrollTop = state.scroll;
    update();
  };
  const undoText = (redo = false) => {
    const from = redo ? textRedo : textUndo,
      to = redo ? textUndo : textRedo;
    if (from.length) {
      to.push({
        value: input.value,
        start: input.selectionStart,
        end: input.selectionEnd,
        scroll: input.scrollTop,
      });
      restoreText(from.pop());
    }
  };
  input.addEventListener("beforeinput", (e) => {
    if (e.inputType === "historyUndo" || e.inputType === "historyRedo") {
      e.preventDefault();
      undoText(e.inputType === "historyRedo");
    } else recordText();
  });
  const replaceText = (value) => {
    recordText();
    input.setRangeText(value, input.selectionStart, input.selectionEnd, "end");
    update();
  };
  const dirty = () => input.value !== saved,
    update = () =>
      w.setTitle(
        (dirty() ? "*" : "") +
          (filename ? basename(filename) : "Untitled") +
          " - Notepad",
      );
  input.addEventListener("input", update);
  const save = async (as = false) => {
    let target = filename;
    if (!target || as)
      target = await ctx.dialogs.file({
        mode: "save",
        name: target ? basename(target) : "Untitled.txt",
        normalizeName: (name) => (extension(name) ? name : name + ".txt"),
      });
    if (!target) return false;
    const snapshot = input.value;
    await ctx.fs.writeFile(target, snapshot);
    filename = target;
    saved = snapshot;
    update();
    return true;
  };
  const canDiscard = async () => {
    if (!dirty()) return true;
    const answer = await ctx.dialogs.message(
      `The text in the ${filename ? basename(filename) : "Untitled"} file has changed.\n\nDo you want to save the changes?`,
      { title: "Notepad", buttons: ["Yes", "No", "Cancel"] },
    );
    return answer === "Yes" ? (await save()) && !dirty() : answer === "No";
  };
  const newDoc = async () => {
    if (await canDiscard()) {
      filename = null;
      input.value = saved = "";
      textUndo.length = textRedo.length = 0;
      update();
      input.focus();
    }
  };
  const open = async () => {
    if (!(await canDiscard())) return;
    const p = await ctx.dialogs.file({ mode: "open" });
    if (p) {
      filename = p;
      input.value = ctx.fs.readFile(p);
      saved = input.value;
      textUndo.length = textRedo.length = 0;
      update();
    }
  };
  const edit = async (action) => {
    input.focus();
    if (action === "copy" || action === "cut") {
      const text = input.value.slice(input.selectionStart, input.selectionEnd);
      await ctx.clipboard.setText(text);
      if (action === "cut") {
        replaceText("");
      }
    } else if (action === "paste") {
      replaceText(await ctx.clipboard.getText());
    } else if (action === "delete") {
      replaceText("");
    } else if (action === "selectAll") input.select();
    else if (action === "undo") undoText();
  };
  const timeDate = () => {
    replaceText(new Date().toLocaleString());
    input.focus();
  };
  let lastFind = "";
  const find = (replace = false) => {
    const d = ctx.wm.create({
        title: replace ? "Replace" : "Find",
        icon: "notepad",
        width: 400,
        height: replace ? 212 : 178,
        dialog: true,
        resizable: false,
        minimizable: false,
        maximizable: false,
        appId: "find",
      }),
      needle = el("input", { value: lastFind, "aria-label": "Find what" }),
      replacement = el("input", { "aria-label": "Replace with" });
    let matchCase = false;
    const findNext = async () => {
      lastFind = needle.value;
      if (!lastFind) return false;
      const value = matchCase ? input.value : input.value.toLowerCase(),
        q = matchCase ? lastFind : lastFind.toLowerCase();
      let index = value.indexOf(q, input.selectionEnd);
      if (index < 0) index = value.indexOf(q);
      if (index < 0) {
        await ctx.dialogs.message(`Cannot find “${needle.value}”`, {
          title: "Notepad",
        });
        return false;
      }
      input.setSelectionRange(index, index + q.length);
      input.focus();
      input.scrollTop =
        input.value.slice(0, index).split("\n").length * 16 -
        input.clientHeight / 2;
      return true;
    };
    const fields = el(
      "div",
      { class: "find-fields" },
      field("Find what:", needle),
      replace ? field("Replace with:", replacement) : null,
      checkbox("Match case", false, (v) => (matchCase = v)),
    );
    const actions = el(
      "div",
      { class: "find-actions" },
      button("Find Next", findNext, { class: "default-button" }),
      replace
        ? button("Replace", async () => {
            const selection = input.value.slice(
              input.selectionStart,
              input.selectionEnd,
            );
            if (
              (matchCase ? selection : selection.toLowerCase()) ===
                (matchCase ? needle.value : needle.value.toLowerCase()) &&
              needle.value
            ) {
              replaceText(replacement.value);
            }
            await findNext();
          })
        : null,
      replace
        ? button("Replace All", () => {
            if (!needle.value) return;
            const escaped = needle.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            recordText();
            input.value = input.value.replace(
              new RegExp(escaped, matchCase ? "g" : "gi"),
              () => replacement.value,
            );
            update();
          })
        : null,
      button("Cancel", () => d.close()),
    );
    d.setContent(el("div", { class: "find-dialog" }, fields, actions));
    needle.addEventListener("keydown", (e) => {
      if (e.key === "Enter") findNext();
    });
    queueMicrotask(() => needle.focus());
  };
  const font = () => {
    const d = ctx.wm.create({
      title: "Font",
      width: 410,
      height: 280,
      dialog: true,
      resizable: false,
      minimizable: false,
      maximizable: false,
      appId: "font",
    });
    const family = el(
        "select",
        { "aria-label": "Font" },
        ...[
          "Courier New",
          "Tahoma",
          "Arial",
          "Times New Roman",
          "monospace",
        ].map((f) => el("option", { text: f, value: f })),
      ),
      size = el("input", {
        type: "number",
        min: 8,
        max: 72,
        value: parseInt(input.style.fontSize) || 13,
        "aria-label": "Size",
      }),
      weight = el(
        "select",
        { "aria-label": "Font style" },
        el("option", { value: "normal", text: "Regular" }),
        el("option", { value: "bold", text: "Bold" }),
        el("option", { value: "italic", text: "Italic" }),
      );
    d.setContent(
      el(
        "div",
        { class: "dialog-padding" },
        field("Font:", family),
        field("Font style:", weight),
        field("Size:", size),
        el(
          "fieldset",
          {},
          el("legend", { text: "Sample" }),
          el("div", { class: "font-sample", text: "AaBbYyZz" }),
        ),
      ),
      el(
        "div",
        { class: "dialog-buttons" },
        button("OK", () => {
          input.style.fontFamily = family.value;
          input.style.fontSize =
            Math.min(72, Math.max(8, Number(size.value))) + "px";
          input.style.fontWeight = weight.value === "bold" ? "bold" : "normal";
          input.style.fontStyle =
            weight.value === "italic" ? "italic" : "normal";
          d.close();
        }),
        button("Cancel", () => d.close()),
      ),
    );
  };
  w.setMenu({
    File: [
      { label: "New", shortcut: "Ctrl+N", action: newDoc },
      { label: "Open...", shortcut: "Ctrl+O", action: open },
      { label: "Save", shortcut: "Ctrl+S", action: () => save() },
      { label: "Save As...", action: () => save(true) },
      separator(),
      {
        label: "Download",
        action: () =>
          downloadFile(
            filename ? basename(filename) : "Untitled.txt",
            input.value,
          ),
      },
      {
        label: "Print...",
        shortcut: "Ctrl+P",
        action: () =>
          ctx.printText(
            input.value,
            filename ? basename(filename) : "Untitled",
          ),
      },
      separator(),
      { label: "Exit", action: () => w.close() },
    ],
    Edit: () => [
      { label: "Undo", shortcut: "Ctrl+Z", action: () => edit("undo") },
      separator(),
      { label: "Cut", shortcut: "Ctrl+X", action: () => edit("cut") },
      { label: "Copy", shortcut: "Ctrl+C", action: () => edit("copy") },
      { label: "Paste", shortcut: "Ctrl+V", action: () => edit("paste") },
      { label: "Delete", shortcut: "Del", action: () => edit("delete") },
      separator(),
      { label: "Find...", shortcut: "Ctrl+F", action: () => find() },
      { label: "Replace...", shortcut: "Ctrl+H", action: () => find(true) },
      separator(),
      {
        label: "Select All",
        shortcut: "Ctrl+A",
        action: () => edit("selectAll"),
      },
      { label: "Time/Date", shortcut: "F5", action: timeDate },
    ],
    Format: () => [
      {
        label: "Word Wrap",
        checked: wrap,
        action: () => {
          wrap = !wrap;
          input.wrap = wrap ? "soft" : "off";
          input.style.whiteSpace = wrap ? "pre-wrap" : "pre";
        },
      },
      { label: "Font...", action: font },
    ],
    Help: [
      {
        label: "Help Topics",
        action: () => ctx.launch("help", { topic: "notepad" }),
      },
      {
        label: "About Notepad",
        action: () =>
          ctx.dialogs.message(
            "Notepad\nWindows 2000 text editor\n\nRead and write text files on your virtual hard drive.",
            { title: "About Notepad", icon: "notepad" },
          ),
      },
    ],
  });
  w.setContent(input);
  w.onClose = canDiscard;
  w.el.addEventListener(
    "keydown",
    safely(async (e) => {
      if (!(e.ctrlKey || e.metaKey)) {
        if (e.key === "F5") {
          e.preventDefault();
          timeDate();
        }
        if (e.key === "Tab") {
          e.preventDefault();
          replaceText("\t");
        }
        return;
      }
      const key = e.key.toLowerCase(),
        actions = {
          z: () => undoText(e.shiftKey),
          y: () => undoText(true),
          s: () => save(e.shiftKey),
          o: open,
          n: newDoc,
          f: () => find(),
          h: () => find(true),
          p: () => ctx.printText(input.value, filename || "Untitled"),
        };
      if (actions[key]) {
        e.preventDefault();
        await actions[key]();
      }
    }),
  );
  queueMicrotask(() => input.focus());
  w.editor = input;
  w.save = save;
  return w;
}

export function openWordPad(ctx, { path = null } = {}) {
  const w = ctx.wm.create({
    title: (path ? basename(path) : "Document") + " - WordPad",
    icon: "wordpad",
    width: 720,
    height: 520,
    appId: "wordpad",
  });
  let filename = path,
    saved = "",
    changed = false;
  const editor = el("div", {
    class: "wordpad-page",
    contenteditable: true,
    role: "textbox",
    "aria-multiline": true,
    "aria-label": "WordPad document",
    spellcheck: true,
  });
  if (path) {
    const raw = ctx.fs.readFile(path);
    if (extension(path) === "wdoc") {
      try {
        const data = JSON.parse(raw);
        editor.innerHTML = sanitizeDocument(data.html || "");
      } catch {
        editor.textContent = raw;
      }
    } else if (extension(path) === "rtf")
      editor.textContent = raw
        .replace(/\\[a-z]+-?\d* ?/g, "")
        .replace(/[{}]/g, "");
    else editor.textContent = raw;
  }
  saved = editor.innerHTML;
  const status = statusBar("For Help, press F1", "");
  const update = () => {
    changed = editor.innerHTML !== saved;
    w.setTitle(
      (changed ? "*" : "") +
        (filename ? basename(filename) : "Document") +
        " - WordPad",
    );
    status.children[1].textContent =
      editor.innerText.trim().split(/\s+/).filter(Boolean).length + " words";
  };
  editor.addEventListener("input", update);
  let selection = null;
  editor.addEventListener("keyup", capture);
  editor.addEventListener("mouseup", capture);
  function capture() {
    const s = window.getSelection();
    if (s.rangeCount && editor.contains(s.anchorNode))
      selection = s.getRangeAt(0).cloneRange();
  }
  const command = async (name, value = null) => {
    editor.focus();
    if (selection) {
      const s = window.getSelection();
      s.removeAllRanges();
      s.addRange(selection);
    }
    if (name === "copy" || name === "cut") {
      const text = window.getSelection()?.toString() || "";
      await ctx.clipboard.setText(text);
      if (name === "cut") document.execCommand("delete");
    } else document.execCommand(name, false, value);
    capture();
    update();
  };
  const save = async (as = false) => {
    let target = filename;
    if (as || !target)
      target = await ctx.dialogs.file({
        mode: "save",
        name: target ? basename(target) : "Document.wdoc",
        normalizeName: (name) => (extension(name) ? name : name + ".wdoc"),
      });
    if (!target) return false;
    const htmlSnapshot = editor.innerHTML,
      textSnapshot = editor.innerText;
    await ctx.fs.writeFile(
      target,
      extension(target) === "wdoc"
        ? JSON.stringify({
            format: "win2k-wordpad",
            version: 1,
            html: sanitizeDocument(htmlSnapshot),
          })
        : textSnapshot,
      {
        mime: extension(target) === "wdoc" ? "application/json" : "text/plain",
      },
    );
    filename = target;
    saved = htmlSnapshot;
    update();
    return true;
  };
  const discard = async () => {
    if (!changed) return true;
    const a = await ctx.dialogs.message(
      "Save changes to " + (filename ? basename(filename) : "Document") + "?",
      { title: "WordPad", buttons: ["Yes", "No", "Cancel"] },
    );
    return a === "Yes" ? (await save()) && !changed : a === "No";
  };
  const newDoc = async () => {
    if (await discard()) {
      editor.replaceChildren();
      filename = null;
      saved = "";
      update();
    }
  };
  const open = async () => {
    const p = await ctx.dialogs.file({ mode: "open" });
    if (p) ctx.launch("wordpad", { path: p });
  };
  const family = el(
      "select",
      {
        "aria-label": "Font",
        onchange: (e) => command("fontName", e.target.value),
      },
      ...["Arial", "Times New Roman", "Courier New", "Tahoma", "Verdana"].map(
        (n) => el("option", { text: n }),
      ),
    ),
    size = el(
      "select",
      {
        "aria-label": "Font size",
        onchange: (e) => command("fontSize", e.target.value),
      },
      ...[
        ["1", "8"],
        ["2", "10"],
        ["3", "12"],
        ["4", "14"],
        ["5", "18"],
        ["6", "24"],
        ["7", "36"],
      ].map(([value, text]) =>
        el("option", { value, text, selected: value === "3" }),
      ),
    );
  const formatting = el(
    "div",
    { class: "toolbar wordpad-format" },
    family,
    size,
    button("B", () => command("bold"), {
      class: "tool-button bold",
      title: "Bold",
    }),
    button("I", () => command("italic"), {
      class: "tool-button italic",
      title: "Italic",
    }),
    button("U", () => command("underline"), {
      class: "tool-button underline",
      title: "Underline",
    }),
    el("input", {
      type: "color",
      value: "#000000",
      title: "Text color",
      "aria-label": "Text color",
      onchange: (e) => command("foreColor", e.target.value),
    }),
    el("span", { class: "toolbar-separator" }),
    button("≡", () => command("justifyLeft"), {
      class: "tool-button",
      title: "Align Left",
    }),
    button("≡", () => command("justifyCenter"), {
      class: "tool-button",
      title: "Center",
    }),
    button("≡", () => command("justifyRight"), {
      class: "tool-button",
      title: "Align Right",
    }),
    button("• ≡", () => command("insertUnorderedList"), {
      class: "tool-button",
      title: "Bullets",
    }),
  );
  formatting.addEventListener("mousedown", (e) => {
    if (e.target.closest("button")) e.preventDefault();
  });
  const tools = toolbar([
    { icon: "document", title: "New", action: newDoc },
    { icon: "folderOpen", title: "Open", action: open },
    { glyph: "▣", title: "Save", action: () => save() },
    { separator: true },
    { glyph: "✂", title: "Cut", action: () => command("cut") },
    { glyph: "▤", title: "Copy", action: () => command("copy") },
    {
      glyph: "▣",
      title: "Paste",
      action: async () => command("insertText", await ctx.clipboard.getText()),
    },
    { separator: true },
    { glyph: "↶", title: "Undo", action: () => command("undo") },
    { glyph: "↷", title: "Redo", action: () => command("redo") },
  ]);
  tools.addEventListener("mousedown", (e) => e.preventDefault());
  w.setMenu({
    File: [
      { label: "New", shortcut: "Ctrl+N", action: newDoc },
      { label: "Open...", shortcut: "Ctrl+O", action: open },
      { label: "Save", shortcut: "Ctrl+S", action: () => save() },
      { label: "Save As...", action: () => save(true) },
      separator(),
      {
        label: "Download as HTML",
        action: () =>
          downloadFile(
            "Document.html",
            '<!doctype html><meta charset="utf-8"><title>Document</title>' +
              sanitizeDocument(editor.innerHTML),
            "text/html",
          ),
      },
      {
        label: "Print...",
        action: () => ctx.printText(editor.innerText, filename || "Document"),
      },
      separator(),
      { label: "Exit", action: () => w.close() },
    ],
    Edit: [
      { label: "Undo", action: () => command("undo") },
      { label: "Redo", action: () => command("redo") },
      separator(),
      { label: "Cut", action: () => command("cut") },
      { label: "Copy", action: () => command("copy") },
      {
        label: "Paste",
        action: async () =>
          command("insertText", await ctx.clipboard.getText()),
      },
      { label: "Select All", action: () => command("selectAll") },
    ],
    View: [
      {
        label: "Zoom In",
        action: () =>
          (editor.style.zoom = String(
            Math.min(2, (Number(editor.style.zoom) || 1) + 0.1),
          )),
      },
      {
        label: "Zoom Out",
        action: () =>
          (editor.style.zoom = String(
            Math.max(0.5, (Number(editor.style.zoom) || 1) - 0.1),
          )),
      },
    ],
    Insert: [
      {
        label: "Date and Time...",
        action: () => command("insertText", new Date().toLocaleString()),
      },
      {
        label: "Image...",
        action: async () => {
          const p = await ctx.dialogs.file({
            filter: (n) => n.mime?.startsWith("image/"),
          });
          if (p) {
            const data = ctx.fs.readFile(p);
            if (data.startsWith("data:image/")) command("insertImage", data);
          }
        },
      },
    ],
    Format: [
      { label: "Bold", action: () => command("bold") },
      { label: "Italic", action: () => command("italic") },
      { label: "Underline", action: () => command("underline") },
      { label: "Bullet Style", action: () => command("insertUnorderedList") },
      { label: "Increase Indent", action: () => command("indent") },
      { label: "Decrease Indent", action: () => command("outdent") },
    ],
    Help: [
      {
        label: "Help Topics",
        action: () => ctx.launch("help", { topic: "wordpad" }),
      },
      {
        label: "About WordPad",
        action: () =>
          ctx.dialogs.message(
            "WordPad\nFormatted text, images, printing, and portable documents.\n\nUse .wdoc to preserve formatting; .txt saves plain text.",
            { title: "About WordPad", icon: "wordpad" },
          ),
      },
    ],
  });
  const ruler = el(
    "div",
    { class: "wordpad-ruler" },
    ...Array.from({ length: 8 }, (_, i) =>
      el("span", { text: i ? String(i) : "" }),
    ),
  );
  w.setContent(
    tools,
    formatting,
    ruler,
    el("div", { class: "wordpad-workspace" }, editor),
    status,
  );
  w.onClose = discard;
  w.el.addEventListener(
    "keydown",
    safely(async (e) => {
      if (e.ctrlKey || e.metaKey) {
        const actions = { s: () => save(e.shiftKey), n: newDoc, o: open };
        const action = actions[e.key.toLowerCase()];
        if (action) {
          e.preventDefault();
          await action();
        }
      }
    }),
  );
  queueMicrotask(() => editor.focus());
  return w;
}
function sanitizeDocument(html) {
  const template = document.createElement("template");
  template.innerHTML = String(html);
  const allowed = new Set([
    "B",
    "I",
    "U",
    "S",
    "STRIKE",
    "P",
    "DIV",
    "BR",
    "SPAN",
    "FONT",
    "UL",
    "OL",
    "LI",
    "BLOCKQUOTE",
    "IMG",
    "STRONG",
    "EM",
    "SUB",
    "SUP",
    "H1",
    "H2",
    "H3",
  ]);
  for (const node of [...template.content.querySelectorAll("*")]) {
    if (!allowed.has(node.tagName)) {
      node.replaceWith(document.createTextNode(node.textContent || ""));
      continue;
    }
    for (const attr of [...node.attributes]) {
      if (
        attr.name.startsWith("on") ||
        ![
          "style",
          "color",
          "face",
          "size",
          "src",
          "width",
          "height",
          "align",
        ].includes(attr.name)
      )
        node.removeAttribute(attr.name);
      if (
        attr.name === "src" &&
        !/^data:image\/(png|jpeg|gif|webp|bmp);base64,/i.test(attr.value)
      )
        node.removeAttribute("src");
      if (
        attr.name === "style" &&
        /url\s*\(|expression|position|behavior/i.test(attr.value)
      )
        node.removeAttribute("style");
    }
  }
  return template.innerHTML;
}
