import { el, button, separator } from "../ui/index.js";
import { Minefield } from "./minefield.js";
export { Minefield } from "./minefield.js";
export function openMinesweeper(ctx) {
  const w = ctx.wm.create({
    title: "Minesweeper",
    icon: "minesweeper",
    width: 196,
    height: 280,
    appId: "minesweeper",
    resizable: false,
    maximizable: false,
  });
  let game,
    level = "Beginner",
    questions = true,
    startTime = 0,
    seconds = 0,
    timer = null,
    lastWon = false;
  const count = el("div", {
      class: "mine-led",
      text: "010",
      "aria-label": "Mines remaining",
    }),
    time = el("div", {
      class: "mine-led",
      text: "000",
      "aria-label": "Elapsed seconds",
    }),
    face = button("", () => reset(), {
      class: "mine-face",
      "aria-label": "New game",
      title: "New game",
    }),
    board = el("div", { class: "mine-board inset" }),
    root = el(
      "div",
      { class: "minesweeper" },
      el("div", { class: "mine-score inset" }, count, face, time),
      board,
    );
  function reset(width, height, mines) {
    clearInterval(timer);
    seconds = 0;
    startTime = 0;
    lastWon = false;
    const config =
      level === "Intermediate"
        ? [16, 16, 40]
        : level === "Expert"
          ? [30, 16, 99]
          : [9, 9, 10];
    game = new Minefield(
      width || config[0],
      height || config[1],
      mines || config[2],
    );
    board.style.gridTemplateColumns = `repeat(${game.width},16px)`;
    w.geometry.width = Math.min(innerWidth - 8, game.width * 16 + 26);
    w.geometry.height = game.height * 16 + 109;
    ctx.wm.applyGeometry(w);
    render();
  }
  const start = () => {
    if (!startTime) {
      startTime = Date.now();
      timer = setInterval(() => {
        if (!game.over) {
          seconds = Math.min(999, Math.floor((Date.now() - startTime) / 1000));
          time.textContent = String(seconds).padStart(3, "0");
        }
      }, 250);
    }
  };
  function render() {
    board.replaceChildren();
    count.textContent = String(game.mineCount - game.flags).padStart(3, "0");
    time.textContent = String(seconds).padStart(3, "0");
    face.className =
      "mine-face " + (game.over ? (game.won ? "won" : "lost") : "");
    face.replaceChildren(
      el(
        "span",
        { class: "smiley" },
        el("i", { class: "eye left" }),
        el("i", { class: "eye right" }),
        el("i", { class: "mouth" }),
      ),
    );
    game.cells.forEach((cell, i) => {
      const visible = cell.open || (game.over && cell.mine),
        b = button(
          "",
          () => {
            if (game.over) return;
            start();
            game.reveal(i);
            render();
          },
          {
            class:
              "mine-cell" +
              (visible ? " revealed" : "") +
              (cell.exploded ? " exploded" : "") +
              (cell.count && cell.open ? " count-" + cell.count : ""),
            "aria-label": `Row ${Math.floor(i / game.width) + 1}, column ${(i % game.width) + 1}${cell.flag ? ", flagged" : cell.open ? ", " + (cell.mine ? "mine" : cell.count + " adjacent mines") : ""}`,
          },
        );
      if (cell.flag) b.append(el("span", { class: "mine-flag" }));
      else if (visible && cell.mine)
        b.append(el("span", { class: "mine-bomb" }));
      else if (cell.open && cell.count) b.textContent = cell.count;
      else if (cell.question) b.textContent = "?";
      if (game.over && cell.flag && !cell.mine) b.textContent = "×";
      b.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        game.flag(i, questions);
        render();
      });
      b.addEventListener("pointerdown", (e) => {
        if (e.button === 1) {
          e.preventDefault();
          game.chord(i);
          render();
        }
      });
      b.addEventListener("dblclick", () => {
        game.chord(i);
        render();
      });
      let held;
      const cancel = () => clearTimeout(held);
      b.addEventListener(
        "touchstart",
        () => {
          held = setTimeout(() => {
            game.flag(i, questions);
            render();
          }, 450);
        },
        { passive: true },
      );
      b.addEventListener("touchend", cancel);
      b.addEventListener("touchmove", cancel);
      board.append(b);
    });
    if (game.over) {
      clearInterval(timer);
      if (game.won && !lastWon) {
        lastWon = true;
        ctx.sound.play("win");
        const best = ctx.settings.get("minesBest") || {};
        if (!best[level] || seconds < best[level]) {
          best[level] = seconds;
          ctx.settings.set("minesBest", best);
        }
        ctx.bus.emit("game:win", { game: "Minesweeper", seconds });
      }
    }
  }
  w.setMenu({
    Game: () => [
      { label: "New", shortcut: "F2", action: () => reset() },
      separator(),
      ...["Beginner", "Intermediate", "Expert"].map((l) => ({
        label: l,
        checked: level === l,
        action: () => {
          level = l;
          reset();
        },
      })),
      {
        label: "Custom...",
        action: () => {
          const d = ctx.wm.create({
            title: "Custom Field",
            width: 270,
            height: 200,
            dialog: true,
            resizable: false,
            minimizable: false,
            maximizable: false,
            appId: "minecustom",
          });
          const h = el("input", {
              type: "number",
              min: 9,
              max: 24,
              value: game.height,
              "aria-label": "Height",
            }),
            ww = el("input", {
              type: "number",
              min: 9,
              max: 30,
              value: game.width,
              "aria-label": "Width",
            }),
            m = el("input", {
              type: "number",
              min: 10,
              value: game.mineCount,
              "aria-label": "Mines",
            });
          d.setContent(
            el(
              "div",
              { class: "dialog-padding" },
              el("label", { class: "field" }, "Height:", h),
              el("label", { class: "field" }, "Width:", ww),
              el("label", { class: "field" }, "Mines:", m),
            ),
            el(
              "div",
              { class: "dialog-buttons" },
              button("OK", () => {
                level = "Custom";
                reset(
                  Math.max(9, Math.min(30, +ww.value)),
                  Math.max(9, Math.min(24, +h.value)),
                  Math.max(10, +m.value),
                );
                d.close();
              }),
              button("Cancel", () => d.close()),
            ),
          );
        },
      },
      separator(),
      {
        label: "Marks (?)",
        checked: questions,
        action: () => (questions = !questions),
      },
      {
        label: "Best Times...",
        action: () => {
          const best = ctx.settings.get("minesBest") || {};
          ctx.dialogs.message(
            ["Beginner", "Intermediate", "Expert"]
              .map((l) => `${l}: ${best[l] ?? 999} seconds`)
              .join("\n"),
            { title: "Fastest Mine Sweepers", icon: "minesweeper" },
          );
        },
      },
      separator(),
      { label: "Exit", action: () => w.close() },
    ],
    Help: [
      {
        label: "How to Play",
        action: () =>
          ctx.dialogs.message(
            "Reveal every square without uncovering a mine. Numbers show how many mines touch that square.\n\nLeft-click to uncover. Right-click (or touch and hold) to flag a mine. Double-click a revealed number after flagging its adjacent mines.\n\nThe first click is always safe.",
            { title: "Minesweeper Help", icon: "minesweeper" },
          ),
      },
      {
        label: "About Minesweeper",
        action: () =>
          ctx.dialogs.message("Minesweeper\nWindows 2000 Games", {
            title: "About Minesweeper",
            icon: "minesweeper",
          }),
      },
    ],
  });
  w.setContent(root);
  w.el.addEventListener("keydown", (e) => {
    if (e.key === "F2") {
      e.preventDefault();
      reset();
    }
  });
  w.addCleanup(() => clearInterval(timer));
  reset();
  w.game = () => game;
  return w;
}
