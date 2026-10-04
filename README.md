# Windows 2000 Professional — browser desktop

**Live demo:** https://wieslawsoltes.github.io/Win2000/ — `node scripts/build-pages.mjs` writes the static site to `_site/` with relative URLs so it works under any base path; the `Deploy to GitHub Pages` workflow publishes it on every push to `main`.

A modular browser recreation of the Windows 2000 desktop, with 38 registered program entries, a shared virtual drive, document editors, drawing, playable games, media tools, and classic window management.

The implementation uses HTML, CSS, and native JavaScript modules. Canvas presentation selects WebGPU, then WebGL 2, then Canvas 2D. Text and controls use the DOM. There are no external runtime dependencies.

## Run

Requires Node.js 20 or newer. No dependency installation is required.

```sh
npm run dev
```

Open the local address printed by the server. The default port is 4173. To choose another port:

```sh
npm run dev -- --port 8080
```

```sh
npm run check
npm test
npm run build
```

The static build is written to `dist/`. Serve that directory at an HTTP(S) origin root. The app uses absolute `/packages/`, `/assets/`, `/main.js`, and `/desktop.css` URLs; opening `index.html` through `file://` is unsupported.

## First steps

- Use Start → Programs, desktop icons, or Start → Run to open apps.
- Try Run commands `notepad`, `mspaint`, `calc`, `winmine`, `sol`, `freecell`, `pinball`, `cmd`, `regedit`, and `control`.
- Files saved by an editor appear in Explorer. Import files through Explorer, or drop files onto the desktop. Export individual files using Download.
- Control Panel → System → Backup exports the virtual filesystem as JSON. Settings and task definitions are stored separately and are not included in this filesystem backup.
- Right-click windows and taskbar buttons for window operations. Drag title bars and borders to move and resize windows.
- Ctrl+Esc opens Start; Ctrl+Shift+Esc opens Task Manager. Alt+Tab and Alt+F4 work when the browser delivers those keys. Browser/OS shortcuts may take precedence.

## Renderer selection

The default renderer attempts WebGPU, WebGL 2, then Canvas 2D. The desktop background, Paint presentation, and Pinball presentation use the reusable rendering package. Paint raster editing and game physics run in JavaScript.

Use `?renderer=canvas2d`, `?renderer=webgl2`, or `?renderer=webgpu` for renderer selection; unsupported backends fall back. `?app=notepad` launches a registered app after startup. About Windows and System Information report the selected renderer.

## Source organization

See [ARCHITECTURE.md](ARCHITECTURE.md) for the ten packages, public interfaces, event model, persistence, and extension example. Pure calculator, minefield, card-rule, and raster modules can be reused without the desktop UI.

## Compatibility and validation

This is a browser reimplementation. It does not run the Windows NT kernel, native Windows executables, services, drivers, or the original applications. Some program entries are simplified utilities or adapters to browser/device capabilities. Period styling is implemented, but exact pixel-for-pixel equivalence to every Windows 2000 screen has not been established.

Read [COMPATIBILITY.md](COMPATIBILITY.md) for the complete program matrix and known differences. [TESTING.md](TESTING.md) records the checks performed and the unverified areas. [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) distinguishes authored code, Wine replacement fonts, and historical icon imagery.

## Data

Files persist in IndexedDB on the current browser origin. Settings persist in localStorage. Clearing site data removes those records. Use filesystem backups for files you need to retain. Native filesystem operations affect only the virtual drive unless you explicitly import, download, print, or invoke a device/browser handoff.

The virtual lock screen is an interface feature; it is not an authentication or security boundary. The hosted site has its own access controls.
