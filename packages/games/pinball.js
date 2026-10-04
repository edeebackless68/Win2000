import { el, button, statusBar } from "../ui/index.js";
import { GraphicsSurface } from "../rendering/index.js";
export async function openPinball(ctx) {
  const w = ctx.wm.create({
      title: "3D Pinball for Windows",
      icon: "pinball",
      width: 700,
      height: 620,
      appId: "pinball",
    }),
    bitmap = document.createElement("canvas");
  bitmap.width = 460;
  bitmap.height = 620;
  const c = bitmap.getContext("2d");
  const canvas = el("canvas", {
      width: 460,
      height: 620,
      "aria-label": "Pinball table",
    }),
    renderer = new GraphicsSurface(canvas);
  await renderer.init();
  let score = 0,
    balls = 3,
    ball = { x: 436, y: 565, vx: 0, vy: 0 },
    launched = false,
    charge = 0,
    paused = false,
    last = 0,
    accumulator = 0,
    frame = 0,
    keys = { left: false, right: false, space: false },
    leftAngle = 0.45,
    rightAngle = Math.PI - 0.45;
  const bumpers = [
    { x: 180, y: 150, r: 25, value: 100, flash: 0 },
    { x: 280, y: 170, r: 25, value: 100, flash: 0 },
    { x: 226, y: 236, r: 28, value: 150, flash: 0 },
    { x: 125, y: 324, r: 17, value: 50, flash: 0 },
    { x: 330, y: 332, r: 17, value: 50, flash: 0 },
  ];
  const scoreDisplay = el("div", { class: "pinball-score", text: "000000" }),
    ballDisplay = el("div", {
      class: "pinball-ball-count",
      text: "Ball 1 of 3",
    }),
    info = el(
      "div",
      { class: "pinball-info" },
      el("div", { class: "pinball-heading", text: "SPACE\nCADET" }),
      el("div", { class: "pinball-caption", text: "SCORE" }),
      scoreDisplay,
      ballDisplay,
      el("div", {
        class: "pinball-controls-help",
        text: "Z / Left Arrow\nLeft flipper\n\n/ / Right Arrow\nRight flipper\n\nHold Space\nLaunch ball\n\nX\nNudge table",
      }),
      button("New Game", () => reset()),
      button("Pause", () => (paused = !paused)),
    );
  const launch = () => {
    if (!launched && balls > 0) {
      ball.vy = -540 - Math.min(charge, 1) * 500;
      ball.vx = -25;
      launched = true;
      charge = 0;
      ctx.sound.play("click");
    }
  };
  const reset = () => {
    score = 0;
    balls = 3;
    launched = false;
    paused = false;
    ball = { x: 436, y: 565, vx: 0, vy: 0 };
    scoreDisplay.textContent = "000000";
    ballDisplay.textContent = "Ball 1 of 3";
  };
  const lineCollision = (ax, ay, bx, by, boost = 1) => {
    const dx = bx - ax,
      dy = by - ay,
      t = Math.max(
        0,
        Math.min(
          1,
          ((ball.x - ax) * dx + (ball.y - ay) * dy) / (dx * dx + dy * dy),
        ),
      ),
      cx = ax + t * dx,
      cy = ay + t * dy,
      nx = ball.x - cx,
      ny = ball.y - cy,
      len = Math.hypot(nx, ny);
    if (len < 11 && len > 0.001) {
      const ux = nx / len,
        uy = ny / len;
      ball.x = cx + ux * 11;
      ball.y = cy + uy * 11;
      const dot = ball.vx * ux + ball.vy * uy;
      if (dot < 0) {
        ball.vx -= 1.7 * dot * ux;
        ball.vy -= 1.7 * dot * uy;
      }
      if (boost > 1) {
        ball.vx += ux * 150;
        ball.vy -= 420;
      }
    }
  };
  const step = (dt) => {
    if (paused) return;
    leftAngle += ((keys.left ? -0.5 : 0.45) - leftAngle) * Math.min(1, dt * 24);
    rightAngle +=
      ((keys.right ? Math.PI + 0.5 : Math.PI - 0.45) - rightAngle) *
      Math.min(1, dt * 24);
    if (!launched) {
      if (keys.space) charge = Math.min(1, charge + dt);
      return;
    }
    ball.vy += 380 * dt;
    ball.vx *= 0.9997;
    ball.vy *= 0.9997;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    if (ball.x < 26) {
      ball.x = 26;
      ball.vx = Math.abs(ball.vx) * 0.86;
    }
    if (ball.x > 446) {
      ball.x = 446;
      ball.vx = -Math.abs(ball.vx) * 0.86;
    }
    if (ball.y < 29) {
      ball.y = 29;
      ball.vy = Math.abs(ball.vy) * 0.82;
      ball.vx -= 100;
    }
    if (ball.x > 414 && ball.y > 120) lineCollision(415, 120, 415, 590);
    lineCollision(27, 450, 115, 535);
    lineCollision(398, 450, 315, 535);
    lineCollision(36, 86, 130, 31);
    lineCollision(390, 84, 315, 31);
    lineCollision(
      125,
      542,
      125 + 82 * Math.cos(leftAngle),
      542 + 82 * Math.sin(leftAngle),
      keys.left ? 2 : 1,
    );
    lineCollision(
      305,
      542,
      305 + 82 * Math.cos(rightAngle),
      542 + 82 * Math.sin(rightAngle),
      keys.right ? 2 : 1,
    );
    for (const bumper of bumpers) {
      const dx = ball.x - bumper.x,
        dy = ball.y - bumper.y,
        len = Math.hypot(dx, dy),
        r = bumper.r + 7;
      if (len < r && len > 0) {
        const nx = dx / len,
          ny = dy / len;
        ball.x = bumper.x + nx * r;
        ball.y = bumper.y + ny * r;
        const v = ball.vx * nx + ball.vy * ny;
        ball.vx -= 2 * v * nx;
        ball.vy -= 2 * v * ny;
        ball.vx += nx * 120;
        ball.vy += ny * 120;
        score += bumper.value;
        bumper.flash = 0.16;
        scoreDisplay.textContent = String(score).padStart(6, "0");
      }
      bumper.flash = Math.max(0, bumper.flash - dt);
    }
    if (ball.y > 650) {
      balls--;
      ballDisplay.textContent = balls
        ? "Ball " + (4 - balls) + " of 3"
        : "GAME OVER";
      if (!balls) {
        paused = true;
        ctx.sound.play("error");
        const best = ctx.settings.get("pinballBest") || 0;
        if (score > best) ctx.settings.set("pinballBest", score);
      } else {
        launched = false;
        ball = { x: 436, y: 565, vx: 0, vy: 0 };
      }
    }
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed > 1200) {
      ball.vx *= 1200 / speed;
      ball.vy *= 1200 / speed;
    }
  };
  const draw = () => {
    c.fillStyle = "#10142c";
    c.fillRect(0, 0, 460, 620);
    c.fillStyle = "#17294b";
    c.beginPath();
    c.roundRect(14, 15, 397, 590, 60);
    c.fill();
    c.strokeStyle = "#8c9bb5";
    c.lineWidth = 6;
    c.stroke();
    c.strokeStyle = "#4a68a0";
    c.lineWidth = 1;
    for (let i = 0; i < 14; i++) {
      c.beginPath();
      c.moveTo(25, 65 + i * 36);
      c.lineTo(400, 65 + i * 36);
      c.stroke();
    }
    for (let i = 0; i < 11; i++) {
      c.beginPath();
      c.moveTo(20 + i * 38, 30);
      c.lineTo(20 + i * 38, 600);
      c.stroke();
    }
    c.font = "bold 22px Georgia";
    c.textAlign = "center";
    c.fillStyle = "#b2c1e9";
    c.fillText("SPACE CADET", 220, 76);
    c.font = "10px Tahoma";
    c.fillStyle = "#9dc3e9";
    c.fillText("PINBALL", 220, 95);
    c.strokeStyle = "#526da3";
    c.lineWidth = 15;
    c.beginPath();
    c.ellipse(215, 242, 164, 118, -0.2, Math.PI, Math.PI * 1.9);
    c.stroke();
    c.strokeStyle = "#9ca9c4";
    c.lineWidth = 2;
    c.stroke();
    c.fillStyle = "#282448";
    c.fillRect(416, 30, 34, 579);
    c.strokeStyle = "#9da6c1";
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(416, 125);
    c.lineTo(416, 600);
    c.stroke();
    for (const b of bumpers) {
      c.shadowBlur = b.flash ? 20 : 0;
      c.shadowColor = "#a2ecff";
      c.fillStyle = b.flash ? "#d4f7ff" : "#9b336d";
      c.beginPath();
      c.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      c.fill();
      c.shadowBlur = 0;
      c.strokeStyle = "#d6cddb";
      c.lineWidth = 3;
      c.stroke();
      c.fillStyle = "#394371";
      c.beginPath();
      c.arc(b.x, b.y, b.r * 0.64, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#ffd384";
      c.font = "bold 13px Tahoma";
      c.fillText("★", b.x, b.y + 5);
    }
    const rail = (ax, ay, bx, by, color = "#b87656", width = 9) => {
      c.lineCap = "round";
      c.strokeStyle = color;
      c.lineWidth = width;
      c.beginPath();
      c.moveTo(ax, ay);
      c.lineTo(bx, by);
      c.stroke();
    };
    rail(27, 450, 115, 535);
    rail(398, 450, 315, 535);
    rail(36, 86, 130, 31, "#bbc6d4", 5);
    rail(390, 84, 315, 31, "#bbc6d4", 5);
    rail(
      125,
      542,
      125 + 82 * Math.cos(leftAngle),
      542 + 82 * Math.sin(leftAngle),
      "#f8d18c",
      16,
    );
    rail(
      305,
      542,
      305 + 82 * Math.cos(rightAngle),
      542 + 82 * Math.sin(rightAngle),
      "#f8d18c",
      16,
    );
    c.fillStyle = "#a885c2";
    for (const [x, y] of [
      [66, 210],
      [348, 238],
      [74, 398],
      [352, 406],
    ]) {
      c.fillRect(x, y, 8, 22);
      c.fillStyle = "#eed477";
      c.fillRect(x + 1, y + 2, 6, 5);
      c.fillStyle = "#a885c2";
    }
    c.font = "bold 18px Tahoma";
    c.fillStyle = "#597bae";
    c.fillText("CADET", 216, 401);
    c.font = "10px Tahoma";
    c.fillText("COMPLETE THE MISSION", 216, 419);
    const gradient = c.createRadialGradient(
      ball.x - 2,
      ball.y - 3,
      1,
      ball.x,
      ball.y,
      8,
    );
    gradient.addColorStop(0, "#fff");
    gradient.addColorStop(0.4, "#dce5ef");
    gradient.addColorStop(1, "#647386");
    c.fillStyle = gradient;
    c.beginPath();
    c.arc(ball.x, ball.y, 7, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#d3a355";
    c.fillRect(425, 594 + charge * 10, 19, 8);
    if (!launched && !paused) {
      c.font = "bold 12px Tahoma";
      c.fillStyle = "#fff";
      c.fillText("HOLD SPACE TO LAUNCH", 212, 470);
    }
    if (paused) {
      c.fillStyle = "rgba(0,0,0,.5)";
      c.fillRect(0, 280, 460, 60);
      c.fillStyle = "#fff";
      c.font = "bold 20px Tahoma";
      c.fillText(balls ? "PAUSED" : "GAME OVER", 230, 318);
    }
    renderer.draw(bitmap);
  };
  const animate = (t) => {
    if (w.closed) return;
    if (!last) last = t;
    accumulator += Math.min(0.05, (t - last) / 1000);
    last = t;
    if (!w.minimized && !document.hidden) {
      while (accumulator >= 1 / 120) {
        step(1 / 120);
        accumulator -= 1 / 120;
      }
      draw();
    } else accumulator = 0;
    frame = requestAnimationFrame(animate);
  };
  const key = (e, down) => {
    if (["ArrowLeft", "z", "Z"].includes(e.key)) {
      e.preventDefault();
      keys.left = down;
    }
    if (["ArrowRight", "/"].includes(e.key)) {
      e.preventDefault();
      keys.right = down;
    }
    if (e.code === "Space") {
      e.preventDefault();
      keys.space = down;
      if (!down) launch();
    }
    if (down && e.key.toLowerCase() === "x" && launched) {
      ball.vy -= 80;
      ball.vx += (Math.random() - 0.5) * 100;
    }
    if (down && e.key === "F2") {
      e.preventDefault();
      reset();
    }
  };
  w.el.addEventListener("keydown", (e) => key(e, true));
  w.el.addEventListener("keyup", (e) => key(e, false));
  const blur = () => {
    keys = { left: false, right: false, space: false };
  };
  window.addEventListener("blur", blur);
  const touch = el("div", { class: "pinball-touch-controls" });
  for (const [label, k] of [
    ["Left", "left"],
    ["Launch", "space"],
    ["Right", "right"],
  ]) {
    const b = button(label, () => {});
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      keys[k] = true;
    });
    b.addEventListener("pointerup", () => {
      keys[k] = false;
      if (k === "space") launch();
    });
    b.addEventListener("pointercancel", () => (keys[k] = false));
    touch.append(b);
  }
  w.setMenu({
    Game: [
      { label: "New Game", shortcut: "F2", action: reset },
      { label: "Pause / Resume", action: () => (paused = !paused) },
      {
        label: "High Scores...",
        action: () =>
          ctx.dialogs.message(
            "Best score: " + (ctx.settings.get("pinballBest") || 0),
            { title: "High Scores", icon: "games" },
          ),
      },
      { label: "Exit", action: () => w.close() },
    ],
    Options: [
      {
        label: "Sound",
        checked: !ctx.settings.get("muted"),
        action: () => ctx.settings.set("muted", !ctx.settings.get("muted")),
      },
    ],
    Help: [
      {
        label: "Player Controls",
        action: () =>
          ctx.dialogs.message(
            "Z or Left Arrow: left flipper\n/ or Right Arrow: right flipper\nHold and release Space: launch\nX: nudge\nF2: new game\n\nHit bumpers for points. Keep the ball above the drain. Three balls per game.",
            { title: "Pinball Help", icon: "games" },
          ),
      },
      {
        label: "About Pinball",
        action: () =>
          ctx.dialogs.message(
            "Pinball\n\nFixed-step ball physics and GPU presentation.\n\nThis browser table is a recreation. Original Space Cadet table artwork, mission scripting, and exact physics are not included.\n\nRendering: " +
              renderer.backend,
            { title: "About Pinball", icon: "games" },
          ),
      },
    ],
  });
  w.setContent(
    el(
      "div",
      { class: "pinball-main" },
      el("div", { class: "pinball-table" }, renderer.canvas),
      info,
    ),
    touch,
  );
  frame = requestAnimationFrame(animate);
  w.addCleanup(() => {
    cancelAnimationFrame(frame);
    renderer.dispose();
    window.removeEventListener("blur", blur);
  });
  w.el.focus();
  return w;
}
