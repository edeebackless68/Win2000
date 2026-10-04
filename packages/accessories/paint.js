import { basename, extension, downloadFile } from "../core/index.js";
import {
  el,
  button,
  icon,
  statusBar,
  separator,
  field,
  safely,
} from "../ui/index.js";
import { GraphicsSurface } from "../rendering/index.js";

import { floodFill } from "./raster.js";
export { floodFill } from "./raster.js";
export async function openPaint(ctx, { path = null } = {}) {
  const w = ctx.wm.create({
    title: (path ? basename(path) : "untitled") + " - Paint",
    icon: "paint",
    width: 820,
    height: 575,
    appId: "paint",
  });
  let file = path,
    dirty = false,
    editRevision = 0,
    tool = "pencil",
    color = "#000000",
    background = "#ffffff",
    lineWidth = 1,
    zoom = 1,
    fillMode = "outline",
    drawing = false,
    start = null,
    last = null,
    base = null,
    selection = null,
    movingSelection = false,
    selectionImage = null,
    polygon = [];
  const bitmap = document.createElement("canvas");
  bitmap.width = 640;
  bitmap.height = 360;
  const c = bitmap.getContext("2d", { willReadFrequently: true });
  c.fillStyle = "#ffffff";
  c.fillRect(0, 0, bitmap.width, bitmap.height);
  const screen = el("canvas", {
      class: "paint-canvas",
      width: 640,
      height: 360,
      "aria-label": "Paint canvas",
    }),
    selectionBox = el("div", { class: "paint-selection", hidden: true }),
    stage = el("div", { class: "paint-stage" }, screen, selectionBox),
    workspace = el("div", { class: "paint-workspace" }, stage),
    status = statusBar(
      "For Help, click Help Topics on the Help Menu.",
      "640 × 360 px",
    );
  const surface = new GraphicsSurface(screen, {
    preference: new URLSearchParams(location.search).get("renderer") || "auto",
  });
  await surface.init();
  const undo = [],
    redo = [];
  const snapshot = () => ({
    width: bitmap.width,
    height: bitmap.height,
    data: c.getImageData(0, 0, bitmap.width, bitmap.height),
  });
  const record = () => {
    undo.push(snapshot());
    let bytes = undo.reduce((a, x) => a + x.data.data.length, 0);
    while (undo.length > 1 && (undo.length > 20 || bytes > 40 * 1024 * 1024)) {
      bytes -= undo.shift().data.data.length;
    }
    redo.length = 0;
  };
  const updateSelection = () => {
    selectionBox.hidden = !selection;
    if (selection)
      Object.assign(selectionBox.style, {
        left: selection.x * zoom + "px",
        top: selection.y * zoom + "px",
        width: selection.width * zoom + "px",
        height: selection.height * zoom + "px",
      });
  };
  const render = () => {
    surface.draw(bitmap);
    stage.style.width = bitmap.width * zoom + "px";
    stage.style.height = bitmap.height * zoom + "px";
    surface.canvas.style.width = bitmap.width * zoom + "px";
    surface.canvas.style.height = bitmap.height * zoom + "px";
    status.children[1].textContent = `${bitmap.width} × ${bitmap.height} px`;
    updateSelection();
  };
  const setDirty = () => {
    editRevision++;
    dirty = true;
    w.setTitle("*" + (file ? basename(file) : "untitled") + " - Paint");
  };
  const restore = (s) => {
    bitmap.width = s.width;
    bitmap.height = s.height;
    c.putImageData(s.data, 0, 0);
    surface.resize(s.width, s.height);
    selection = null;
    render();
    setDirty();
  };
  const undoAction = () => {
      if (undo.length) {
        redo.push(snapshot());
        restore(undo.pop());
      }
    },
    redoAction = () => {
      if (redo.length) {
        undo.push(snapshot());
        restore(redo.pop());
      }
    };
  const tools = [
    ["select", "▧", "Select"],
    ["free-select", "⌁", "Free-Form Select"],
    ["eraser", "▱", "Eraser / Color Eraser"],
    ["fill", "◩", "Fill With Color"],
    ["picker", "⌕", "Pick Color"],
    ["magnifier", "⊕", "Magnifier"],
    ["pencil", "╱", "Pencil"],
    ["brush", "▰", "Brush"],
    ["airbrush", "⁙", "Airbrush"],
    ["text", "A", "Text"],
    ["line", "╱", "Line"],
    ["curve", "∿", "Curve"],
    ["rectangle", "□", "Rectangle"],
    ["polygon", "⬠", "Polygon"],
    ["ellipse", "○", "Ellipse"],
    ["roundrect", "▢", "Rounded Rectangle"],
  ];
  const toolbox = el("div", { class: "paint-toolbox" }),
    toolgrid = el("div", { class: "paint-tools" }),
    options = el("div", { class: "paint-tool-options inset" });
  const chooseTool = (id) => {
    if (polygon.length) {
      c.putImageData(base, 0, 0);
      polygon = [];
      render();
    }
    tool = id;
    polygon = [];
    selection = null;
    toolgrid
      .querySelectorAll("button")
      .forEach((b) => b.classList.toggle("pressed", b.dataset.tool === id));
    surface.canvas.style.cursor = ["text"].includes(id)
      ? "text"
      : id === "magnifier"
        ? "zoom-in"
        : "crosshair";
    status.children[0].textContent = tools.find((t) => t[0] === id)?.[2] || id;
    updateSelection();
  };
  for (const [id, glyph, title] of tools)
    toolgrid.append(
      button(glyph, () => chooseTool(id), {
        class: "paint-tool" + (id === "pencil" ? " pressed" : ""),
        "data-tool": id,
        title,
        "aria-label": title,
      }),
    );
  options.append(
    el("label", { text: "Size" }),
    el(
      "select",
      {
        "aria-label": "Brush size",
        onchange: (e) => (lineWidth = Number(e.target.value)),
      },
      ...[1, 2, 3, 5, 8, 12, 20].map((n) =>
        el("option", { text: String(n), value: n }),
      ),
    ),
    el("label", { text: "Style" }),
    el(
      "select",
      {
        "aria-label": "Shape style",
        onchange: (e) => (fillMode = e.target.value),
      },
      el("option", { text: "Outline", value: "outline" }),
      el("option", { text: "Filled", value: "filled" }),
      el("option", { text: "Solid", value: "solid" }),
    ),
  );
  toolbox.append(toolgrid, options);
  const colors = [
    "#000000",
    "#808080",
    "#800000",
    "#808000",
    "#008000",
    "#008080",
    "#000080",
    "#800080",
    "#808040",
    "#004040",
    "#0080ff",
    "#004080",
    "#8000ff",
    "#804000",
    "#ffffff",
    "#c0c0c0",
    "#ff0000",
    "#ffff00",
    "#00ff00",
    "#00ffff",
    "#0000ff",
    "#ff00ff",
    "#ffff80",
    "#00ff80",
    "#80ffff",
    "#8080ff",
    "#ff0080",
    "#ff8040",
  ];
  const foreground = el("span", {
      class: "paint-foreground",
      style: { background: color },
    }),
    back = el("span", { class: "paint-background", style: { background } }),
    palette = el(
      "div",
      { class: "paint-palette" },
      el("div", { class: "paint-color-preview inset" }, back, foreground),
      el("div", { class: "paint-swatches" }),
    );
  for (const hex of colors) {
    const swatch = button(
      "",
      () => {
        color = hex;
        foreground.style.background = color;
      },
      {
        class: "paint-swatch",
        style: { background: hex },
        title: hex,
        "aria-label": "Color " + hex,
      },
    );
    swatch.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      background = hex;
      back.style.background = hex;
    });
    palette.lastChild.append(swatch);
  }
  const rgba = (hex) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
    255,
  ];
  const pos = (e) => {
    const r = surface.canvas.getBoundingClientRect();
    return {
      x: Math.max(
        0,
        Math.min(
          bitmap.width - 1,
          ((e.clientX - r.left) * bitmap.width) / r.width,
        ),
      ),
      y: Math.max(
        0,
        Math.min(
          bitmap.height - 1,
          ((e.clientY - r.top) * bitmap.height) / r.height,
        ),
      ),
    };
  };
  const drawLine = (a, b) => {
    c.strokeStyle = tool === "eraser" ? background : color;
    c.lineWidth =
      tool === "eraser"
        ? Math.max(8, lineWidth)
        : tool === "brush"
          ? Math.max(3, lineWidth)
          : lineWidth;
    c.lineCap = tool === "pencil" ? "square" : "round";
    c.lineJoin = "round";
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(b.x + 0.01, b.y + 0.01);
    c.stroke();
  };
  const shape = (a, b, shift = false) => {
    if (base) c.putImageData(base, 0, 0);
    let dx = b.x - a.x,
      dy = b.y - a.y;
    if (shift && tool !== "line") {
      const s = Math.max(Math.abs(dx), Math.abs(dy));
      dx = Math.sign(dx) * s;
      dy = Math.sign(dy) * s;
    }
    const x = Math.min(a.x, a.x + dx),
      y = Math.min(a.y, a.y + dy),
      ww = Math.abs(dx),
      hh = Math.abs(dy);
    c.strokeStyle = color;
    c.fillStyle = fillMode === "solid" ? color : background;
    c.lineWidth = lineWidth;
    c.lineCap = "butt";
    c.beginPath();
    if (tool === "line") {
      c.moveTo(a.x, a.y);
      c.lineTo(b.x, b.y);
    } else if (tool === "curve") {
      c.moveTo(a.x, a.y);
      c.bezierCurveTo(
        a.x + dx * 0.75,
        a.y - dy * 0.4,
        a.x + dx * 0.25,
        b.y + dy * 0.4,
        b.x,
        b.y,
      );
    } else if (tool === "ellipse")
      c.ellipse(x + ww / 2, y + hh / 2, ww / 2, hh / 2, 0, 0, Math.PI * 2);
    else if (tool === "roundrect")
      c.roundRect(x, y, ww, hh, Math.min(10, ww / 2, hh / 2));
    else c.rect(x, y, ww, hh);
    if (!["line", "curve"].includes(tool) && fillMode !== "outline") c.fill();
    if (fillMode !== "solid" || ["line", "curve"].includes(tool)) c.stroke();
  };
  const spray = (p) => {
    c.fillStyle = color;
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2,
        r = Math.sqrt(Math.random()) * (lineWidth + 7);
      c.fillRect(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 1, 1);
    }
  };
  stage.addEventListener("contextmenu", (e) => e.preventDefault());
  stage.addEventListener(
    "pointerdown",
    safely(async (e) => {
      if (e.button > 0) return;
      e.preventDefault();
      const p = pos(e);
      start = p;
      last = p;
      if (tool === "picker") {
        const pixel = c.getImageData(p.x, p.y, 1, 1).data;
        color =
          "#" +
          [...pixel.slice(0, 3)]
            .map((v) => v.toString(16).padStart(2, "0"))
            .join("");
        foreground.style.background = color;
        chooseTool("pencil");
        return;
      }
      if (tool === "magnifier") {
        zoom = zoom === 1 ? 2 : zoom === 2 ? 4 : 1;
        render();
        return;
      }
      if (tool === "text") {
        const text = await ctx.dialogs.prompt("Enter text:", "", {
          title: "Paint — Text",
        });
        if (text) {
          record();
          c.font = `${Math.max(14, lineWidth * 4)}px Tahoma, sans-serif`;
          c.fillStyle = color;
          c.fillText(text, p.x, p.y + 16);
          setDirty();
          render();
        }
        return;
      }
      if (tool === "fill") {
        record();
        const data = c.getImageData(0, 0, bitmap.width, bitmap.height);
        floodFill(data, p.x, p.y, rgba(color));
        c.putImageData(data, 0, 0);
        setDirty();
        render();
        return;
      }
      if (tool === "polygon") {
        if (!polygon.length) {
          record();
          base = c.getImageData(0, 0, bitmap.width, bitmap.height);
        }
        polygon.push(p);
        c.strokeStyle = color;
        c.lineWidth = lineWidth;
        if (polygon.length > 1) {
          c.beginPath();
          c.moveTo(polygon.at(-2).x, polygon.at(-2).y);
          c.lineTo(p.x, p.y);
          c.stroke();
        }
        render();
        return;
      }
      if (["select", "free-select"].includes(tool)) {
        movingSelection =
          !!selection &&
          p.x >= selection.x &&
          p.x <= selection.x + selection.width &&
          p.y >= selection.y &&
          p.y <= selection.y + selection.height;
        if (movingSelection) {
          record();
          selectionImage = c.getImageData(
            selection.x,
            selection.y,
            selection.width,
            selection.height,
          );
          c.fillStyle = background;
          c.fillRect(
            selection.x,
            selection.y,
            selection.width,
            selection.height,
          );
          base = c.getImageData(0, 0, bitmap.width, bitmap.height);
          start = { ...p, originalX: selection.x, originalY: selection.y };
        } else {
          selection = null;
          base = null;
        }
        drawing = true;
        stage.setPointerCapture(e.pointerId);
        return;
      }
      record();
      base = c.getImageData(0, 0, bitmap.width, bitmap.height);
      drawing = true;
      stage.setPointerCapture(e.pointerId);
      if (["pencil", "brush", "eraser"].includes(tool)) drawLine(p, p);
      if (tool === "airbrush") spray(p);
      render();
    }),
  );
  stage.addEventListener("pointermove", (e) => {
    const p = pos(e);
    status.children[0].textContent = `${Math.round(p.x)}, ${Math.round(p.y)} px`;
    if (!drawing) return;
    if (["select", "free-select"].includes(tool)) {
      if (movingSelection) {
        c.putImageData(base, 0, 0);
        selection.x = Math.round(start.originalX + p.x - start.x);
        selection.y = Math.round(start.originalY + p.y - start.y);
        c.putImageData(selectionImage, selection.x, selection.y);
      } else
        selection = {
          x: Math.floor(Math.min(start.x, p.x)),
          y: Math.floor(Math.min(start.y, p.y)),
          width: Math.max(1, Math.floor(Math.abs(p.x - start.x))),
          height: Math.max(1, Math.floor(Math.abs(p.y - start.y))),
        };
    } else if (["pencil", "brush", "eraser"].includes(tool)) drawLine(last, p);
    else if (tool === "airbrush") spray(p);
    else shape(start, p, e.shiftKey);
    last = p;
    render();
  });
  const stop = () => {
    if (!drawing) return;
    drawing = false;
    if (!["select", "free-select"].includes(tool) || movingSelection)
      setDirty();
    render();
  };
  stage.addEventListener("pointerup", stop);
  stage.addEventListener("pointercancel", stop);
  stage.addEventListener("dblclick", () => {
    if (tool === "polygon" && polygon.length > 2) {
      c.putImageData(base, 0, 0);
      c.beginPath();
      c.moveTo(polygon[0].x, polygon[0].y);
      for (const p of polygon.slice(1)) c.lineTo(p.x, p.y);
      c.closePath();
      c.fillStyle = fillMode === "solid" ? color : background;
      c.strokeStyle = color;
      c.lineWidth = lineWidth;
      if (fillMode !== "outline") c.fill();
      if (fillMode !== "solid") c.stroke();
      polygon = [];
      setDirty();
      render();
    }
  });
  const loadImage = async (p) => {
    const source = ctx.fs.readFile(p);
    if (!source.startsWith("data:image/"))
      throw new Error(
        "Paint can open imported PNG, JPEG, GIF, BMP, and WebP images.",
      );
    const image = new Image();
    image.src = source;
    await image.decode();
    if (image.width > 4096 || image.height > 4096)
      throw new Error(
        "This image exceeds the 4096 × 4096 pixel editing limit.",
      );
    bitmap.width = image.width;
    bitmap.height = image.height;
    c.drawImage(image, 0, 0);
    surface.resize(image.width, image.height);
    file = p;
    dirty = false;
    undo.length = redo.length = 0;
    w.setTitle(basename(file) + " - Paint");
    render();
  };
  const save = async (as = false) => {
    let target = file;
    if (!target || as)
      target = await ctx.dialogs.file({
        mode: "save",
        name: target
          ? basename(target).replace(/\.[^.]+$/, ".png")
          : "untitled.png",
        normalizeName: (name) =>
          extension(name) ? name.replace(/\.[^.]+$/, ".png") : name + ".png",
      });
    if (!target) return false;
    if (!extension(target)) target += ".png";
    if (extension(target) !== "png")
      target = target.replace(/\.[^.]+$/, ".png");
    const snapshot = bitmap.toDataURL("image/png"),
      revision = editRevision;
    await ctx.fs.writeFile(target, snapshot, { mime: "image/png" });
    file = target;
    dirty = editRevision !== revision;
    w.setTitle((dirty ? "*" : "") + basename(file) + " - Paint");
    return true;
  };
  const canDiscard = async () => {
    if (polygon.length) {
      polygon = [];
      setDirty();
    }
    if (!dirty) return true;
    const answer = await ctx.dialogs.message(
      "Save changes to " + (file ? basename(file) : "untitled") + "?",
      { title: "Paint", buttons: ["Yes", "No", "Cancel"] },
    );
    return answer === "Yes" ? (await save()) && !dirty : answer === "No";
  };
  const attributes = () => {
    const d = ctx.wm.create({
        title: "Attributes",
        width: 340,
        height: 235,
        dialog: true,
        resizable: false,
        minimizable: false,
        maximizable: false,
        appId: "attributes",
      }),
      ww = el("input", {
        type: "number",
        min: 1,
        max: 4096,
        value: bitmap.width,
        "aria-label": "Width",
      }),
      hh = el("input", {
        type: "number",
        min: 1,
        max: 4096,
        value: bitmap.height,
        "aria-label": "Height",
      });
    d.setContent(
      el(
        "div",
        { class: "dialog-padding" },
        field("Width:", ww),
        field("Height:", hh),
        el("p", { text: "Units: Pixels" }),
        el("p", { text: "Colors: Colors" }),
      ),
      el(
        "div",
        { class: "dialog-buttons" },
        button("OK", () => {
          const width = Number(ww.value),
            height = Number(hh.value);
          if (
            !Number.isInteger(width) ||
            !Number.isInteger(height) ||
            width < 1 ||
            height < 1 ||
            width > 4096 ||
            height > 4096
          )
            throw new Error("Enter dimensions between 1 and 4096 pixels.");
          record();
          const temp = document.createElement("canvas");
          temp.width = bitmap.width;
          temp.height = bitmap.height;
          temp.getContext("2d").drawImage(bitmap, 0, 0);
          bitmap.width = width;
          bitmap.height = height;
          c.fillStyle = background;
          c.fillRect(0, 0, width, height);
          c.drawImage(temp, 0, 0);
          surface.resize(width, height);
          setDirty();
          render();
          d.close();
        }),
        button("Cancel", () => d.close()),
      ),
    );
  };
  const transform = (mode) => {
    record();
    const temp = document.createElement("canvas");
    temp.width = bitmap.width;
    temp.height = bitmap.height;
    temp.getContext("2d").drawImage(bitmap, 0, 0);
    if (mode === "rotate") {
      bitmap.width = temp.height;
      bitmap.height = temp.width;
      c.save();
      c.translate(bitmap.width, 0);
      c.rotate(Math.PI / 2);
      c.drawImage(temp, 0, 0);
      c.restore();
      surface.resize(bitmap.width, bitmap.height);
    } else {
      c.clearRect(0, 0, bitmap.width, bitmap.height);
      c.save();
      c.translate(
        mode === "horizontal" ? bitmap.width : 0,
        mode === "vertical" ? bitmap.height : 0,
      );
      c.scale(mode === "horizontal" ? -1 : 1, mode === "vertical" ? -1 : 1);
      c.drawImage(temp, 0, 0);
      c.restore();
    }
    setDirty();
    render();
  };
  const copy = async (cut = false) => {
    const target = document.createElement("canvas");
    const s = selection || {
      x: 0,
      y: 0,
      width: bitmap.width,
      height: bitmap.height,
    };
    target.width = s.width;
    target.height = s.height;
    target
      .getContext("2d")
      .drawImage(bitmap, s.x, s.y, s.width, s.height, 0, 0, s.width, s.height);
    ctx.paintClipboard = target.toDataURL();
    await ctx.clipboard.setText(ctx.paintClipboard);
    if (cut) {
      record();
      c.fillStyle = background;
      c.fillRect(s.x, s.y, s.width, s.height);
      setDirty();
      render();
    }
  };
  const paste = async () => {
    const data = await ctx.clipboard.getText();
    if (!data?.startsWith("data:image/")) return;
    const img = new Image();
    img.src = data;
    await img.decode();
    record();
    c.drawImage(img, 0, 0);
    selection = { x: 0, y: 0, width: img.width, height: img.height };
    tool = "select";
    setDirty();
    render();
  };
  w.setMenu({
    File: [
      {
        label: "New",
        shortcut: "Ctrl+N",
        action: async () => {
          if (await canDiscard()) {
            record();
            c.fillStyle = "#fff";
            c.fillRect(0, 0, bitmap.width, bitmap.height);
            file = null;
            dirty = false;
            w.setTitle("untitled - Paint");
            render();
          }
        },
      },
      {
        label: "Open...",
        shortcut: "Ctrl+O",
        action: async () => {
          if (!(await canDiscard())) return;
          const p = await ctx.dialogs.file({
            filter: (n) => n.mime?.startsWith("image/"),
          });
          if (p) await loadImage(p);
        },
      },
      { label: "Save", shortcut: "Ctrl+S", action: () => save() },
      { label: "Save As...", action: () => save(true) },
      separator(),
      {
        label: "Download PNG",
        action: () =>
          downloadFile(
            file ? basename(file) : "untitled.png",
            bitmap.toDataURL("image/png"),
            "image/png",
          ),
      },
      { label: "Print...", action: () => ctx.printImage(bitmap.toDataURL()) },
      separator(),
      { label: "Exit", action: () => w.close() },
    ],
    Edit: () => [
      {
        label: "Undo",
        shortcut: "Ctrl+Z",
        disabled: !undo.length,
        action: undoAction,
      },
      {
        label: "Repeat",
        shortcut: "Ctrl+Y",
        disabled: !redo.length,
        action: redoAction,
      },
      separator(),
      { label: "Cut", shortcut: "Ctrl+X", action: () => copy(true) },
      { label: "Copy", shortcut: "Ctrl+C", action: () => copy() },
      { label: "Paste", shortcut: "Ctrl+V", action: paste },
      {
        label: "Clear Selection",
        shortcut: "Del",
        action: () => {
          record();
          const s = selection || {
            x: 0,
            y: 0,
            width: bitmap.width,
            height: bitmap.height,
          };
          c.fillStyle = background;
          c.fillRect(s.x, s.y, s.width, s.height);
          setDirty();
          render();
        },
      },
      {
        label: "Select All",
        shortcut: "Ctrl+A",
        action: () => {
          selection = {
            x: 0,
            y: 0,
            width: bitmap.width,
            height: bitmap.height,
          };
          tool = "select";
          render();
        },
      },
    ],
    View: () => [
      {
        label: "Tool Box",
        checked: !toolbox.hidden,
        action: () => (toolbox.hidden = !toolbox.hidden),
      },
      {
        label: "Color Box",
        checked: !palette.hidden,
        action: () => (palette.hidden = !palette.hidden),
      },
      {
        label: "Zoom",
        submenu: [1, 2, 4, 8].map((n) => ({
          label: n * 100 + "%",
          checked: zoom === n,
          action: () => {
            zoom = n;
            render();
          },
        })),
      },
    ],
    Image: [
      { label: "Flip Horizontal", action: () => transform("horizontal") },
      { label: "Flip Vertical", action: () => transform("vertical") },
      { label: "Rotate 90°", action: () => transform("rotate") },
      {
        label: "Invert Colors",
        action: () => {
          record();
          const d = c.getImageData(0, 0, bitmap.width, bitmap.height);
          for (let i = 0; i < d.data.length; i += 4) {
            d.data[i] = 255 - d.data[i];
            d.data[i + 1] = 255 - d.data[i + 1];
            d.data[i + 2] = 255 - d.data[i + 2];
          }
          c.putImageData(d, 0, 0);
          setDirty();
          render();
        },
      },
      { label: "Attributes...", shortcut: "Ctrl+E", action: attributes },
      {
        label: "Clear Image",
        action: () => {
          record();
          c.fillStyle = background;
          c.fillRect(0, 0, bitmap.width, bitmap.height);
          setDirty();
          render();
        },
      },
      {
        label: "Crop to Selection",
        action: () => {
          if (!selection) return;
          record();
          const d = c.getImageData(
            selection.x,
            selection.y,
            selection.width,
            selection.height,
          );
          bitmap.width = selection.width;
          bitmap.height = selection.height;
          c.putImageData(d, 0, 0);
          surface.resize(bitmap.width, bitmap.height);
          selection = null;
          setDirty();
          render();
        },
      },
    ],
    Colors: [
      {
        label: "Edit Colors...",
        action: () => {
          const input = el("input", {
            type: "color",
            value: color,
            onchange: (e) => {
              color = e.target.value;
              foreground.style.background = color;
            },
          });
          input.click();
        },
      },
    ],
    Help: [
      {
        label: "Help Topics",
        action: () => ctx.launch("help", { topic: "paint" }),
      },
      {
        label: "About Paint",
        action: () =>
          ctx.dialogs.message(
            "Paint\n\nDrawing, image editing, and PNG documents.\nRendering: " +
              surface.backend,
            { title: "About Paint", icon: "paint" },
          ),
      },
    ],
  });
  w.setContent(
    el("div", { class: "paint-main" }, toolbox, workspace),
    palette,
    status,
  );
  w.onClose = canDiscard;
  w.addCleanup(() => surface.dispose());
  w.el.addEventListener(
    "keydown",
    safely(async (e) => {
      if (e.ctrlKey || e.metaKey) {
        const actions = {
          n: async () => {
            if (await canDiscard()) {
              record();
              c.fillStyle = "#fff";
              c.fillRect(0, 0, bitmap.width, bitmap.height);
              file = null;
              dirty = false;
              w.setTitle("untitled - Paint");
              render();
            }
          },
          o: async () => {
            if (await canDiscard()) {
              const p = await ctx.dialogs.file({
                filter: (n) => n.mime?.startsWith("image/"),
              });
              if (p) await loadImage(p);
            }
          },
          s: () => save(),
          z: undoAction,
          y: redoAction,
          c: () => copy(),
          x: () => copy(true),
          v: paste,
          e: attributes,
          a: () => {
            tool = "select";
            selection = {
              x: 0,
              y: 0,
              width: bitmap.width,
              height: bitmap.height,
            };
            render();
          },
        };
        if (actions[e.key.toLowerCase()]) {
          e.preventDefault();
          await actions[e.key.toLowerCase()]();
        }
      } else if (e.key === "Escape") {
        if (polygon.length && base) c.putImageData(base, 0, 0);
        polygon = [];
        selection = null;
        render();
      } else if (e.key === "Delete") {
        record();
        const s = selection || {
          x: 0,
          y: 0,
          width: bitmap.width,
          height: bitmap.height,
        };
        c.fillStyle = background;
        c.fillRect(s.x, s.y, s.width, s.height);
        setDirty();
        render();
      }
    }),
  );
  if (path) await loadImage(path);
  else render();
  w.bitmap = bitmap;
  w.renderer = surface;
  return w;
}
