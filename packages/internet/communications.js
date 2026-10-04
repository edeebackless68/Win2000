import {
  el,
  button,
  field,
  toolbar,
  statusBar,
  separator,
  safely,
} from "../ui/index.js";
import { downloadFile, DOCS, joinPath } from "../core/index.js";
export function openHyperTerminal(ctx) {
  const w = ctx.wm.create({
    title: "Untitled - HyperTerminal",
    icon: "cmd",
    width: 650,
    height: 410,
    appId: "hyperterminal",
  });
  let transport = "loopback",
    socket = null,
    port = null,
    reader = null,
    writer = null,
    generation = 0,
    connected = false,
    log = "";
  const output = el("pre", { class: "hyperterminal-output" }),
    input = el("input", {
      "aria-label": "Send text",
      placeholder: "Type a line and press Enter",
    }),
    status = statusBar("Disconnected", "");
  const print = (text) => {
    log += String(text);
    output.textContent = log;
    output.scrollTop = output.scrollHeight;
  };
  const disconnect = async () => {
    const token = ++generation;
    const oldSocket = socket,
      oldReader = reader,
      oldWriter = writer,
      oldPort = port;
    connected = false;
    socket = reader = writer = port = null;
    oldSocket?.close();
    try {
      await oldReader?.cancel();
      oldReader?.releaseLock();
      oldWriter?.releaseLock();
      await oldPort?.close();
    } catch {}
    if (token === generation) status.children[0].textContent = "Disconnected";
  };
  const setup = () => {
    const d = ctx.wm.create({
        title: "Connect To",
        width: 420,
        height: 280,
        dialog: true,
        resizable: false,
        minimizable: false,
        maximizable: false,
        appId: "terminalconnect",
      }),
      name = el("input", {
        value: "New Connection",
        "aria-label": "Connection name",
      }),
      type = el(
        "select",
        { "aria-label": "Connect using" },
        el("option", {
          value: "loopback",
          text: "Local loopback (test terminal)",
        }),
        el("option", { value: "websocket", text: "WebSocket gateway" }),
        el("option", { value: "serial", text: "Serial port (Web Serial)" }),
      ),
      address = el("input", {
        value: "wss://",
        "aria-label": "Gateway address",
      }),
      baud = el("input", {
        type: "number",
        value: 9600,
        min: 300,
        max: 921600,
        "aria-label": "Bits per second",
      });
    d.setContent(
      el(
        "div",
        { class: "dialog-padding" },
        field("Name:", name),
        field("Connect using:", type),
        field("Gateway URL:", address),
        field("Bits per second:", baud),
      ),
      el(
        "div",
        { class: "dialog-buttons" },
        button("Connect", async () => {
          await disconnect();
          const token = ++generation;
          transport = type.value;
          if (transport === "websocket") {
            const url = new URL(address.value);
            if (!["ws:", "wss:"].includes(url.protocol))
              throw new Error("Enter a ws:// or wss:// WebSocket address.");
            const connection = (socket = new WebSocket(url));
            connection.addEventListener("open", () => {
              if (token !== generation) return;
              connected = true;
              status.children[0].textContent = "Connected";
              print("\r\nConnected to " + url.host + "\r\n");
            });
            connection.addEventListener("message", async (e) => {
              const text =
                typeof e.data === "string" ? e.data : await e.data.text();
              if (token === generation) print(text);
            });
            connection.addEventListener("close", () => {
              if (token !== generation) return;
              connected = false;
              status.children[0].textContent = "Disconnected";
            });
            connection.addEventListener("error", () => {
              if (token !== generation) return;
              status.children[0].textContent = "Connection failed";
              print(
                "\r\nConnection failed. Check the gateway address and browser policy.\r\n",
              );
            });
          } else if (transport === "serial") {
            if (!navigator.serial)
              throw new Error(
                "Web Serial is unavailable in this browser. Use a WebSocket gateway or local loopback.",
              );
            const connectionPort = await navigator.serial.requestPort();
            if (token !== generation || w.closed) return;
            await connectionPort.open({
              baudRate: Math.max(300, Math.min(921600, +baud.value || 9600)),
            });
            if (token !== generation || w.closed) {
              await connectionPort.close();
              return;
            }
            port = connectionPort;
            const connectionReader = (reader = port.readable.getReader());
            writer = port.writable.getWriter();
            connected = true;
            const decoder = new TextDecoder();
            (async () => {
              try {
                while (connected && token === generation) {
                  const result = await connectionReader.read();
                  if (result.done) break;
                  if (token === generation)
                    print(decoder.decode(result.value, { stream: true }));
                }
              } catch (error) {
                if (token === generation) print("\r\n" + error.message);
              }
            })();
          } else {
            connected = true;
            print(
              "Connected to local loopback. Typed text is echoed locally.\r\n",
            );
          }
          status.children[0].textContent = connected
            ? "Connected"
            : "Connecting...";
          status.children[1].textContent = transport;
          w.setTitle(name.value + " - HyperTerminal");
          d.close();
          input.focus();
        }),
        button("Cancel", () => d.close()),
      ),
    );
  };
  const send = async () => {
    if (!connected) throw new Error("Open a connection first.");
    const text = input.value + "\r\n";
    input.value = "";
    if (transport === "loopback") print(text);
    else if (transport === "websocket") socket.send(text);
    else await writer.write(new TextEncoder().encode(text));
  };
  w.setMenu({
    File: [
      { label: "New Connection...", action: setup },
      {
        label: "Save Log As...",
        action: () => downloadFile("HyperTerminal.log", log),
      },
      { label: "Exit", action: () => w.close() },
    ],
    Edit: [
      {
        label: "Copy",
        action: () =>
          ctx.clipboard.setText(window.getSelection()?.toString() || log),
      },
      {
        label: "Paste",
        action: async () => (input.value = await ctx.clipboard.getText()),
      },
      {
        label: "Clear Screen",
        action: () => {
          log = "";
          output.textContent = "";
        },
      },
    ],
    Call: [
      { label: "Connect", action: setup },
      { label: "Disconnect", action: disconnect },
    ],
    Transfer: [
      {
        label: "Capture Text...",
        action: async () => {
          const p = await ctx.dialogs.file({
            mode: "save",
            name: "Session.log",
          });
          if (p) await ctx.fs.writeFile(p, log);
        },
      },
    ],
    Help: [
      {
        label: "Help Topics",
        action: () =>
          ctx.dialogs.message(
            "Connect to a browser-accessible serial port or an existing WebSocket terminal gateway. Local loopback can test input and capture.\n\nNative modem dialing and raw Telnet sockets require a gateway or an OS emulator.",
            { title: "HyperTerminal Help", icon: "cmd" },
          ),
      },
    ],
  });
  w.setContent(
    toolbar([
      { icon: "network", label: "Connect", action: setup },
      { glyph: "×", label: "Disconnect", action: disconnect },
    ]),
    output,
    el("div", { class: "hyperterminal-send" }, input, button("Send", send)),
    status,
  );
  input.addEventListener(
    "keydown",
    safely((e) => {
      if (e.key === "Enter") return send();
    }),
  );
  w.addCleanup(() => disconnect());
  print(
    "HyperTerminal\r\nSelect Call > Connect to open a terminal connection.\r\n",
  );
  return w;
}

export function openPhoneDialer(ctx) {
  const w = ctx.wm.create({
    title: "Phone Dialer",
    icon: "network",
    width: 285,
    height: 365,
    appId: "dialer",
    resizable: false,
    maximizable: false,
  });
  const number = el("input", { "aria-label": "Number to dial", type: "tel" }),
    keys = el("div", { class: "dialer-keys" });
  const dial = () => {
    const value = number.value.trim();
    if (!/^[+0-9*#(), -]+$/.test(value))
      throw new Error("Enter a telephone number.");
    location.href = "tel:" + encodeURIComponent(value);
  };
  for (const [digit, label] of [
    ["1", ""],
    ["2", "ABC"],
    ["3", "DEF"],
    ["4", "GHI"],
    ["5", "JKL"],
    ["6", "MNO"],
    ["7", "PQRS"],
    ["8", "TUV"],
    ["9", "WXYZ"],
    ["*", ""],
    ["0", "+"],
    ["#", ""],
  ])
    keys.append(
      button(
        [el("b", { text: digit }), el("small", { text: label })],
        () => (number.value += digit),
      ),
    );
  w.setMenu({
    File: [{ label: "Exit", action: () => w.close() }],
    Edit: [
      { label: "Clear", action: () => (number.value = "") },
      {
        label: "Paste",
        action: async () => (number.value = await ctx.clipboard.getText()),
      },
    ],
    Help: [
      {
        label: "Help Topics",
        action: () =>
          ctx.dialogs.message(
            "Enter a number and choose Dial to open your device’s phone application. Modem voice calls are not available directly in the browser.",
            { title: "Phone Dialer", icon: "network" },
          ),
      },
    ],
  });
  w.setContent(
    el(
      "div",
      { class: "dialog-padding dialer" },
      field("Number:", number),
      keys,
      el(
        "div",
        { class: "dialog-buttons" },
        button("Dial", dial, { class: "default-button" }),
        button("Clear", () => (number.value = "")),
      ),
    ),
  );
  return w;
}

export function openSynchronize(ctx) {
  const w = ctx.wm.create({
      title: "Items to Synchronize",
      icon: "network",
      width: 430,
      height: 270,
      appId: "synchronize",
      resizable: false,
      maximizable: false,
    }),
    status = el("p", { text: "Ready to synchronize the virtual hard drive." }),
    list = el(
      "div",
      { class: "inset sync-items" },
      el("p", {
        text: "☑ Local Disk (C:)\n☑ Desktop settings\n☑ Scheduled task configuration",
      }),
    );
  const synchronize = async () => {
    status.textContent = "Waiting for pending file transactions...";
    await ctx.fs.queue;
    status.textContent =
      "All pending file transactions have completed.\nLast synchronized: " +
      new Date().toLocaleString();
    ctx.log(
      "Information",
      "Synchronize",
      "All virtual disk transactions completed.",
    );
  };
  w.setContent(
    el(
      "div",
      { class: "dialog-padding" },
      el("p", { text: "Select the items you want to synchronize:" }),
      list,
      status,
    ),
    el(
      "div",
      { class: "dialog-buttons" },
      button("Synchronize", synchronize, { class: "default-button" }),
      button("Setup...", () => ctx.launch("control", { page: "system" })),
      button("Close", () => w.close()),
    ),
  );
  return w;
}
