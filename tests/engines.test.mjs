import test from "node:test";
import assert from "node:assert/strict";
import { CalculatorEngine } from "../packages/accessories/calculator-engine.js";
import { Minefield } from "../packages/games/minefield.js";
import {
  createDeck,
  canStack,
  canFoundation,
} from "../packages/games/card-engine.js";
import { floodFill } from "../packages/accessories/raster.js";
const calculate = (keys) => {
  const c = new CalculatorEngine();
  for (const key of keys) c.key(key);
  return c;
};
test("calculator chains arithmetic and supports repeated equals", () => {
  assert.equal(calculate(["2", "+", "3", "=", "=", "="]).display, "11");
  assert.equal(calculate(["2", "+", "3", "×", "4", "="]).display, "20");
  assert.equal(calculate(["8", "÷", "0", "="]).error, true);
});
test("unary operations, memory recall, and CE retain pending left operand", () => {
  assert.equal(calculate(["2", "+", "9", "√", "+", "1", "="]).display, "6");
  assert.equal(
    calculate(["5", "MS", "C", "2", "+", "MR", "+", "1", "="]).display,
    "8",
  );
  assert.equal(calculate(["2", "+", "3", "CE", "+", "1", "="]).display, "3");
});
test("percent uses pending accumulator, and scientific operations are bounded", () => {
  assert.equal(
    calculate(["2", "0", "0", "+", "1", "0", "%", "="]).display,
    "220",
  );
  assert.equal(calculate(["5", "n!"]).display, "120");
  assert.equal(calculate(["9", "0", "sin"]).display, "1");
});
test("mine placement never hits first square or adjacent neighbors", () => {
  for (const start of [0, 4, 40, 80]) {
    const m = new Minefield(9, 9, 10, () => 0.37);
    m.reveal(start);
    assert.equal(m.cells.filter((c) => c.mine).length, 10);
    for (const index of [start, ...m.neighbors(start)])
      assert.equal(m.cells[index].mine, false);
    assert.equal(m.over, false);
  }
});
test("revealing every safe minefield cell wins and flags every mine", () => {
  const m = new Minefield(9, 9, 10, () => 0.21);
  m.reveal(40);
  m.cells.forEach((c, i) => {
    if (!c.mine) m.reveal(i);
  });
  assert.equal(m.won, true);
  assert.equal(m.flags, 10);
});
test("flags protect cells and cycle through question marks", () => {
  const m = new Minefield();
  m.flag(1);
  m.reveal(1);
  assert.equal(m.started, false);
  assert.equal(m.cells[1].flag, true);
  m.flag(1);
  assert.equal(m.cells[1].question, true);
  m.flag(1);
  assert.equal(m.cells[1].question, false);
});
test("deck has every unique card and enforces rank and color", () => {
  const cards = createDeck(() => 0.5);
  assert.equal(cards.length, 52);
  assert.equal(new Set(cards.map((c) => c.id)).size, 52);
  assert.equal(canStack({ rank: 12, suit: 1 }, { rank: 13, suit: 0 }), true);
  assert.equal(canStack({ rank: 12, suit: 2 }, { rank: 13, suit: 0 }), false);
  assert.equal(canStack({ rank: 13, suit: 0 }, null), true);
  assert.equal(canStack({ rank: 12, suit: 0 }, null), false);
  assert.equal(canFoundation({ rank: 1, suit: 2 }, []), true);
  assert.equal(
    canFoundation({ rank: 2, suit: 2 }, [{ rank: 1, suit: 2 }]),
    true,
  );
  assert.equal(
    canFoundation({ rank: 2, suit: 3 }, [{ rank: 1, suit: 2 }]),
    false,
  );
});
test("flood fill respects boundaries and updates alpha without spilling", () => {
  const image = { width: 5, height: 5, data: new Uint8ClampedArray(100) };
  for (let i = 0; i < 25; i++) image.data.set([255, 255, 255, 255], i * 4);
  for (let y = 0; y < 5; y++) image.data.set([0, 0, 0, 255], (y * 5 + 2) * 4);
  floodFill(image, 0, 0, [255, 0, 0, 255]);
  assert.deepEqual([...image.data.slice(0, 4)], [255, 0, 0, 255]);
  assert.deepEqual([...image.data.slice(12, 16)], [255, 255, 255, 255]);
  assert.deepEqual([...image.data.slice(8, 12)], [0, 0, 0, 255]);
  const copy = image.data.slice();
  floodFill(image, 0, 0, [255, 0, 0, 255]);
  assert.deepEqual(image.data, copy);
});
