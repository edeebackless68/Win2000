import {
  el,
  button,
  icon,
  toolbar,
  statusBar,
  separator,
  field,
  checkbox,
  safely,
} from "../ui/index.js";
import {
  basename,
  extension,
  downloadFile,
  pickFiles,
  DOCS,
} from "../core/index.js";
export function encodeWav(channels, sampleRate) {
  const length = channels[0].length,
    count = channels.length,
    bytes = new ArrayBuffer(44 + length * count * 2),
    view = new DataView(bytes);
  const text = (p, s) =>
    [...s].forEach((c, i) => view.setUint8(p + i, c.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, 36 + length * count * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, count, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * count * 2, true);
  view.setUint16(32, count * 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, length * count * 2, true);
  let offset = 44;
  for (let i = 0; i < length; i++)
    for (const channel of channels) {
      const sample = Math.max(-1, Math.min(1, channel[i]));
      view.setInt16(offset, sample < 0 ? sample * 32768 : sample * 32767, true);
      offset += 2;
    }
  return new Blob([bytes], { type: "audio/wav" });
}
export async function makeDemoAudio() {
  const rate = 22050,
    duration = 12,
    data = new Float32Array(rate * duration),
    notes = [
      261.63, 329.63, 392, 523.25, 440, 392, 329.63, 293.66, 261.63, 329.63,
      392, 523.25, 587.33, 523.25, 392, 329.63,
    ];
  for (let i = 0; i < data.length; i++) {
    const t = i / rate,
      note = Math.floor(t / 0.75) % notes.length,
      local = t % 0.75,
      env = Math.min(1, local / 0.02) * Math.exp(-local * 3);
    data[i] =
      Math.sin(2 * Math.PI * notes[note] * t) * env * 0.19 +
      Math.sin(2 * Math.PI * 130.815 * t) *
        0.035 *
        Math.sin((Math.PI * t) / duration);
  }
  return encodeWav([data], rate);
}
const blobData = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
export async function openMediaPlayer(ctx, { path = null, cd = false } = {}) {
  const w = ctx.wm.create({
    title: cd ? "CD Player" : "Windows Media Player",
    icon: "media",
    width: 600,
    height: 455,
    appId: cd ? "cdplayer" : "mediaplayer",
  });
  let current = path,
    objectURL = null,
    playlist = [],
    index = -1,
    repeat = false,
    ac = null,
    analyser = null,
    panner = null,
    source = null,
    raf = 0;
  const video = el("video", {
      class: "media-video",
      playsinline: true,
      "aria-label": "Media playback",
    }),
    visual = el("canvas", {
      class: "media-visual",
      width: 560,
      height: 245,
      "aria-label": "Audio visualization",
    }),
    canvasCtx = visual.getContext("2d"),
    title = el("div", { class: "media-now-playing", text: "Windows Welcome" }),
    seek = el("input", {
      type: "range",
      min: 0,
      max: 1000,
      value: 0,
      "aria-label": "Playback position",
    }),
    time = el("span", { class: "media-time", text: "00:00 / 00:00" }),
    playButton = button("▶", () => toggle(), {
      title: "Play",
      "aria-label": "Play",
      class: "media-control",
    }),
    stopButton = button(
      "■",
      () => {
        video.pause();
        video.currentTime = 0;
      },
      { title: "Stop", "aria-label": "Stop", class: "media-control" },
    ),
    status = statusBar("Stopped");
  video.volume = ctx.settings.get("volume") / 100;
  video.muted = ctx.settings.get("muted");
  const format = (s) =>
    !Number.isFinite(s)
      ? "00:00"
      : String(Math.floor(s / 60)).padStart(2, "0") +
        ":" +
        String(Math.floor(s % 60)).padStart(2, "0");
  const load = async (p, autoplay = false) => {
    current = p;
    if (objectURL) {
      URL.revokeObjectURL(objectURL);
      objectURL = null;
    }
    if (p) {
      const node = ctx.fs.stat(p);
      video.src = node.content;
      title.textContent = node.name;
      video.hidden = !node.mime?.startsWith("video/");
      visual.hidden = !video.hidden;
    } else {
      objectURL = URL.createObjectURL(await makeDemoAudio());
      video.src = objectURL;
      title.textContent = "Windows Welcome — a desktop melody";
      video.hidden = true;
      visual.hidden = false;
    }
    w.setTitle(
      title.textContent + " - " + (cd ? "CD Player" : "Windows Media Player"),
    );
    if (autoplay) await toggle(true);
  };
  const setupAudio = async () => {
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      source = ac.createMediaElementSource(video);
      analyser = ac.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      if (ac.createStereoPanner) {
        panner = ac.createStereoPanner();
        panner.pan.value = ctx.settings.get("balance") || 0;
        analyser.connect(panner);
        panner.connect(ac.destination);
      } else analyser.connect(ac.destination);
    }
    await ac.resume();
  };
  const toggle = async (force = false) => {
    if (video.paused || force) {
      await setupAudio();
      await video.play();
    } else video.pause();
  };
  const open = async () => {
    const p = await ctx.dialogs.file({
      filter: (n) =>
        n.mime?.startsWith("audio/") ||
        n.mime?.startsWith("video/") ||
        /\.(wav|mp3|ogg|mp4|webm|m4a)$/i.test(n.name),
    });
    if (p) {
      playlist.push(p);
      index = playlist.length - 1;
      await load(p, true);
    }
  };
  const importMedia = async () => {
    const files = await pickFiles({
      accept: "audio/*,video/*",
      multiple: true,
    });
    for (const file of files)
      playlist.push(await ctx.fs.importFile(file, DOCS + "/My Music"));
    if (files.length) {
      index = playlist.length - files.length;
      await load(playlist[index], true);
    }
  };
  video.addEventListener("play", () => {
    playButton.textContent = "Ⅱ";
    playButton.title = "Pause";
    playButton.setAttribute("aria-label", "Pause");
    status.children[0].textContent = "Playing";
  });
  video.addEventListener("pause", () => {
    playButton.textContent = "▶";
    playButton.title = "Play";
    playButton.setAttribute("aria-label", "Play");
    status.children[0].textContent = "Paused";
  });
  video.addEventListener("timeupdate", () => {
    seek.value = video.duration
      ? String((video.currentTime / video.duration) * 1000)
      : "0";
    time.textContent =
      format(video.currentTime) + " / " + format(video.duration);
  });
  seek.addEventListener("input", () => {
    if (Number.isFinite(video.duration))
      video.currentTime = (+seek.value / 1000) * video.duration;
  });
  video.addEventListener(
    "ended",
    safely(async () => {
      if (index < playlist.length - 1) await load(playlist[++index], true);
      else if (repeat) {
        video.currentTime = 0;
        await video.play();
      } else status.children[0].textContent = "Stopped";
    }),
  );
  video.addEventListener("error", () => {
    status.children[0].textContent =
      "This media format could not be played by your browser.";
  });
  const bars = new Uint8Array(128);
  const draw = () => {
    if (w.closed) return;
    canvasCtx.fillStyle = "#081008";
    canvasCtx.fillRect(0, 0, 560, 245);
    if (analyser) analyser.getByteFrequencyData(bars);
    for (let i = 0; i < 56; i++) {
      const h = (bars[i * 2] || 0) * 0.72,
        x = i * 9 + 25;
      for (let y = 0; y < h; y += 7) {
        canvasCtx.fillStyle =
          y > 150 ? "#d5ce30" : y > 80 ? "#49b924" : "#07840a";
        canvasCtx.fillRect(x, 215 - y, 6, 5);
      }
    }
    canvasCtx.fillStyle = "#263e24";
    canvasCtx.font = "11px Tahoma";
    canvasCtx.textAlign = "center";
    canvasCtx.fillText(
      video.paused ? "WINDOWS MEDIA PLAYER" : "SPECTRUM ANALYZER",
      280,
      235,
    );
    raf = requestAnimationFrame(draw);
  };
  const volume = el("input", {
    type: "range",
    min: 0,
    max: 100,
    value: ctx.settings.get("volume"),
    "aria-label": "Volume",
    oninput: (e) => ctx.settings.set("volume", Number(e.target.value)),
  });
  const applyVolume = () => {
    const master = ctx.settings.get("volume") ?? 65;
    const wave = ctx.settings.get("waveVolume") ?? 100;
    video.volume = Math.max(0, Math.min(1, (master * wave) / 10000));
    video.muted = !!ctx.settings.get("muted");
    volume.value = master;
    if (panner) panner.pan.value = ctx.settings.get("balance") || 0;
  };
  applyVolume();
  w.addCleanup(ctx.bus.on("settings:change", applyVolume));
  w.setMenu({
    File: [
      { label: "Open...", shortcut: "Ctrl+O", action: open },
      { label: "Import Media...", action: importMedia },
      {
        label: "Properties",
        action: () =>
          ctx.dialogs.message(
            `File: ${current || "Built-in desktop melody"}\nDuration: ${format(video.duration)}\nPlayback rate: ${video.playbackRate}×\n\nAvailable formats depend on your browser’s media decoders.`,
            { title: "Media Properties", icon: "media" },
          ),
      },
      { label: "Exit", action: () => w.close() },
    ],
    View: [{ label: "Statistics", action: () => ctx.launch("systeminfo") }],
    Play: () => [
      { label: video.paused ? "Play" : "Pause", action: () => toggle() },
      {
        label: "Stop",
        action: () => {
          video.pause();
          video.currentTime = 0;
        },
      },
      {
        label: "Previous",
        action: () => {
          if (index > 0) load(playlist[--index], true);
          else video.currentTime = 0;
        },
      },
      {
        label: "Next",
        action: () => {
          if (index < playlist.length - 1) load(playlist[++index], true);
        },
      },
      { label: "Repeat", checked: repeat, action: () => (repeat = !repeat) },
      {
        label: "Playback Speed",
        submenu: [0.5, 1, 1.5, 2].map((rate) => ({
          label: rate + "×",
          checked: video.playbackRate === rate,
          action: () => (video.playbackRate = rate),
        })),
      },
    ],
    Help: [
      {
        label: "Help Topics",
        action: () =>
          ctx.dialogs.message(
            "Open audio or video from your virtual disk, or choose Import Media to add files from your device.\n\nThe spectrum responds to real audio samples. The bundled desktop melody is an original synthesized WAV. CD Player uses imported audio; a physical CD-ROM is not accessible.",
            { title: "Media Player Help", icon: "media" },
          ),
      },
    ],
  });
  w.setContent(
    title,
    el("div", { class: "media-display" }, video, visual),
    el(
      "div",
      { class: "media-transport" },
      seek,
      el(
        "div",
        { class: "media-buttons" },
        playButton,
        stopButton,
        button(
          "◀|",
          () => {
            if (index > 0) load(playlist[--index], true);
            else video.currentTime = 0;
          },
          { class: "media-control", title: "Previous" },
        ),
        button(
          "|▶",
          () => {
            if (index < playlist.length - 1) load(playlist[++index], true);
          },
          { class: "media-control", title: "Next" },
        ),
        time,
        icon("speaker"),
        volume,
      ),
    ),
    status,
  );
  w.addCleanup(() => {
    cancelAnimationFrame(raf);
    video.pause();
    video.removeAttribute("src");
    video.load();
    if (objectURL) URL.revokeObjectURL(objectURL);
    ac?.close();
  });
  w.el.addEventListener(
    "keydown",
    safely((e) => {
      if (e.code === "Space" && !e.target.matches("input")) {
        e.preventDefault();
        return toggle();
      }
    }),
  );
  await load(path);
  draw();
  return w;
}

export function openVolume(ctx) {
  const w = ctx.wm.create({
    title: "Volume Control",
    icon: "speaker",
    width: 330,
    height: 280,
    appId: "volume",
    resizable: false,
    maximizable: false,
  });
  const slider = (label, key) =>
    el(
      "div",
      { class: "volume-channel" },
      el("b", { text: label }),
      el("span", { text: "Balance" }),
      el("input", {
        type: "range",
        min: -1,
        max: 1,
        step: 0.1,
        value: ctx.settings.get("balance") || 0,
        "aria-label": label + " balance",
        oninput: (e) => ctx.settings.set("balance", +e.target.value),
      }),
      el("span", { text: "Volume" }),
      el("input", {
        class: "vertical-slider",
        type: "range",
        min: 0,
        max: 100,
        value: ctx.settings.get(key) ?? (key === "volume" ? 65 : 100),
        "aria-label": label + " volume",
        oninput: (e) => ctx.settings.set(key, +e.target.value),
      }),
      checkbox("Mute", ctx.settings.get("muted"), (v) =>
        ctx.settings.set("muted", v),
      ),
    );
  w.setMenu({
    Options: [
      {
        label: "Properties",
        action: () => ctx.launch("control", { page: "sounds" }),
      },
      { label: "Exit", action: () => w.close() },
    ],
    Help: [
      {
        label: "Help Topics",
        action: () => ctx.launch("help", { topic: "media" }),
      },
    ],
  });
  w.setContent(
    el(
      "div",
      { class: "volume-channels" },
      slider("Volume Control", "volume"),
      slider("Wave", "waveVolume"),
    ),
    statusBar("Browser Audio Device"),
  );
  return w;
}

export function openSoundRecorder(ctx) {
  const w = ctx.wm.create({
    title: "Sound - Sound Recorder",
    icon: "speaker",
    width: 410,
    height: 250,
    appId: "recorder",
    resizable: false,
    maximizable: false,
  });
  let session = null,
    requesting = false,
    generation = 0,
    blob = null,
    audio = null,
    audioURL = null,
    timer = null,
    dirty = false,
    savedPath = null,
    playbackRate = 1;
  const canvas = el("canvas", {
      width: 370,
      height: 66,
      class: "recorder-wave",
    }),
    cc = canvas.getContext("2d"),
    position = el("span", { text: "Position: 0.00 sec." }),
    length = el("span", { text: "Length: 0.00 sec." });
  const title = () =>
    w.setTitle(
      (savedPath ? basename(savedPath) : "Sound") +
        (dirty ? "*" : "") +
        " - Sound Recorder",
    );
  const draw = (t = 0) => {
    cc.fillStyle = "#000";
    cc.fillRect(0, 0, 370, 66);
    cc.strokeStyle = "#00e000";
    cc.lineWidth = 1;
    cc.beginPath();
    cc.moveTo(0, 33);
    cc.lineTo(370, 33);
    cc.stroke();
    if (t) {
      cc.fillStyle = "#00e000";
      cc.fillRect(Math.min(368, t * 8), 0, 2, 66);
    }
  };
  const disposeAudio = () => {
    audio?.pause();
    audio = null;
    if (audioURL) URL.revokeObjectURL(audioURL);
    audioURL = null;
  };
  const stop = async () => {
    audio?.pause();
    clearInterval(timer);
    const active = session;
    if (active) {
      if (active.recorder.state !== "inactive") active.recorder.stop();
      await active.done;
    }
  };
  const save = async (saveAs = false) => {
    await stop();
    if (!blob) throw new Error("There is no sound to save.");
    const snapshot = blob;
    const p =
      !saveAs && savedPath
        ? savedPath
        : await ctx.dialogs.file({
            mode: "save",
            name: savedPath ? basename(savedPath) : "Sound.wav",
            normalizeName: (name) => name.replace(/\.[^.]+$/, "") + ".wav",
          });
    if (!p) return false;
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    try {
      const buffer = await ac.decodeAudioData(await snapshot.arrayBuffer());
      const wav = encodeWav(
        Array.from({ length: buffer.numberOfChannels }, (_, i) =>
          buffer.getChannelData(i),
        ),
        buffer.sampleRate,
      );
      await ctx.fs.writeFile(p, await blobData(wav), { mime: "audio/wav" });
      if (blob === snapshot) {
        dirty = false;
        savedPath = p;
        title();
      }
      return !dirty;
    } finally {
      await ac.close();
    }
  };
  const confirmDiscard = async () => {
    await stop();
    if (!dirty) return true;
    const choice = await ctx.dialogs.message(
      "Do you want to save changes to this sound?",
      {
        title: "Sound Recorder",
        buttons: ["Yes", "No", "Cancel"],
      },
    );
    if (choice === "Yes") return save();
    return choice === "No";
  };
  const record = async () => {
    if (requesting || session) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
      throw new Error("Microphone recording is not supported in this browser.");
    requesting = true;
    const request = ++generation;
    let stream;
    try {
      if (!(await confirmDiscard())) return;
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (w.closed || request !== generation) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const recorder = new MediaRecorder(stream),
        chunks = [];
      let finish;
      const active = {
        recorder,
        stream,
        started: Date.now(),
        done: new Promise((resolve) => {
          finish = resolve;
        }),
      };
      recorder.addEventListener("dataavailable", (e) => {
        if (e.data.size) chunks.push(e.data);
      });
      recorder.addEventListener(
        "stop",
        () => {
          stream.getTracks().forEach((t) => t.stop());
          if (session === active) {
            clearInterval(timer);
            blob = new Blob(chunks, { type: recorder.mimeType });
            session = null;
            dirty = blob.size > 0;
            length.textContent =
              "Length: " +
              ((Date.now() - active.started) / 1000).toFixed(2) +
              " sec.";
            title();
          }
          finish();
        },
        { once: true },
      );
      recorder.addEventListener("error", (e) => {
        ctx.dialogs.error(
          e.error || new Error("The recording device stopped unexpectedly."),
        );
      });
      recorder.start();
      disposeAudio();
      blob = null;
      savedPath = null;
      dirty = true;
      session = active;
      title();
      timer = setInterval(() => {
        const seconds = (Date.now() - active.started) / 1000;
        position.textContent = "Position: " + seconds.toFixed(2) + " sec.";
        draw(seconds);
      }, 100);
    } catch (error) {
      stream?.getTracks().forEach((t) => t.stop());
      throw error;
    } finally {
      requesting = false;
    }
  };
  const play = async () => {
    await stop();
    if (!blob) throw new Error("Record a sound or open an audio file first.");
    disposeAudio();
    audioURL = URL.createObjectURL(blob);
    const player = (audio = new Audio(audioURL));
    player.playbackRate = playbackRate;
    player.volume = Math.max(
      0,
      Math.min(1, (ctx.settings.get("volume") ?? 65) / 100),
    );
    player.muted = !!ctx.settings.get("muted");
    player.addEventListener("timeupdate", () => {
      position.textContent =
        "Position: " + player.currentTime.toFixed(2) + " sec.";
      draw(player.currentTime);
    });
    player.addEventListener("loadedmetadata", () => {
      if (Number.isFinite(player.duration))
        length.textContent = "Length: " + player.duration.toFixed(2) + " sec.";
    });
    await player.play();
  };
  const newSound = async () => {
    if (!(await confirmDiscard())) return;
    generation++;
    disposeAudio();
    blob = null;
    savedPath = null;
    dirty = false;
    title();
    position.textContent = "Position: 0.00 sec.";
    length.textContent = "Length: 0.00 sec.";
    draw();
  };
  const open = async () => {
    if (!(await confirmDiscard())) return;
    const p = await ctx.dialogs.file({
      filter: (n) => n.mime?.startsWith("audio/"),
    });
    if (!p) return;
    generation++;
    const response = await fetch(ctx.fs.readFile(p)),
      loaded = await response.blob();
    disposeAudio();
    blob = loaded;
    savedPath = extension(p) === "wav" ? p : null;
    dirty = false;
    w.setTitle(basename(p) + " - Sound Recorder");
    position.textContent = "Position: 0.00 sec.";
    length.textContent = "Length: open sound";
    draw();
  };
  w.setMenu({
    File: [
      { label: "New", action: newSound },
      { label: "Open...", action: open },
      { label: "Save", action: () => save() },
      { label: "Save As...", action: () => save(true) },
      { label: "Exit", action: () => w.close() },
    ],
    Effects: [
      {
        label: "Increase Playback Speed (100%)",
        action: () => {
          playbackRate = 2;
          if (audio) audio.playbackRate = playbackRate;
        },
      },
      {
        label: "Decrease Playback Speed",
        action: () => {
          playbackRate = 0.5;
          if (audio) audio.playbackRate = playbackRate;
        },
      },
      {
        label: "Normal Playback Speed",
        action: () => {
          playbackRate = 1;
          if (audio) audio.playbackRate = playbackRate;
        },
      },
    ],
    Help: [
      {
        label: "Help Topics",
        action: () =>
          ctx.dialogs.message(
            "Record microphone audio, then save it as a PCM WAV file. Your browser asks for microphone access when you start recording. Playback speed affects listening; saved WAV data keeps its original speed.",
            { title: "Sound Recorder", icon: "speaker" },
          ),
      },
    ],
  });
  w.setContent(
    el(
      "div",
      { class: "recorder" },
      el("div", { class: "recorder-labels" }, position, length),
      canvas,
      el(
        "div",
        { class: "recorder-controls" },
        button(
          "|◀",
          () => {
            if (audio) audio.currentTime = 0;
          },
          { title: "Rewind" },
        ),
        button(
          "▶|",
          () => {
            if (audio && Number.isFinite(audio.duration))
              audio.currentTime = audio.duration;
          },
          { title: "Forward" },
        ),
        button("▶", play, { title: "Play", "aria-label": "Play" }),
        button("■", stop, { title: "Stop", "aria-label": "Stop" }),
        button("●", record, {
          class: "record-button",
          title: "Record",
          "aria-label": "Record",
        }),
      ),
    ),
  );
  w.onClose = async () => {
    generation++;
    return confirmDiscard();
  };
  w.addCleanup(() => {
    generation++;
    clearInterval(timer);
    disposeAudio();
    const active = session;
    if (active?.recorder.state === "recording") active.recorder.stop();
    active?.stream.getTracks().forEach((t) => t.stop());
  });
  w.addCleanup(
    ctx.bus.on("settings:change", () => {
      if (audio) {
        audio.volume = (ctx.settings.get("volume") ?? 65) / 100;
        audio.muted = !!ctx.settings.get("muted");
      }
    }),
  );
  draw();
  return w;
}

export function openImaging(ctx, { path = null } = {}) {
  const w = ctx.wm.create({
    title: path ? basename(path) + " - Imaging" : "Imaging",
    icon: "paint",
    width: 700,
    height: 510,
    appId: "imaging",
  });
  let current = path,
    rotation = 0,
    zoom = 1;
  const image = el("img", { class: "imaging-image", alt: "", hidden: true }),
    stage = el("div", { class: "imaging-stage" }, image),
    status = statusBar("Ready");
  const load = (p) => {
    const node = ctx.fs.stat(p);
    if (!node.content.startsWith("data:image/"))
      throw new Error("Select an image file.");
    current = p;
    image.src = node.content;
    image.alt = node.name;
    image.hidden = false;
    w.setTitle(node.name + " - Imaging");
    status.children[0].textContent = node.name;
  };
  const update = () =>
    (image.style.transform = `rotate(${rotation}deg) scale(${zoom})`);
  const open = async () => {
    const p = await ctx.dialogs.file({
      filter: (n) => n.mime?.startsWith("image/"),
    });
    if (p) load(p);
  };
  w.setMenu({
    File: [
      { label: "Open...", action: open },
      {
        label: "Import Image...",
        action: async () => {
          const [file] = await pickFiles({ accept: "image/*" });
          if (file) load(await ctx.fs.importFile(file, DOCS + "/My Pictures"));
        },
      },
      {
        label: "Download",
        action: () => {
          if (current) {
            const n = ctx.fs.stat(current);
            downloadFile(n.name, n.content, n.mime);
          }
        },
      },
      {
        label: "Print...",
        action: () => {
          if (current) ctx.printImage(image.src);
        },
      },
      { label: "Exit", action: () => w.close() },
    ],
    Edit: [
      {
        label: "Edit in Paint",
        action: () => {
          if (current) ctx.launch("paint", { path: current });
        },
      },
    ],
    View: [
      {
        label: "Zoom In",
        action: () => {
          zoom = Math.min(5, zoom + 0.25);
          update();
        },
      },
      {
        label: "Zoom Out",
        action: () => {
          zoom = Math.max(0.25, zoom - 0.25);
          update();
        },
      },
      {
        label: "Actual Size",
        action: () => {
          zoom = 1;
          update();
        },
      },
      {
        label: "Rotate Right",
        action: () => {
          rotation += 90;
          update();
        },
      },
    ],
    Help: [
      {
        label: "Help Topics",
        action: () =>
          ctx.dialogs.message(
            "View imported pictures and open them in Paint for editing. Use the toolbar to rotate or zoom the view.",
            { title: "Imaging Help", icon: "paint" },
          ),
      },
    ],
  });
  w.setContent(
    toolbar([
      { icon: "folderOpen", label: "Open", action: open },
      {
        icon: "paint",
        label: "Edit in Paint",
        action: () => {
          if (current) ctx.launch("paint", { path: current });
        },
      },
      {
        glyph: "⊕",
        title: "Zoom In",
        action: () => {
          zoom += 0.25;
          update();
        },
      },
      {
        glyph: "⊖",
        title: "Zoom Out",
        action: () => {
          zoom = Math.max(0.25, zoom - 0.25);
          update();
        },
      },
      {
        glyph: "↻",
        title: "Rotate",
        action: () => {
          rotation += 90;
          update();
        },
      },
    ]),
    stage,
    status,
  );
  if (path) load(path);
  else
    stage.append(
      el("div", {
        class: "imaging-empty",
        text: "Choose File > Open to view an image.",
      }),
    );
  image.addEventListener("load", () => {
    stage.querySelector(".imaging-empty")?.remove();
    status.children[0].textContent = `${basename(current)}   ${image.naturalWidth} × ${image.naturalHeight} pixels`;
  });
  return w;
}
