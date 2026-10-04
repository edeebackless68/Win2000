import { el, button, safely } from "../ui/index.js";
import {
  DOCS,
  basename,
  dirname,
  normalizePath,
  joinPath,
  formatBytes,
} from "../core/index.js";
export function tokenizeCommand(line) {
  return [...line.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map(
    (m) => m[1] ?? m[2] ?? m[3],
  );
}
export function openTerminal(ctx, { command = null } = {}) {
  const w = ctx.wm.create({
    title: "Command Prompt",
    icon: "cmd",
    width: 720,
    height: 430,
    appId: "cmd",
  });
  let cwd = "C:/Documents and Settings/Administrator",
    history = [],
    historyIndex = 0,
    busy = false;
  const environment = {
    OS: "Windows_NT",
    USERNAME: ctx.settings.get("username"),
    COMPUTERNAME: ctx.settings.get("computerName"),
    WINDIR: "C:\\WINNT",
    SYSTEMROOT: "C:\\WINNT",
    TEMP: "C:\\Temp",
    PATH: "C:\\WINNT;C:\\WINNT\\system32",
    PROMPT: "$P$G",
  };
  const output = el("div", { class: "terminal-output", "aria-live": "polite" }),
    input = el("input", {
      class: "terminal-input",
      spellcheck: false,
      autocomplete: "off",
      "aria-label": "Command line",
    }),
    prompt = el("span", { class: "terminal-prompt" }),
    inputRow = el("div", { class: "terminal-input-row" }, prompt, input),
    terminal = el("div", { class: "terminal", tabindex: -1 }, output, inputRow);
  const print = (text = "") => {
      output.append(el("div", { text: String(text) }));
      terminal.scrollTop = terminal.scrollHeight;
    },
    promptText = () => cwd.replaceAll("/", "\\") + ">",
    resolve = (p) =>
      /^[a-z]:/i.test(p)
        ? normalizePath(p)
        : p?.startsWith("\\")
          ? normalizePath(cwd.slice(0, 2) + p)
          : joinPath(cwd, p || ".");
  const filesFor = (pattern) => {
    const p = resolve(pattern);
    if (!/[?*]/.test(p)) return ctx.fs.exists(p) ? [ctx.fs.stat(p)] : [];
    const dir = dirname(p),
      wild = basename(p)
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replaceAll("*", ".*")
        .replaceAll("?", ".");
    return ctx.fs
      .list(dir)
      .filter((n) => new RegExp("^" + wild + "$", "i").test(n.name));
  };
  const help = `For more information, type a command followed by /?.\n\nASSOC     Displays file associations.\nCD        Displays or changes the current directory.\nCLS       Clears the screen.\nCOLOR     Sets console foreground and background colors.\nCOPY      Copies one or more files.\nDATE      Displays the current virtual date.\nDEL       Deletes files from the virtual disk.\nDIR       Displays a list of files and subdirectories.\nECHO      Displays messages or writes text to a file.\nEXIT      Closes Command Prompt.\nFC        Compares two files.\nFIND      Searches for a text string in a file.\nHELP      Displays this list of commands.\nIPCONFIG  Displays browser network information.\nMD        Creates a directory.\nMOVE      Moves files or renames directories.\nREN       Renames a file.\nRD        Removes a directory.\nSET       Displays or sets environment variables.\nSORT      Sorts lines of text in a file.\nSTART     Starts a program or opens a document.\nTASKLIST  Displays running desktop applications.\nTASKKILL  Closes a running desktop application.\nTIME      Displays the current virtual time.\nTITLE     Sets the window title.\nTREE      Displays the directory structure.\nTYPE      Displays the contents of a text file.\nVER       Displays the desktop version.\nWHERE     Searches the virtual drive for a file.\n\nUse quoted paths for file names containing spaces.\nECHO supports > (write) and >> (append).\nCommands operate on the virtual disk; native .exe programs do not run.`;
  async function execute(line) {
    line = line.replace(
      /%([^%]+)%/g,
      (_, k) => environment[k.toUpperCase()] ?? "%" + k + "%",
    );
    const args = tokenizeCommand(line),
      cmd = (args.shift() || "").toLowerCase();
    if (!cmd) return "";
    if (args.includes("/?"))
      return (
        help
          .split("\n")
          .filter(
            (s) =>
              s.toLowerCase().startsWith(cmd + " ") ||
              s.startsWith("Use quoted"),
          )
          .join("\n") || "Type HELP to see available commands."
      );
    if (cmd === "help") return help;
    if (cmd === "ver")
      return "Microsoft Windows 2000 [Version 5.00.2195]\nBrowser desktop edition";
    if (cmd === "cls") {
      output.replaceChildren();
      return "";
    }
    if (cmd === "cd" || cmd === "chdir") {
      if (!args.length) return cwd.replaceAll("/", "\\");
      const target = resolve(
        args.filter((a) => a.toLowerCase() !== "/d").join(" "),
      );
      if (ctx.fs.get(target)?.type !== "folder" || ctx.fs.get(target)?.trashed)
        throw new Error("The system cannot find the path specified.");
      cwd = ctx.fs.get(target).path;
      return "";
    }
    if (/^[a-z]:$/.test(cmd)) {
      cwd = cmd.toUpperCase() + "/";
      if (!ctx.fs.exists(cwd))
        throw new Error("The system cannot find the drive specified.");
      return "";
    }
    if (cmd === "dir") {
      const flags = args
        .filter((a) => a.startsWith("/"))
        .map((a) => a.toLowerCase());
      const p = resolve(args.find((a) => !a.startsWith("/")) || "."),
        list = /[?*]/.test(p)
          ? filesFor(p)
          : ctx.fs.list(p, { includeHidden: flags.includes("/a") });
      if (flags.includes("/b")) return list.map((n) => n.name).join("\n");
      return (
        ` Volume in drive ${p[0]} is ${p[0] === "C" ? "Local Disk" : "Compact Disc"}\n Directory of ${p.replaceAll("/", "\\")}\n\n` +
        list
          .map(
            (n) =>
              `${new Date(n.modified).toLocaleDateString().padEnd(12)} ${new Date(n.modified).toLocaleTimeString().padEnd(12)} ${n.type === "folder" ? "<DIR>".padEnd(12) : String(n.size || 0).padStart(12)} ${n.name}`,
          )
          .join("\n") +
        `\n\n        ${list.filter((n) => n.type === "file").length} File(s)\n        ${list.filter((n) => n.type === "folder").length} Dir(s)`
      );
    }
    if (cmd === "echo") {
      const raw = line.slice(line.indexOf(" ") + 1),
        match = raw.match(/^(.*?)\s*(>>?)\s*(.*?)\s*$/);
      if (match) {
        const target = resolve(match[3].replace(/^"|"$/g, "")),
          text = match[1] + "\r\n";
        await ctx.fs.writeFile(
          target,
          (match[2] === ">>" && ctx.fs.exists(target)
            ? ctx.fs.readFile(target)
            : "") + text,
        );
        return "";
      }
      return args.join(" ");
    }
    if (["type", "more"].includes(cmd))
      return ctx.fs.readFile(resolve(args.join(" ")));
    if (["mkdir", "md"].includes(cmd)) {
      await ctx.fs.mkdir(resolve(args.join(" ")));
      return "";
    }
    if (["rmdir", "rd"].includes(cmd)) {
      const p = resolve(args.filter((a) => !a.startsWith("/")).join(" "));
      if (ctx.fs.list(p).length && !args.some((a) => a.toLowerCase() === "/s"))
        throw new Error(
          "The directory is not empty. Use /S to remove the directory tree.",
        );
      await ctx.fs.remove(p, { permanent: true });
      return "";
    }
    if (["del", "erase"].includes(cmd)) {
      const list = filesFor(args.filter((a) => !a.startsWith("/")).join(" "));
      if (!list.length) throw new Error("Could Not Find " + args.join(" "));
      for (const n of list)
        if (n.type === "file") await ctx.fs.remove(n.path, { permanent: true });
      return "";
    }
    if (["ren", "rename"].includes(cmd)) {
      if (args.length < 2)
        throw new Error("The syntax of the command is incorrect.");
      await ctx.fs.rename(resolve(args[0]), args[1]);
      return "";
    }
    if (["copy", "move"].includes(cmd)) {
      if (args.length < 2)
        throw new Error("The syntax of the command is incorrect.");
      const sources = filesFor(args[0]),
        target = resolve(args[1]);
      for (const n of sources) {
        const dest =
          ctx.fs.get(target)?.type === "folder"
            ? joinPath(target, n.name)
            : target;
        if (ctx.fs.exists(dest)) {
          if (
            !(await ctx.dialogs.confirm(
              "Overwrite " + dest + "?",
              "Command Prompt",
            ))
          )
            continue;
          if (n.type === "file" && cmd === "copy") {
            await ctx.fs.writeFile(dest, n.content, { mime: n.mime });
            continue;
          }
          throw new Error("The destination already exists.");
        }
        await ctx.fs.move(n.path, dest, { copy: cmd === "copy" });
      }
      return `        ${sources.length} file(s) ${cmd === "copy" ? "copied" : "moved"}.`;
    }
    if (cmd === "start") {
      if (!args.length) {
        ctx.launch("cmd");
        return "";
      }
      if (args[0] === "") args.shift();
      const p = args.join(" ");
      if (ctx.fs.exists(resolve(p))) ctx.openFile(resolve(p));
      else await ctx.run(p);
      return "";
    }
    if (cmd === "exit") {
      w.close();
      return "";
    }
    if (cmd === "date")
      return new Date(
        Date.now() + ctx.settings.get("clockOffset"),
      ).toLocaleDateString();
    if (cmd === "time")
      return new Date(
        Date.now() + ctx.settings.get("clockOffset"),
      ).toLocaleTimeString();
    if (cmd === "set") {
      if (!args.length)
        return Object.entries(environment)
          .map(([k, v]) => k + "=" + v)
          .join("\n");
      const [k, ...v] = args.join(" ").split("=");
      if (v.length) environment[k.toUpperCase()] = v.join("=");
      else
        return Object.entries(environment)
          .filter(([name]) => name.startsWith(k.toUpperCase()))
          .map(([a, b]) => a + "=" + b)
          .join("\n");
      return "";
    }
    if (cmd === "title") {
      w.setTitle(args.join(" ") || "Command Prompt");
      return "";
    }
    if (cmd === "color") {
      const colors = [
          "#000000",
          "#000080",
          "#008000",
          "#008080",
          "#800000",
          "#800080",
          "#808000",
          "#c0c0c0",
          "#808080",
          "#0000ff",
          "#00ff00",
          "#00ffff",
          "#ff0000",
          "#ff00ff",
          "#ffff00",
          "#fff",
        ],
        value = args[0] || "07";
      if (!/^[0-9a-f]{2}$/i.test(value))
        throw new Error("Specify two hex digits, for example COLOR 0A.");
      terminal.style.background = colors[parseInt(value[0], 16)];
      terminal.style.color = colors[parseInt(value[1], 16)];
      return "";
    }
    if (cmd === "tree") {
      const p = resolve(args.find((a) => !a.startsWith("/")) || "."),
        lines = [p.replaceAll("/", "\\")];
      const visit = (dir, depth = 0) => {
        if (depth > 20) return;
        for (const n of ctx.fs.list(dir)) {
          if (n.type === "folder") {
            lines.push("  ".repeat(depth + 1) + n.name + "/");
            visit(n.path, depth + 1);
          } else if (args.some((a) => a.toLowerCase() === "/f"))
            lines.push("  ".repeat(depth + 1) + n.name);
        }
      };
      visit(p);
      return lines.join("\n");
    }
    if (cmd === "find") {
      if (args.length < 2) throw new Error('FIND "text" filename');
      const text = ctx.fs.readFile(resolve(args.at(-1))),
        needle = args[0],
        ignore = args.includes("/i");
      return text
        .split(/\r?\n/)
        .filter((l) =>
          ignore
            ? l.toLowerCase().includes(needle.toLowerCase())
            : l.includes(needle),
        )
        .join("\n");
    }
    if (cmd === "sort")
      return ctx.fs
        .readFile(resolve(args.join(" ")))
        .split(/\r?\n/)
        .sort()
        .join("\n");
    if (cmd === "fc") {
      if (args.length < 2) throw new Error("FC file1 file2");
      const a = ctx.fs.readFile(resolve(args[0])),
        b = ctx.fs.readFile(resolve(args[1]));
      return a === b
        ? "FC: no differences encountered"
        : `Comparing ${args[0]} and ${args[1]}\nFiles differ.\nFirst file: ${a.length} characters\nSecond file: ${b.length} characters`;
    }
    if (cmd === "where")
      return (
        ctx.fs
          .search(args.join(" "))
          .map((n) => n.path.replaceAll("/", "\\"))
          .join("\n") || "INFO: Could not find files for the given pattern(s)."
      );
    if (cmd === "assoc")
      return ".txt=Notepad\n.wdoc=WordPad\n.png=Imaging\n.bmp=Imaging\n.jpg=Imaging\n.wav=Windows Media Player\n.mp3=Windows Media Player\n.html=Internet Explorer";
    if (cmd === "tasklist")
      return (
        "Image Name                       PID    Window Title\n" +
        ctx.wm.windows
          .map(
            (win) =>
              `${(win.appId + ".exe").padEnd(32)} ${String(win.id).padEnd(6)} ${win.title}`,
          )
          .join("\n")
      );
    if (cmd === "taskkill") {
      const pidIndex = args.findIndex((a) => a.toLowerCase() === "/pid"),
        pid = Number(args[pidIndex + 1]);
      const target = ctx.wm.windows.find((win) => win.id === pid);
      if (!target) throw new Error("The process could not be found.");
      await target.close();
      return target.closed
        ? "SUCCESS: The process was terminated."
        : "The process is still running.";
    }
    if (cmd === "ipconfig")
      return `Windows 2000 Browser IP Configuration\n\nBrowser Network Adapter:\n   Status . . . . . . . . : ${navigator.onLine ? "Connected" : "Disconnected"}\n   Origin . . . . . . . . : ${location.origin}\n   Local IP / gateway . . : Not exposed by browser APIs\n\nNative adapters and raw network protocols require an OS emulator.`;
    if (cmd === "ping")
      return "ICMP is not exposed by browser APIs. Use Internet Explorer for HTTP/HTTPS connectivity.";
    if (ctx.apps.some((a) => a.id === cmd || a.aliases?.includes(cmd))) {
      await ctx.run(line);
      return "";
    }
    throw new Error(
      `'${cmd}' is not recognized as an internal or external command,\noperable program or batch file. Type HELP for available commands.`,
    );
  }
  const submit = async (line) => {
    if (busy) return;
    print(promptText() + line);
    history.push(line);
    historyIndex = history.length;
    input.value = "";
    busy = true;
    input.disabled = true;
    try {
      for (const part of line.split(/\s*&&\s*/)) {
        const result = await execute(part);
        if (result) print(result);
      }
    } catch (e) {
      print(e.message);
    } finally {
      busy = false;
      input.disabled = false;
      prompt.textContent = promptText();
      input.focus();
      terminal.scrollTop = terminal.scrollHeight;
    }
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit(input.value);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      historyIndex = Math.max(0, historyIndex - 1);
      input.value = history[historyIndex] || "";
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      historyIndex = Math.min(history.length, historyIndex + 1);
      input.value = history[historyIndex] || "";
    } else if (e.key === "Tab") {
      e.preventDefault();
      const tokens = tokenizeCommand(input.value),
        last = tokens.at(-1) || "",
        match = ctx.fs
          .list(cwd)
          .find((n) => n.name.toLowerCase().startsWith(last.toLowerCase()));
      if (match) {
        tokens[tokens.length - 1] = match.name.includes(" ")
          ? '"' + match.name + '"'
          : match.name;
        input.value = tokens.join(" ");
      }
    } else if (
      e.ctrlKey &&
      e.key.toLowerCase() === "c" &&
      !window.getSelection().toString()
    ) {
      e.preventDefault();
      input.value = "";
      print("^C");
    }
  });
  terminal.addEventListener("click", () => {
    if (!window.getSelection().toString()) input.focus();
  });
  w.setContent(terminal);
  print("Microsoft Windows 2000 [Version 5.00.2195]");
  print("(C) Browser desktop reimplementation.");
  print("");
  prompt.textContent = promptText();
  queueMicrotask(() => input.focus());
  if (command) submit(command);
  w.execute = execute;
  return w;
}
