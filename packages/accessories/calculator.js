import { el, button, field, separator } from "../ui/index.js";
import { CalculatorEngine } from "./calculator-engine.js";
export { CalculatorEngine } from "./calculator-engine.js";
export function openCalculator(ctx) {
  const w = ctx.wm.create({
      title: "Calculator",
      icon: "calculator",
      width: 270,
      height: 300,
      appId: "calculator",
      resizable: false,
      maximizable: false,
    }),
    engine = new CalculatorEngine();
  let scientific = false,
    degrees = true;
  const display = el("input", {
      class: "calculator-display",
      value: "0",
      readonly: true,
      "aria-label": "Calculator display",
    }),
    mem = el("div", { class: "calculator-memory inset", text: "" }),
    history = el("div", { class: "calculator-operation", text: "" });
  const press = (key) => {
    if (["sin", "cos", "tan"].includes(key)) engine.unary(key, degrees);
    else engine.key(key);
    display.value = engine.display;
    mem.textContent = engine.memory ? "M" : "";
    history.textContent = engine.operation
      ? `${engine.accumulator} ${engine.operation}`
      : "";
  };
  const pad = el("div", { class: "calculator-pad" }),
    sci = el("div", { class: "calculator-scientific" });
  for (const key of [
    "MC",
    "7",
    "8",
    "9",
    "÷",
    "√",
    "MR",
    "4",
    "5",
    "6",
    "×",
    "%",
    "MS",
    "1",
    "2",
    "3",
    "−",
    "1/x",
    "M+",
    "0",
    "±",
    ".",
    "+",
    "=",
  ])
    pad.append(
      button(key, () => press(key), {
        class: /^(M|[+−×÷=])/.test(key) ? "calc-red" : "calc-blue",
      }),
    );
  for (const key of [
    "sin",
    "cos",
    "tan",
    "ln",
    "log",
    "π",
    "x²",
    "x³",
    "xʸ",
    "n!",
    "Int",
    "Mod",
  ])
    sci.append(button(key, () => press(key), { class: "calc-blue" }));
  const unit = el(
    "div",
    { class: "calc-units" },
    el(
      "label",
      {},
      el("input", {
        type: "radio",
        name: "units" + w.id,
        checked: true,
        onchange: () => (degrees = true),
      }),
      "Degrees",
    ),
    el(
      "label",
      {},
      el("input", {
        type: "radio",
        name: "units" + w.id,
        onchange: () => (degrees = false),
      }),
      "Radians",
    ),
  );
  sci.prepend(unit);
  sci.hidden = true;
  const setScientific = (value) => {
    scientific = value;
    sci.hidden = !value;
    w.geometry.width = value ? 452 : 270;
    w.geometry.height = value ? 320 : 300;
    ctx.wm.applyGeometry(w);
  };
  w.setMenu({
    Edit: [
      {
        label: "Copy",
        shortcut: "Ctrl+C",
        action: () => ctx.clipboard.setText(engine.display),
      },
      {
        label: "Paste",
        shortcut: "Ctrl+V",
        action: async () => {
          const t = (await ctx.clipboard.getText()).trim();
          if (/^-?\d+(\.\d+)?(e[+-]?\d+)?$/i.test(t)) {
            engine.display = t;
            engine.fresh = true;
            engine.operandReady = true;
            display.value = t;
          }
        },
      },
    ],
    View: () => [
      {
        label: "Standard",
        checked: !scientific,
        action: () => setScientific(false),
      },
      {
        label: "Scientific",
        checked: scientific,
        action: () => setScientific(true),
      },
    ],
    Help: [
      {
        label: "Help Topics",
        action: () => ctx.launch("help", { topic: "calculator" }),
      },
      {
        label: "About Calculator",
        action: () =>
          ctx.dialogs.message(
            "Calculator\nStandard and scientific arithmetic.\n\nUse your keyboard or the buttons. Memory is shared between both views.",
            { title: "About Calculator", icon: "calculator" },
          ),
      },
    ],
  });
  w.setContent(
    el(
      "div",
      { class: "calculator" },
      display,
      history,
      el(
        "div",
        { class: "calc-top" },
        mem,
        button("Backspace", () => press("Backspace"), { class: "calc-red" }),
        button("CE", () => press("CE"), { class: "calc-red" }),
        button("C", () => press("C"), { class: "calc-red" }),
      ),
      el("div", { class: "calc-keyboards" }, sci, pad),
    ),
  );
  w.el.addEventListener("keydown", async (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key.toLowerCase() === "c") {
        e.preventDefault();
        await ctx.clipboard.setText(engine.display);
      }
      if (e.key.toLowerCase() === "v") {
        e.preventDefault();
        const value = (await ctx.clipboard.getText()).trim();
        if (/^-?\d+(\.\d+)?(e[+-]?\d+)?$/i.test(value)) {
          engine.display = value;
          engine.fresh = true;
          engine.operandReady = true;
          display.value = value;
        }
      }
      return;
    }
    if (
      /^[0-9.+\-*/%=]$/.test(e.key) ||
      ["Enter", "Backspace", "Escape"].includes(e.key)
    ) {
      e.preventDefault();
      press(e.key);
    }
  });
  w.el.focus();
  w.engine = engine;
  return w;
}
