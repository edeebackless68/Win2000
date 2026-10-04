# Validation record

## Automated checks

`npm test` runs Node's built-in test runner against the filesystem and pure app engines. The suite contains 19 tests covering:

- Path normalization and case-insensitive virtual-file operations.
- Rollback after persistence failures.
- Recycle/restore collision handling, descendant preservation and permanent cleanup.
- Concurrent import filename allocation and concurrent JSON-record mutations.
- Invalid JSON and failed JSON writes without silent data replacement.
- Copy/move invariants, partial cut-paste recovery, read-only drives and reserved names.
- Snapshot backup/restore of live and recycled records.
- Calculator chaining, repeated equals, pending unary operations, memory, clear entry, percentages and scientific operations.
- Minefield first-click protection, completion and flag/question cycles.
- Card uniqueness and stacking rules.
- Flood-fill boundaries.

`npm run check` validates the syntax of every JavaScript module. `npm run build` produces a static unbundled application. These checks do not constitute end-to-end validation of every application or every browser API.

## Source review and fixes

Targeted reviews covered filesystem durability, editor save/dirty handling, calculator state, Paint edits, game rules, menus/dialogs, mail/contact persistence, Control Panel settings, recorder lifecycle and communications cleanup. Fixes include serialized JSON updates, stable draft IDs and full-field dirty baselines, settings patches limited to changed keys, awaited recorder shutdown, per-connection transport state, modal owner inertness and system-menu capability enforcement.

## Browser observations

The development preview successfully displayed the Windows 2000 desktop, initial My Computer window, Welcome window, taskbar, icons and period styling. This was a visual startup observation, not an exhaustive UI regression run.

Later preview attempts displayed a different desktop build at the shared preview address. A subsequent reload was rejected by browser navigation policy. No workaround was attempted. Final code changes were therefore validated by source review, syntax checks and the automated suite rather than a complete browser walkthrough.

## Explicitly unverified

- Exhaustive pixel comparisons against original Windows 2000 screenshots.
- Every application menu and multi-window workflow in a live browser.
- WebGPU/WebGL device-loss behavior across hardware/vendors.
- Microphone permission, Web Serial hardware and real WebSocket gateways.
- External mail/telephone handlers, physical-device integration and print dialogs.
- Complete cross-browser/media-codec and mobile/touch compatibility.
- Browser IndexedDB failure injection and cross-tab revision handling with real browser stores (filesystem logic tests use an injectable in-memory store).
- Optional WebMCP host registration.

## Manual follow-up procedure

1. At 100% browser zoom, inspect Start, taskbar, window borders and title bars; open, drag, resize, minimize and restore windows.
2. Create a Notepad file, save it, reopen it through Explorer, edit and cancel/confirm dirty-close prompts.
3. Copy a folder, recycle it, create another at the original path, and confirm restore rejects the collision. Export a JSON filesystem backup.
4. Draw and save a PNG in Paint, reopen in Imaging, and confirm image pixels and undo.
5. Open two contact/mail windows and confirm independent changes persist; save and reopen a complete draft.
6. Change settings in two separate Control Panel dialogs and confirm applying one preserves unrelated changes from the other.
7. Test Calculator pending-operator/unary combinations and play each game through legal and invalid moves.
8. With explicit device permission, record audio, stop, cancel a dirty-close prompt, save WAV and play it back.
9. Repeat relevant visual checks with `?renderer=canvas2d` and `?renderer=webgl2`; inspect the renderer report.
10. Reload to verify persistence and exercise offline operation only after the needed resources have been cached.
