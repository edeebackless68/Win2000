export class Minefield {
  constructor(width = 9, height = 9, mines = 10, random = Math.random) {
    this.width = width;
    this.height = height;
    this.mineCount = Math.min(mines, width * height - 9);
    this.random = random;
    this.cells = Array.from({ length: width * height }, () => ({
      mine: false,
      open: false,
      flag: false,
      question: false,
      count: 0,
    }));
    this.started = false;
    this.over = false;
    this.won = false;
  }
  neighbors(index) {
    const x = index % this.width,
      y = Math.floor(index / this.width),
      result = [];
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx,
          ny = y + dy;
        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height)
          result.push(ny * this.width + nx);
      }
    return result;
  }
  seed(index) {
    const safe = new Set([index, ...this.neighbors(index)]),
      candidates = this.cells.map((_, i) => i).filter((i) => !safe.has(i));
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    for (const i of candidates.slice(0, this.mineCount))
      this.cells[i].mine = true;
    this.cells.forEach(
      (c, i) =>
        (c.count = this.neighbors(i).filter((n) => this.cells[n].mine).length),
    );
    this.started = true;
  }
  reveal(index) {
    if (this.over || this.cells[index]?.flag || !this.cells[index]) return;
    if (!this.started) this.seed(index);
    const cell = this.cells[index];
    if (cell.open) return this.chord(index);
    if (cell.mine) {
      cell.open = true;
      cell.exploded = true;
      this.over = true;
      return;
    }
    const stack = [index];
    while (stack.length) {
      const i = stack.pop(),
        c = this.cells[i];
      if (c.open || c.flag || c.mine) continue;
      c.open = true;
      c.question = false;
      if (!c.count) stack.push(...this.neighbors(i));
    }
    this.checkWin();
  }
  chord(index) {
    const c = this.cells[index],
      neighbors = this.neighbors(index);
    if (
      !c.open ||
      !c.count ||
      neighbors.filter((i) => this.cells[i].flag).length !== c.count
    )
      return;
    for (const i of neighbors) {
      if (!this.cells[i].open && !this.cells[i].flag) this.reveal(i);
      if (this.over) break;
    }
  }
  flag(index, questions = true) {
    if (this.over) return;
    const c = this.cells[index];
    if (c.open) return;
    if (c.flag) {
      c.flag = false;
      c.question = questions;
    } else if (c.question) c.question = false;
    else c.flag = true;
  }
  checkWin() {
    if (this.cells.every((c) => c.mine || c.open)) {
      this.over = true;
      this.won = true;
      for (const c of this.cells) if (c.mine) c.flag = true;
    }
  }
  get flags() {
    return this.cells.filter((c) => c.flag).length;
  }
}
