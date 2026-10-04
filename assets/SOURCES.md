# Retro desktop asset sources

Historical reference assets bundled with this browser recreation. All PNGs are downloaded source images; no generated or hand-drawn artwork is included.

## Icon mapping

Files are in `icons/`. For every stem below, both `-16x16.png` and `-32x32.png` are present.

| UI item | Filename stem | Source |
| --- | --- | --- |
| My Computer | `my-computer` | 98.js |
| My Documents | `my-documents` | 98.js |
| My Documents folder | `my-documents-folder` | 98.js |
| Recycle Bin, empty | `recycle-bin` | 98.js |
| Recycle Bin, full | `recycle-bin-full` | 98.js |
| Network Places / Neighborhood | `network` | 98.js |
| Internet Explorer | `internet-explorer` | 98.js |
| Paint | `paint` | 98.js |
| Notepad | `notepad` | 98.js |
| Calculator | `calculator` | 98.js |
| Games (joystick) | `games` | React95 Joy102, 8-bit color variants |
| Minesweeper | `minesweeper` | 98.js |
| Solitaire | `solitaire` | 98.js |
| Control Panel | `control-panel` | Alex Meub Windows 98 icon archive |
| Settings | `settings` | 98.js |
| Start > Settings | `start-settings` | 98.js |
| Run | `run` | 98.js |
| Shut Down | `shutdown` | 98.js |
| Log Off | `logoff` | 98.js |
| Programs | `programs` | 98.js |
| Programs folder | `programs-folder` | 98.js |
| Folder, closed | `folder` | 98.js |
| Folder, open | `folder-open` | 98.js |
| Help | `help` | 98.js |
| Find | `find-file` | 98.js |
| Volume | `speaker` | 98.js |
| Generic document | `document` | 98.js |
| Hard disk | `hard-disk-drive` | 98.js |

Additional original Windows logos exist at 16, 22, and 32 pixels. Use their intrinsic sizes or integer scaling; render images with `image-rendering: pixelated` when scaled.

## Exact original URLs

The full per-file URLs, local paths, bytes, and image dimensions are in `sources.json`.

- 98.js root: https://github.com/1j01/98
- Most icons: `https://raw.githubusercontent.com/1j01/98/master/images/icons/{filename}`
- Games 16: https://raw.githubusercontent.com/React95/React95/master/packages/icons/png/Joy102_16x16_8.png
- Games 32: https://raw.githubusercontent.com/React95/React95/master/packages/icons/png/Joy102_32x32_8.png
- Control Panel 16: https://win98icons.alexmeub.com/icons/png/directory_control_panel-1.png
- Control Panel 32: https://win98icons.alexmeub.com/icons/png/directory_control_panel-2.png
- Windows 98 icon archive: https://win98icons.alexmeub.com/

## Icon reuse and provenance

98.js explicitly says its project is not yet licensed and is source available, not open source. The relevant README is saved as `licenses/98js-README.md`.

React95 is MIT for its own code, but its LICENSE explicitly excludes Windows and associated images and identifies them as Microsoft property. The complete notice is saved as `licenses/react95-LICENSE.txt`. Do not claim that the original Windows icons are MIT licensed.

The Alex Meub archive provides historical Windows icon downloads. No asset-specific reuse license was identified during this check.

These are public historical image sources, not a transfer of copyright or an assertion that the images have a permissive open-source license.

## Browser font

Recommended for the Windows 2000-like UI:

- `fonts/tahoma.ttf` — Wine Tahoma regular, 143,884 bytes.
- `fonts/tahomabd.ttf` — Wine Tahoma bold, 137,836 bytes.
- Original regular source: https://raw.githubusercontent.com/wine-mirror/wine/master/fonts/tahoma.ttf
- Original bold source: https://raw.githubusercontent.com/wine-mirror/wine/master/fonts/tahomabd.ttf

These are Wine's replacement fonts, not the proprietary Microsoft Tahoma font. Their embedded copyright names Larry Snyder (2004) and the Bitstream Vera Sans source (2003). Embedded name-table license metadata explicitly declares LGPL version 2.1 or later. The name-table embedding flag `fsType` is 0. Their notices were extracted unchanged to `licenses/tahoma.ttf-LICENSE.txt` and `licenses/tahomabd.ttf-LICENSE.txt`; the LGPL text is `licenses/wine-COPYING.LIB`. Original editable font sources are retained as `licenses/tahoma.sfd` and `licenses/tahomabd.sfd`.

They can be loaded directly by browsers using `@font-face` with `format('truetype')`, weight 400 for regular and 700 for bold. A useful family stack is `"Desktop Tahoma", Tahoma, Arial, sans-serif`. Native 11px text is a starting point for menu labels, with 12–13px for more readable app content.

The R95-fonts alternative offers converted Microsoft bitmap fonts but explicitly retains Microsoft's original bitmap-data copyright; only its conversion tooling is MIT. It was not selected as the primary reusable font. Source: https://github.com/React95/R95-fonts
