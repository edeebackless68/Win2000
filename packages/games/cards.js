import { el, button, statusBar, separator } from "../ui/index.js";
import {
  suits,
  cardColor,
  cardRank,
  createDeck,
  canStack,
  canFoundation,
} from "./card-engine.js";
export {
  cardColor,
  createDeck,
  canStack,
  canFoundation,
} from "./card-engine.js";
function cardNode(card, back = 0) {
  if (!card.up)
    return el(
      "div",
      {
        class: "playing-card card-back back-" + back,
        "aria-label": "Face down card",
      },
      el("div", { class: "card-back-pattern" }),
    );
  const text = cardRank(card),
    node = el(
      "div",
      {
        class: "playing-card " + cardColor(card),
        "aria-label":
          text + " of " + ["Spades", "Hearts", "Clubs", "Diamonds"][card.suit],
      },
      el(
        "span",
        { class: "card-corner" },
        text,
        el("b", { text: suits[card.suit] }),
      ),
      el("span", {
        class: "card-center",
        text:
          card.rank > 10
            ? card.rank === 11
              ? "♟"
              : card.rank === 12
                ? "♛"
                : "♚"
            : suits[card.suit],
      }),
      el(
        "span",
        { class: "card-corner bottom" },
        text,
        el("b", { text: suits[card.suit] }),
      ),
    );
  return node;
}
export function openSolitaire(ctx, { freecell = false } = {}) {
  const name = freecell ? "FreeCell" : "Solitaire",
    w = ctx.wm.create({
      title: name,
      icon: freecell ? "freecell" : "solitaire",
      width: freecell ? 720 : 660,
      height: 530,
      appId: freecell ? "freecell" : "solitaire",
    });
  let stock = [],
    waste = [],
    tableau = [],
    foundations = [[], [], [], []],
    cells = [null, null, null, null],
    selected = null,
    score = 0,
    moves = 0,
    drawCount = 3,
    back = 0,
    gameNumber = 1,
    started = Date.now(),
    won = false,
    undo = [];
  const board = el("div", {
      class: "solitaire-board" + (freecell ? " freecell-board" : ""),
      "aria-label": name + " playing table",
    }),
    status = statusBar("Score: 0", "Time: 0");
  const snapshot = () =>
    structuredClone({
      stock,
      waste,
      tableau,
      foundations,
      cells,
      score,
      moves,
      won,
    });
  const record = () => {
    undo.push(snapshot());
    if (undo.length > 200) undo.shift();
  };
  const reset = (number = null) => {
    gameNumber = number || Math.floor(Math.random() * 100000) + 1;
    let seed = gameNumber;
    const random = () => {
      seed = (Math.imul(seed, 214013) + 2531011) >>> 0;
      return ((seed >>> 16) & 32767) / 32768;
    };
    const deck = createDeck(freecell ? random : Math.random);
    stock = [];
    waste = [];
    tableau = [];
    foundations = [[], [], [], []];
    cells = [null, null, null, null];
    selected = null;
    score = moves = 0;
    won = false;
    undo = [];
    started = Date.now();
    if (freecell) {
      tableau = Array.from({ length: 8 }, () => []);
      deck.forEach((c, i) => {
        c.up = true;
        tableau[i % 8].push(c);
      });
      w.setTitle(name + " — Game #" + gameNumber);
    } else {
      for (let i = 0; i < 7; i++) {
        const pile = deck.splice(0, i + 1);
        pile.at(-1).up = true;
        tableau.push(pile);
      }
      stock = deck;
    }
    render();
  };
  const sourceCards = (s) =>
    s.kind === "tableau"
      ? tableau[s.index].slice(s.cardIndex)
      : s.kind === "waste"
        ? [waste.at(-1)]
        : s.kind === "cell"
          ? [cells[s.index]]
          : s.kind === "foundation"
            ? [foundations[s.index].at(-1)]
            : [];
  const validRun = (cards) =>
    cards.every((c, i) => i === 0 || (c.up && canStack(c, cards[i - 1])));
  const take = (s) => {
    let cards;
    if (s.kind === "tableau") {
      cards = tableau[s.index].splice(s.cardIndex);
      const top = tableau[s.index].at(-1);
      if (top && !top.up) {
        top.up = true;
        score += 5;
      }
    } else if (s.kind === "waste") cards = [waste.pop()];
    else if (s.kind === "cell") {
      cards = [cells[s.index]];
      cells[s.index] = null;
    } else cards = [foundations[s.index].pop()];
    return cards;
  };
  const move = (source, target) => {
    if (!source || won) return false;
    if (source.kind === target.kind && source.index === target.index)
      return false;
    const cards = sourceCards(source);
    if (!cards.length || !cards[0]?.up || !validRun(cards)) return false;
    if (target.kind === "foundation") {
      if (
        cards.length !== 1 ||
        !canFoundation(cards[0], foundations[target.index])
      )
        return false;
      record();
      foundations[target.index].push(...take(source));
      score += 10;
    } else if (target.kind === "cell") {
      if (cards.length !== 1 || cells[target.index]) return false;
      record();
      cells[target.index] = take(source)[0];
    } else if (target.kind === "tableau") {
      const dest = tableau[target.index],
        top = dest.at(-1);
      if (top ? !canStack(cards[0], top) : !freecell && cards[0].rank !== 13)
        return false;
      if (freecell) {
        const emptyCells = cells.filter((c) => !c).length,
          emptyColumns = tableau.filter(
            (p, i) => p.length === 0 && i !== target.index,
          ).length,
          capacity = (emptyCells + 1) * 2 ** emptyColumns;
        if (cards.length > capacity) return false;
      }
      record();
      tableau[target.index].push(...take(source));
      if (source.kind === "waste") score += 5;
    } else return false;
    moves++;
    selected = null;
    won = foundations.every((p) => p.length === 13);
    render();
    if (won) {
      ctx.sound.play("win");
      ctx.dialogs.message(
        `Congratulations, you won!\n\n${moves} moves · ${Math.floor((Date.now() - started) / 1000)} seconds`,
        { title: name, icon: "solitaire" },
      );
    }
    return true;
  };
  const autoMove = (source) => {
    const cards = sourceCards(source);
    if (cards.length !== 1) return false;
    const index = foundations.findIndex((p) => canFoundation(cards[0], p));
    return index >= 0 ? move(source, { kind: "foundation", index }) : false;
  };
  const selectOrMove = (source) => {
    if (selected && move(selected, { kind: source.kind, index: source.index }))
      return;
    const cards = sourceCards(source);
    if (!cards[0]?.up || !validRun(cards)) {
      selected = null;
    } else selected = source;
    render();
  };
  const autoFinish = () => {
    let progressed = true;
    while (progressed && !won) {
      progressed = false;
      const sources = [
        ...tableau
          .map((p, index) => ({
            kind: "tableau",
            index,
            cardIndex: p.length - 1,
          }))
          .filter((s) => s.cardIndex >= 0),
        ...cells
          .map((c, index) => (c ? { kind: "cell", index } : null))
          .filter(Boolean),
        ...(waste.length ? [{ kind: "waste", index: 0 }] : []),
      ];
      for (const source of sources) {
        if (autoMove(source)) {
          progressed = true;
          break;
        }
      }
    }
  };
  const bind = (node, source, { target = false } = {}) => {
    node.addEventListener("click", (e) => {
      e.stopPropagation();
      if (target && selected) {
        move(selected, source);
        return;
      }
      selectOrMove(source);
    });
    node.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      autoMove(source);
    });
    node.draggable = true;
    node.addEventListener("dragstart", (e) => {
      selected = source;
      e.dataTransfer.setData(
        "application/x-win2k-card",
        JSON.stringify({ windowId: w.id, source }),
      );
      e.dataTransfer.effectAllowed = "move";
    });
    node.addEventListener("dragover", (e) => {
      e.preventDefault();
    });
    node.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        const data = JSON.parse(
          e.dataTransfer.getData("application/x-win2k-card"),
        );
        if (data.windowId === w.id) move(data.source, source);
      } catch {}
    });
  };
  const slot = (label, target) => {
    const n = el(
      "div",
      { class: "card-slot", "aria-label": label, role: "button", tabindex: 0 },
      label,
    );
    n.addEventListener("click", () => {
      if (selected) move(selected, target);
    });
    n.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && selected) move(selected, target);
    });
    n.addEventListener("dragover", (e) => e.preventDefault());
    n.addEventListener("drop", (e) => {
      e.preventDefault();
      if (selected) move(selected, target);
    });
    return n;
  };
  function render() {
    board.replaceChildren();
    const columns = freecell ? 8 : 7;
    board.style.setProperty("--card-columns", columns);
    const top = el("div", { class: "card-top" });
    if (freecell) {
      for (let i = 0; i < 4; i++) {
        const place = slot("", { kind: "cell", index: i });
        if (cells[i]) {
          const n = cardNode(cells[i], back);
          if (selected?.kind === "cell" && selected.index === i)
            n.classList.add("card-selected");
          bind(n, { kind: "cell", index: i });
          place.append(n);
        }
        top.append(place);
      }
    } else {
      const stockNode = slot(stock.length ? "" : "↻", {});
      stockNode.classList.add("stock");
      if (stock.length) stockNode.append(cardNode(stock.at(-1), back));
      stockNode.addEventListener("click", () => {
        if (won) return;
        record();
        if (stock.length) {
          for (let i = 0; i < drawCount && stock.length; i++) {
            const c = stock.pop();
            c.up = true;
            waste.push(c);
          }
        } else if (waste.length) {
          stock = waste.reverse().map((c) => ({ ...c, up: false }));
          waste = [];
          score = Math.max(0, score - 20);
        }
        moves++;
        selected = null;
        render();
      });
      stockNode.setAttribute("aria-label", "Draw cards");
      top.append(stockNode);
      const wasteSlot = el("div", { class: "waste-slot" });
      waste.slice(-drawCount).forEach((c, i, all) => {
        const n = cardNode(c, back);
        n.style.left = i * 16 + "px";
        if (i === all.length - 1) {
          bind(n, { kind: "waste", index: 0 });
          if (selected?.kind === "waste") n.classList.add("card-selected");
        }
        wasteSlot.append(n);
      });
      top.append(wasteSlot, el("div", { class: "card-top-spacer" }));
    }
    for (let i = 0; i < 4; i++) {
      const place = slot("A", { kind: "foundation", index: i });
      if (foundations[i].length) {
        const n = cardNode(foundations[i].at(-1), back);
        bind(n, { kind: "foundation", index: i }, { target: true });
        place.append(n);
      }
      top.append(place);
    }
    board.append(top);
    const piles = el("div", { class: "card-tableau" });
    tableau.forEach((pile, index) => {
      const column = el("div", {
          class: "card-column",
          "aria-label": "Tableau column " + (index + 1),
        }),
        empty = slot("", { kind: "tableau", index });
      column.append(empty);
      let offset = 0;
      pile.forEach((card, cardIndex) => {
        const n = cardNode(card, back);
        n.style.top = offset + "px";
        offset += card.up ? 23 : 13;
        if (
          selected?.kind === "tableau" &&
          selected.index === index &&
          cardIndex >= selected.cardIndex
        )
          n.classList.add("card-selected");
        bind(n, { kind: "tableau", index, cardIndex });
        column.append(n);
      });
      column.style.minHeight = offset + 90 + "px";
      piles.append(column);
    });
    board.append(piles);
    status.children[0].textContent = freecell
      ? "Moves: " + moves
      : "Score: " + score;
    status.children[1].textContent =
      "Time: " + Math.floor((Date.now() - started) / 1000);
  }
  const undoMove = () => {
    if (!undo.length) return;
    ({ stock, waste, tableau, foundations, cells, score, moves, won } =
      undo.pop());
    selected = null;
    render();
  };
  const hint = () => {
    const sources = tableau.flatMap((p, index) =>
      p
        .map((c, cardIndex) => ({ kind: "tableau", index, cardIndex }))
        .filter((s) => p[s.cardIndex].up && validRun(p.slice(s.cardIndex))),
    );
    if (waste.length) sources.push({ kind: "waste", index: 0 });
    cells.forEach((c, index) => {
      if (c) sources.push({ kind: "cell", index });
    });
    for (const s of sources) {
      const cards = sourceCards(s);
      if (
        cards.length === 1 &&
        foundations.some((p) => canFoundation(cards[0], p))
      ) {
        selected = s;
        render();
        return ctx.dialogs.message(
          `Move ${cardRank(cards[0])}${suits[cards[0].suit]} to a foundation.`,
          { title: "Hint", icon: "solitaire" },
        );
      }
      for (let i = 0; i < tableau.length; i++) {
        if (s.kind === "tableau" && s.index === i) continue;
        const t = tableau[i].at(-1);
        if (t ? canStack(cards[0], t) : freecell || cards[0].rank === 13) {
          selected = s;
          render();
          return ctx.dialogs.message(
            `Move ${cardRank(cards[0])}${suits[cards[0].suit]} to column ${i + 1}.`,
            { title: "Hint", icon: "solitaire" },
          );
        }
      }
    }
    ctx.dialogs.message(
      freecell
        ? "Try moving a card into an empty free cell."
        : "Draw another card from the stock.",
      { title: "Hint", icon: "solitaire" },
    );
  };
  w.setMenu({
    Game: () => [
      {
        label: freecell ? "New Game" : "Deal",
        shortcut: "F2",
        action: () => reset(),
      },
      ...(freecell
        ? [
            {
              label: "Select Game...",
              action: async () => {
                const n = await ctx.dialogs.prompt(
                  "Enter a game number (1–1000000):",
                  String(gameNumber),
                  { title: "Game Number" },
                );
                if (n) reset(Math.max(1, Math.min(1000000, parseInt(n) || 1)));
              },
            },
          ]
        : [
            {
              label: "Draw One",
              checked: drawCount === 1,
              action: () => {
                drawCount = 1;
                reset();
              },
            },
            {
              label: "Draw Three",
              checked: drawCount === 3,
              action: () => {
                drawCount = 3;
                reset();
              },
            },
          ]),
      separator(),
      {
        label: "Undo",
        shortcut: "Ctrl+Z",
        disabled: !undo.length,
        action: undoMove,
      },
      { label: "Hint", shortcut: "H", action: hint },
      { label: "Auto Move to Foundations", action: autoFinish },
      {
        label: "Card Back",
        submenu: [0, 1, 2].map((i) => ({
          label: ["Blue Weave", "Red Weave", "Crosshatch"][i],
          checked: back === i,
          action: () => {
            back = i;
            render();
          },
        })),
      },
      separator(),
      { label: "Exit", action: () => w.close() },
    ],
    Help: [
      {
        label: "How to Play",
        action: () =>
          ctx.dialogs.message(
            freecell
              ? "Build all four foundations from Ace to King by suit.\n\nUse the four free cells to temporarily store one card each. Arrange tableau columns in descending order with alternating colors. An empty column accepts any card.\n\nClick a card, then its destination. You can also drag cards, or double-click a card to move it to a foundation. Movable runs are limited by empty free cells and columns."
              : "Build all four foundations from Ace to King by suit. Arrange tableau columns in descending order, alternating red and black. Only a King can fill an empty column.\n\nClick the stock to draw. Click a card, then its destination, or drag it. Double-click to move to a foundation.\n\nF2 deals a new game. Ctrl+Z undoes a move.",
            { title: name + " Help", icon: "solitaire" },
          ),
      },
      {
        label: "About " + name,
        action: () =>
          ctx.dialogs.message(
            name +
              "\nWindows 2000 Games\n\n" +
              (freecell
                ? "Numbered deals are deterministic in this implementation."
                : "Klondike rules, draw one or three, scoring, undo, and hints."),
            { title: "About " + name, icon: "solitaire" },
          ),
      },
    ],
  });
  w.setContent(board, status);
  const interval = setInterval(() => {
    if (!won)
      status.children[1].textContent =
        "Time: " + Math.floor((Date.now() - started) / 1000);
  }, 1000);
  w.addCleanup(() => clearInterval(interval));
  w.el.addEventListener("keydown", (e) => {
    if (e.key === "F2") {
      e.preventDefault();
      reset();
    }
    if (e.key.toLowerCase() === "h") hint();
    if (e.key.toLowerCase() === "z" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      undoMove();
    }
    if (e.key === "Escape") {
      selected = null;
      render();
    }
  });
  reset();
  return w;
}
