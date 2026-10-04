/** Calculator arithmetic is an explicit state machine; input is never evaluated as JavaScript. */
export class CalculatorEngine {
  constructor() {
    this.clear();
    this.memory = 0;
  }
  clear() {
    this.display = "0";
    this.accumulator = null;
    this.operation = null;
    this.fresh = true;
    this.repeat = null;
    this.error = false;
    this.operandReady = false;
  }
  number(value) {
    this.operandReady = true;
    if (this.error) this.clear();
    if (this.fresh) {
      this.display = value === "." ? "0." : value;
      this.fresh = false;
    } else if (value === "." && !this.display.includes("."))
      this.display += ".";
    else if (value !== "." && this.display.replace("-", "").length < 16)
      this.display = this.display === "0" ? value : this.display + value;
  }
  #format(value) {
    if (!Number.isFinite(value)) {
      this.display = "Cannot divide by zero";
      this.error = true;
    } else this.display = String(Number(value.toPrecision(14)));
  }
  #apply(a, b, op) {
    if (op === "+") return a + b;
    if (op === "−" || op === "-") return a - b;
    if (op === "×" || op === "*") return a * b;
    if (op === "÷" || op === "/") return b === 0 ? NaN : a / b;
    if (op === "xʸ") return a ** b;
    if (op === "Mod") return a % b;
    return b;
  }
  binary(op) {
    if (this.error) return;
    const value = Number(this.display);
    if (this.operation && this.operandReady) {
      this.accumulator = this.#apply(this.accumulator, value, this.operation);
      this.#format(this.accumulator);
    } else this.accumulator = value;
    this.operation = op;
    this.fresh = true;
    this.operandReady = false;
    this.repeat = null;
  }
  equals() {
    if (this.error) return;
    if (this.operation) {
      const operand = Number(this.display);
      const result = this.#apply(this.accumulator, operand, this.operation);
      this.repeat = { operation: this.operation, operand };
      this.#format(result);
      this.operation = null;
      this.accumulator = result;
    } else if (this.repeat)
      this.#format(
        this.#apply(
          Number(this.display),
          this.repeat.operand,
          this.repeat.operation,
        ),
      );
    this.fresh = true;
  }
  unary(op, degrees = true) {
    const x = Number(this.display);
    let n = x;
    if (op === "±") n = -x;
    else if (op === "√") n = Math.sqrt(x);
    else if (op === "1/x") n = 1 / x;
    else if (op === "%")
      n = this.accumulator != null ? (this.accumulator * x) / 100 : x / 100;
    else if (op === "sin") n = Math.sin(x * (degrees ? Math.PI / 180 : 1));
    else if (op === "cos") n = Math.cos(x * (degrees ? Math.PI / 180 : 1));
    else if (op === "tan") n = Math.tan(x * (degrees ? Math.PI / 180 : 1));
    else if (op === "log") n = Math.log10(x);
    else if (op === "ln") n = Math.log(x);
    else if (op === "x²") n = x * x;
    else if (op === "x³") n = x * x * x;
    else if (op === "π") n = Math.PI;
    else if (op === "n!") {
      if (x < 0 || x > 170 || !Number.isInteger(x)) n = NaN;
      else {
        n = 1;
        for (let i = 2; i <= x; i++) n *= i;
      }
    } else if (op === "Int") n = Math.trunc(x);
    this.#format(n);
    this.fresh = true;
    this.operandReady = true;
  }
  key(key) {
    if (/^[0-9.]$/.test(key)) this.number(key);
    else if (["+", "−", "-", "×", "*", "÷", "/", "xʸ", "Mod"].includes(key))
      this.binary(key);
    else if (key === "=" || key === "Enter") this.equals();
    else if (key === "C" || key === "Escape") this.clear();
    else if (key === "CE") {
      this.display = "0";
      this.fresh = true;
      this.error = false;
      this.operandReady = true;
    } else if (key === "Backspace") {
      if (!this.fresh)
        this.display =
          this.display.length > 1 ? this.display.slice(0, -1) : "0";
    } else if (key === "MC") this.memory = 0;
    else if (key === "MR") {
      this.display = String(this.memory);
      this.fresh = true;
      this.operandReady = true;
    } else if (key === "MS") this.memory = Number(this.display) || 0;
    else if (key === "M+") this.memory += Number(this.display) || 0;
    else this.unary(key);
    return this.display;
  }
}
