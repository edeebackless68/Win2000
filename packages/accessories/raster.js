export function floodFill(image, x, y, color) {
  const { width, height, data } = image;
  x = Math.floor(x);
  y = Math.floor(y);
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const p = (y * width + x) * 4,
    target = [...data.slice(p, p + 4)];
  if (target.every((v, i) => v === color[i])) return;
  const matches = (i) =>
    data[i] === target[0] &&
    data[i + 1] === target[1] &&
    data[i + 2] === target[2] &&
    data[i + 3] === target[3];
  const stack = [x, y];
  while (stack.length) {
    const sy = stack.pop();
    let sx = stack.pop();
    while (sx >= 0 && matches((sy * width + sx) * 4)) sx--;
    sx++;
    let up = false,
      down = false;
    for (; sx < width && matches((sy * width + sx) * 4); sx++) {
      const i = (sy * width + sx) * 4;
      data.set(color, i);
      if (sy > 0) {
        if (matches(i - width * 4)) {
          if (!up) {
            stack.push(sx, sy - 1);
            up = true;
          }
        } else up = false;
      }
      if (sy < height - 1) {
        if (matches(i + width * 4)) {
          if (!down) {
            stack.push(sx, sy + 1);
            down = true;
          }
        } else down = false;
      }
    }
  }
}
