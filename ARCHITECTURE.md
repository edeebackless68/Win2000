# Architecture and extension guide

## Package boundaries

| Workspace package      | Responsibility                                                                |
| ---------------------- | ----------------------------------------------------------------------------- |
| `@win2k/core`          | Event bus, virtual filesystem, paths, settings, clipboard, sound and registry |
| `@win2k/ui`            | Classic controls, menus, file dialogs, modal ownership and window manager     |
| `@win2k/rendering`     | WebGPU/WebGL 2/Canvas 2D presentation and desktop rendering                   |
| `@win2k/shell`         | Desktop, Start, taskbar, Run, session UI, screensavers and Help               |
| `@win2k/explorer`      | Files, shell namespaces, search, Recycle Bin and import/export                |
| `@win2k/accessories`   | Notepad, WordPad, Calculator, Paint, media, recording and imaging             |
| `@win2k/games`         | Minesweeper, Klondike, FreeCell and custom Pinball                            |
| `@win2k/control-panel` | Configuration pages and theme application                                     |
| `@win2k/internet`      | Browser frames, local mail, contacts and communications                       |
| `@win2k/system`        | Terminal, registry UI, tasks, reports and accessibility utilities             |

`app/main.js` is the composition root. It constructs services, registers applications and launches the shell. `app/desktop.css` contains shared design tokens and classic control/application styling. The build preserves native ES modules instead of bundling a runtime framework.

These are reusable workspace boundaries, not standalone npm distributions: UI applications expect sibling packages, shared CSS, icons, and a browser host. Pure modules can be imported independently:

- `packages/accessories/calculator-engine.js`
- `packages/accessories/raster.js`
- `packages/games/minefield.js`
- `packages/games/card-engine.js`

## Application contract

An entry point takes `(ctx, options)` and returns a window or a promise for a window. `ctx.launch(id, options)` normalizes app launches and honors singleton metadata. The registry records `id`, `name`, `icon`, `open`, optional `aliases`, and optional `singleton`.

The shared context exposes `fs`, `bus`, `settings`, `clipboard`, `sound`, `registry`, `renderer`, `wm`, `dialogs`, `launch`, `openFile`, `run`, and printing/logging helpers. The composition root also exposes this context as `window.win2k` for local development.

```js
import { el } from "../ui/index.js";

export function openExample(ctx) {
  const w = ctx.wm.create({
    appId: "example",
    title: "Example",
    icon: "document",
    width: 400,
    height: 260,
  });
  w.setContent(el("p", { text: "A shared desktop application." }));
  w.setMenu({ File: [{ label: "Close", action: () => w.close() }] });
  w.addCleanup(
    ctx.bus.on("fs:change", () => {
      // Refresh any file-based view after a successful commit.
    }),
  );
  return w;
}
```

Register the opener in `app/main.js` and add a Start-menu entry in `packages/shell/index.js` when desired.

## Window and dialog lifecycle

Windows expose `setTitle`, `setContent`, `setMenu`, `focus`, `close`, `minimize`, `maximize`, and `addCleanup`. The optional asynchronous `onClose` hook returns false to cancel closing. Register cleanup for event subscriptions, media tracks, animation frames, URLs and timers.

Dialogs default to the active window as owner. While a modal child is open, its owner is inert and focus redirects into the child. Minimize/maximize capability flags are enforced by both title controls and system menus. Closing a window waits for owned dialogs and its close hook. Callers must await mutation and dialog promises, or return them from callbacks wrapped by `safely()`.

The host document provides `desktop`, `desktop-surface`, `desktop-icons`, `windows`, `selection-rect`, `taskbar`, `menu-layer`, and `overlay-layer` IDs. See `app/index.html` for the complete host.

## Virtual filesystem

`await fs.init()` loads or seeds the filesystem. Reads such as `readFile`, `stat`, `list` and `exists` are synchronous after initialization. Mutations return promises and must be awaited. Supported operations include `writeFile`, `updateJSON`, `mkdir`, `rename`, `move`, `remove`, `restore`, `emptyRecycleBin`, `importFile` and `importSnapshot`.

Paths normalize drive letters, slashes and dot segments, and are looked up case-insensitively. Drive C is writable; drive D is a virtual read-only volume. Recycled nodes receive distinct synthetic paths while retaining their original location. Restore rejects path collisions rather than overwriting a newer file.

Mutations execute through a serialized queue, capture a rollback snapshot, persist a complete snapshot in one IndexedDB transaction, and emit `fs:change` only after success. Failed persistence restores the in-memory snapshot. The persistent store rejects stale revision writes from another tab; it does not merge independent tab snapshots. Refresh a stale tab before continuing edits.

`updateJSON(path, updater, initial)` performs a synchronous read/transform/write inside the queue. Mail and contact mutations use it so multiple app windows cannot overwrite unrelated records from stale arrays. Draft editors additionally check the stored draft identity/content before replacement.

IndexedDB uses database `windows-2000-desktop`, store `volumes`, key `C`. The backup envelope is `{format: "win2k-virtual-disk", version: 1, revision, nodes}`. Text is stored as strings; imported media uses data URLs. This design favors portability and simple transactions over large-file throughput. Full-volume snapshot writes and base64 media increase memory and storage costs.

Settings use `win2k.settings` in localStorage. Control Panel commits changed keys only. The registry is a JSON document at `C:/WINNT/system32/config/registry.json`, not a native registry hive. Filesystem backups do not include separate localStorage preferences or browser permissions.

## Events

| Event              | Meaning                                            |
| ------------------ | -------------------------------------------------- |
| `fs:change`        | A virtual-filesystem mutation committed            |
| `settings:change`  | A preference changed or a preference patch applied |
| `clipboard:change` | The shared clipboard changed                       |
| `windows:change`   | Window list, title, focus or state changed         |
| `windows:geometry` | A drag/resize finished                             |
| `renderer:change`  | Rendering backend information changed              |
| `event:added`      | A desktop log event was appended                   |
| `mail:change`      | A draft save completed                             |
| `game:win`         | A game announced a win                             |

`bus.on(name, listener)` returns an unsubscribe function. Register that function with `w.addCleanup` for app-scoped listeners.

## Rendering

`GraphicsSurface` implements a fullscreen surface. Desktop mode renders a uniform color/pattern; texture mode presents a source canvas. WebGPU uses a pipeline and copied canvas texture, WebGL 2 uses a textured quad, and Canvas 2D draws the source directly. Device/context loss triggers fallback. `DesktopRenderer` coordinates viewport size, device-pixel ratio and settings.

HTML/CSS remains responsible for text layout, menus, controls and accessibility. GPU presentation does not imply GPU execution of all drawing tools, physics or application logic. CPU submission timing is diagnostic information, not measured GPU execution time.

## Browser integration

Media and microphones use browser APIs and permissions. External web pages are sandboxed iframes; local HTML is sandboxed without scripts. Clipboard access falls back to the internal desktop clipboard when browser access is unavailable. Printing, downloading, `mailto:` and `tel:` invoke ordinary browser/device flows. Native network sockets and Windows APIs are outside the app boundary.

The service worker caches resources after use with network-first fetching. It improves revisits but does not guarantee every application is fully cached before going offline. Development `.local` hosts skip service-worker registration.

Optional WebMCP registration is feature-detected in the composition root. It exposes app discovery, app launching and virtual file listing when the host supports the expected API; this integration has not been validated in the available preview session.
