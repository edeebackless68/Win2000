# Compatibility matrix

## Scope

This project recreates the Windows 2000 desktop interface and selected workflows in a browser. It does **not** implement all Windows 2000 OS features or every original application feature, and is not a verified pixel-perfect clone. It includes 38 registered entries; several share an implementation or primarily provide reports/adapters.

**Core**: principal browser workflow implemented. **Partial**: reduced feature set. **Adapter**: browser/device integration. **Info**: report or launcher. These labels describe implementation scope, not completed end-to-end verification or native parity.

| Program              | Scope   | Implemented                                                                      | Material differences                                                                 |
| -------------------- | ------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Explorer             | Core    | Virtual files, views, search, CRUD, Recycle Bin, import/download.                | No native NTFS, host filesystem, SMB or Windows permissions.                         |
| Notepad              | Core    | Plain text, undo, find/replace, wrap, font, save/open/print.                     | No original text-control or encoding compatibility guarantee.                        |
| WordPad              | Partial | Rich text, lists, alignment, images, HTML export, .wdoc save.                    | Only custom .wdoc preserves formatting; RTF is basic text import.                    |
| Paint                | Partial | Drawing, fill, shapes, selection, undo, transforms, import and PNG save.         | 4096×4096 limit; free-form selection uses a rectangle; curves/text simplified.       |
| Calculator           | Partial | Arithmetic, memory, repeated equals and selected scientific functions.           | JavaScript numeric precision; incomplete original scientific/base/bitwise functions. |
| Windows Media Player | Core    | Audio/video, seeking, playlist, repeat, speed and spectrum.                      | Uses browser codecs; no Windows codec DLLs or legacy DRM.                            |
| CD Player            | Adapter | Imported-audio playback with CD Player title.                                    | No physical audio CD or CD-ROM access.                                               |
| Sound Recorder       | Partial | Microphone capture, playback and PCM WAV save with dirty guards.                 | Permission/codecs apply; playback-speed effects do not rewrite saved audio.          |
| Volume Control       | Partial | Desktop master/wave level, mute and stereo balance where supported.              | Controls app audio, not the host OS mixer or independent hardware channels.          |
| Imaging              | Partial | Image viewing, zoom, rotation, print/download and Paint handoff.                 | Rotation is view-only; download keeps original. No scanning/OCR/multipage editing.   |
| Internet Explorer    | Adapter | Addresses, favorites/history, local HTML, web frames and external opening.       | Modern browser engine; embedding may be refused; no ActiveX, VBScript or Trident.    |
| Outlook Express      | Partial | Local drafts, compose/reply, .eml export and mailto handoff.                     | No SMTP/POP3/IMAP delivery or retrieval; sending completes externally.               |
| Address Book         | Core    | Contact CRUD/search, JSON export and compose handoff.                            | No WAB format or directory-service integration.                                      |
| HyperTerminal        | Adapter | Loopback, WebSocket/Web Serial, text and log capture.                            | No raw modem/Telnet sockets or complete terminal escape emulation.                   |
| Phone Dialer         | Adapter | Keypad and tel handoff.                                                          | Requires external telephone handler; no voice-modem control.                         |
| Synchronize          | Info    | Waits for pending virtual-file writes and reports completion.                    | No remote/server/mail/device synchronization.                                        |
| Minesweeper          | Core    | Levels/custom board, flags, questions, chord, timer and best times.              | 9×9 Beginner and safe first-click neighborhood; native RNG parity unverified.        |
| Solitaire            | Core    | Klondike, draw 1/3, legal moves, scoring, undo, hints and auto-foundation.       | Custom cards and simplified original options/scoring.                                |
| FreeCell             | Core    | Free cells, sequence limits, undo, hints and deterministic game numbers.         | Deal numbers are specific to this implementation.                                    |
| Pinball              | Partial | Playable table, flippers, plunger, bumpers, nudge, 3 balls and scores.           | Custom table; original Space Cadet artwork, missions and exact physics absent.       |
| Command Prompt       | Partial | Virtual file/text commands, environment, history, completion and launching.      | Simplified parser; no native executables, complete batch language or pipes.          |
| Task Manager         | Core    | Window/process list, switch/close/run, event-loop and available JS heap reports. | Processes are desktop windows; no host process/CPU management.                       |
| Registry Editor      | Partial | Virtual keys/values, search and JSON import/export.                              | No native hives or Windows .reg compatibility.                                       |
| System Information   | Core    | Browser capabilities, renderer, virtual storage and text export.                 | Only browser-exposed information; no comprehensive hardware inventory.               |
| Device Manager       | Info    | Browser/API capability inventory.                                                | No native devices, drivers, enable/disable or installation.                          |
| Event Viewer         | Core    | Session events, details, filter, clear and JSON export.                          | In-memory desktop log, capped at 500; no native System/Security logs.                |
| Scheduled Tasks      | Partial | Persisted delayed/repeating app launches, run, pause and delete.                 | Page must remain alive; background suspension delays tasks.                          |
| Disk Management      | Info    | Virtual volume/record summaries, analysis, map and JSON backup.                  | No physical disks, partitions, formatting or native disk images.                     |
| Disk Defragmenter    | Info    | Virtual-record analysis and backup interface.                                    | Does not defragment/reorganize records; IndexedDB manages storage.                   |
| Character Map        | Partial | ASCII/Latin-1, font choice, code points, string building and copy.               | Restricted character ranges; no complete Unicode/font inventory.                     |
| ClipBook Viewer      | Partial | Internal text/file clipboard, changes, clear and text download.                  | No host clipboard-format or shared ClipBook-page compatibility.                      |
| On-Screen Keyboard   | Partial | Text insertion, backspace, newline, spaces and letter case.                      | No OS keystroke injection; modifier/shifted punctuation support incomplete.          |
| Magnifier            | Partial | CSS desktop/window zoom and reset.                                               | No separate lens, cursor tracking or host-screen magnification.                      |
| Control Panel        | Partial | 18 pages, theme/clock/sounds/settings, reports and filesystem backups.           | Some applets are informational; no native OS/hardware/security configuration.        |
| Windows Help         | Core    | Project topics, search, navigation, related links and printing.                  | No native .hlp/.chm engine.                                                          |
| Getting Started      | Info    | Introductory links and startup preference.                                       | No native setup/tour engine.                                                         |
| About Windows        | Info    | Recreation version, user, renderer and compatibility information.                | Displayed Windows-era branding does not indicate a running NT kernel.                |
| Run                  | Core    | App IDs/aliases, virtual paths, web URLs and command history.                    | Aliases select JavaScript apps; they do not execute Windows binaries.                |

## Operating-system boundary

The project does not include an x86 emulator, Windows installation media, NT kernel, native executable loader, Win32 API compatibility layer, drivers, services, native registry, Active Directory, SMB networking, NTFS permissions, account isolation or Windows security boundaries. Native `.exe`, `.dll`, `.sys` and installer files cannot run here. The virtual lock/shutdown/restart controls affect the web desktop.

Real native OS/application compatibility would require an emulator or virtualization runtime and an appropriately licensed Windows installation. That is a separate architecture from this HTML/JavaScript recreation.

## Visual fidelity

The UI uses Windows 2000-era colors, square beveled controls, title gradients, compact menus, Wine Tahoma replacement fonts and historical Windows-family icons. Some icons come from Windows 98 archives; the fonts are not Microsoft's Tahoma binaries. Browser font rasterization, zoom, device pixel ratio, native form controls, app-specific layouts and simplified game artwork introduce differences. No exhaustive screenshot-diff baseline exists for original Windows 2000 screens.

## Persistence and browser constraints

Files use IndexedDB; settings use localStorage. The JSON filesystem backup contains files/folders and registry data, but not separate settings, task definitions or browser permissions. Multiple desktop windows share serialized writes; stale writes from another tab are rejected instead of merged. Large imported media consumes extra memory/storage because it is retained as data URLs and committed in full-volume snapshots.

Clipboard, recording, serial ports, media codecs, GPU, printing and external handlers depend on browser support and permissions. Embedded websites can refuse frames. Scheduled tasks require a live page. Offline use requires relevant resources to have been cached. This implementation does not turn browser storage into a native protected filesystem.
