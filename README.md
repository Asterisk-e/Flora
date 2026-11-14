# Flora — offline-first creative workspace

Flora is a dependency-free HTML, CSS and JavaScript workspace for local documents, spreadsheets, presentations, notes, boards and utilities. It stores profiles and files in this browser using IndexedDB (with a localStorage fallback). There is no Flora account, cloud file store or analytics endpoint.

## Run Flora

1. Extract `Flora-Offline-Redesign.zip`.
2. Open a terminal in the `flora-offline` folder.
3. Run `python3 -m http.server 8000`.
4. Open `http://localhost:8000`.

For Amethyst on a local network, start the server with `python3 -m http.server 8000 --bind 0.0.0.0`, then let other devices on the same network open `http://<host-lan-ip>:8000`. Use your computer's LAN address, not its public address. Firewall rules may need to allow local TCP port 8000.

## First-run setup

A full-screen, animated wizard with a live preview of every look-and-feel choice:

1. **Welcome**
2. **About you** — name, optional pronouns and bio, cursor colour.
3. **How you'll use it** — pick a mode (see Modes below) and whether to add its starter files.
4. **Look and feel** — theme (Light, Dark, Paper, Match system), accent colour, text size, font, animation level.
5. **Text and encoding** — export encoding, what to do with characters that do not fit, line endings.
6. **Storage** — storage limit, a request to protect data from automatic clearing, backup reminders.
7. **All set** — an animated checklist while Flora creates the profile and applies the mode.

The same wizard is used to add another profile (one step) and for **Settings › Privacy and data › Run setup again**.

## Modes and presets

A mode sets theme, text size, font, motion, focus/break lengths, which applications and tools are pinned in the sidebar, and optional starter files. Switch at any time from the mode chip in the top bar, Home, the command palette or **Settings › Modes and presets**. Every switch can be undone.

- **Standard** — everything on.
- **School: Junior** (7 to 11) — larger text, easy-reading font, gentle motion, homework board, spelling cards, timetable.
- **School: Secondary** (11 to 18) — essays, revision cards, homework board, timetable, grade and countdown tools.
- **University** — paper theme, lecture notes, assignment tracker, reading list, 50-minute focus sessions.
- **Exam mode** — navigation locked to revision tools, notifications muted, exam countdown, 50/10 focus. "Exit" in the top bar restores your previous settings.
- **Work**, **Writer**, **Creative**, **Developer**, **Easy reading** and **Minimal**.

Modes are plain data in `presets.js`; add your own by appending to `MODES`.

## Built-in applications

- **Azalea Docs** — page-centred rich-text editor, formatting ribbon, headings, lists, alignment and document exports.
- **Amaryllis Sheets** — editable cells, CSV import/export, row/column expansion, cell references and basic arithmetic / `SUM(A1:A5)` formulas.
- **Iris Presentations** — title-and-body slides, slide ordering and presentation exports.
- **Anemone Notes** — quick plain-text notes.
- **Dahlia Boards** — lightweight sticky-note idea boards.
- **Fern Code** — a plain code editor with line numbers, smart indent, Tab / Shift+Tab, Ctrl+/ comments, JSON formatting. Exports in the language's own extension, plus `.txt`, `.md`, `.html`.
- **Lavender Sketch** — freehand drawing with pen, marker, eraser, line, box, oval and flood fill, colours, brush size and undo/redo. Exports `.png`.
- **Jasmine Flashcards** — decks with bulk paste, a flip-card study mode, "still learning" tracking and a results screen. Exports `.csv`, `.txt` (tab-separated), `.json`, `.html`.
- **Marigold Kanban** — columns, drag-and-drop (plus move buttons for touch and keyboard), labels and due dates with overdue highlighting. Exports `.json`, `.csv`, `.md`, `.html`.
- **Wisteria Journal** — one page per day, mood, search and a streak counter. Exports `.md`, `.txt`, `.html`, `.json`.
- **My files** — search, filter by type, sort by recent/name/size/type, open, rename, import, export and delete local files.

## Tools

- **Amethyst** — direct browser-to-browser Flora file transfer using WebRTC data channels. The sender creates an offer code; the receiver pastes it and creates an answer code; the sender applies that answer. Files are transferred directly in chunks and saved to the receiver's My files library.
- **Rowan Tasks** — local checklist.
- **Camellia Focus** — focus and break timer with a progress ring, tab-title countdown and a soft chime. Lengths follow your mode.
- **Flora Storage** — see Storage below.
- **Text Encoding Lab** — paste or open text and see its size, what would be lost and the raw bytes in UTF-8, UTF-8 with BOM, UTF-16 LE/BE, ASCII, Latin-1 and Windows-1252. Download in any of them.
- **Clover Calculator** — brackets, percentages, factorials, implicit multiplication; scientific mode with degrees/radians and history. Uses a real expression parser, not `eval`.
- **Unit Converter** — length, mass, volume, area, speed, time, data and temperature.
- **Grade Calculator** — weighted courses, current grade, letter and approximate GPA, and what you need on the remaining work to hit a target.
- **Timetable** — weekly grid with automatic colours, current-lesson highlight, home-page summary and "Save as spreadsheet".
- **Countdowns** — live day/hour/minute/second countdowns to exams, deadlines and events.
- **Word Stats** — words, characters, reading and speaking time, readability and most-used words for pasted text or any Flora document.

Tools can be pinned to the sidebar from **Tools** (the hub is searchable and grouped).

### Amethyst network requirements

Amethyst is designed for two users on the same local network. It uses host ICE candidates only (`iceServers: []`), so there is no external STUN/TURN service or cloud relay. Users must exchange offer/answer codes themselves, for example through a local chat. It does not automatically discover other devices. Both browsers must support `RTCPeerConnection` and permit WebRTC on the Flora origin; some browsers restrict peer connections on plain HTTP LAN origins, in which case a trusted HTTPS local deployment may be required. Treat offer and answer codes as private connection invitations and share them only with the intended recipient. The WebRTC data channel is protected by the browser transport, but Amethyst does not add account-based identity verification or approval prompts.

The local-network server command serves Flora files; it is not a permanent file relay. The transferred file travels over the peer connection and is written to the receiver's local browser database. Cross-network transfers would require additional ICE/STUN/TURN infrastructure and are not part of this offline build.

## Profiles and collaboration

Profiles are local labels inside the same browser database, not separate operating-system accounts and not password-protected. The profile menu allows switching, creating and editing profiles. Pronouns and bios are optional.

The existing collaborative editor syncs open files and broadcasts participant presence between tabs/windows on the same browser origin using `BroadcastChannel`. It shows full first names, favourite cursor colours, activity labels, and on-page cursors for document text selections (plus cell focus indicators in sheets). It is not a cloud collaboration service: separate devices and separate browsers do not share the IndexedDB workspace automatically. Amethyst transfers copies of files; it does not provide simultaneous remote editing.

Updates still use whole-file replacement (last update wins), not a conflict-free CRDT. Avoid concurrent edits to the same text range when testing multiple tabs.

## Android 13 interface

The whole interface uses the same language as Settings and Storage: a tinted canvas, large serif titles, rounded tonal cards, pill buttons and inputs, grouped lists with tight gaps and rounded ends, an ink-coloured primary button, tonal navigation pills, a rounded drawer on phones and a floating **New** button on Home and My files. The tint follows your accent colour and adapts to Light, Dark and Paper. It is a prototype layer (`android-ui.css`), so **Settings › Appearance › Android 13 style interface** switches back to classic Flora at any time.

**Home** is an Android home screen: an At-a-glance header (greeting, today's date, mode, file count and storage use), a search pill that opens the command palette, widget cards (tasks, timetable, countdown), a launcher grid of round app icons that open each application (they morph to rounded squares on hover), a dock for My files, Tools, Storage and Settings, and your recent files.

## Developer options

Hidden until you tap **Settings › About Flora › Build number** seven times, as on Android. A master switch turns every option on or off without losing your choices, and **Turn off developer mode** hides the menu again.

- **Text rendering** — font smoothing, text-rendering mode, ligatures, kerning, tabular numbers, a weight boost, letter and word spacing, line height and text direction (including right-to-left, which mirrors the whole interface). A live sample sits at the top of the section.
- **Drawing** — show layout bounds, pointer location (coordinates, input type, pressure and a ring that follows the pointer) and file IDs in My files.
- **Monitoring** — a performance monitor (frames per second, page elements, memory, stored bytes), an animation duration scale from off to 10× slow motion, and stay awake (Screen Wake Lock).
- **Debugging** — a debug log (navigation, exports, warnings and errors; in memory only, filterable and copyable), an inspector for the raw JSON of your settings, profiles, tasks, tool data and any file (settings can be edited and applied), copy settings as JSON, and build and device information.
- **Maintenance** — clear the offline cache and reload, and reset developer options.

All of these are ordinary `dev…` keys in Flora's settings, so they are saved locally in the browser database. In **Settings › Storage › Flora system** they appear as their own **Developer options** line, separate from Settings.

## Settings

Settings follow Android 13's layout: a large title, a search pill, a profile card, and drill-down pages with a back arrow. Search matches setting names, descriptions and keywords across every page. Pages: Profile, Modes and presets, Appearance, Motion and animations, Text and encoding, Storage, Files and editing, Focus and notifications, Accessibility, Privacy and data, About. Press **Ctrl+K** (or the Search button) for a command palette that opens any file, application, tool, setting or mode.

## Storage

The Storage page mirrors Android 13's: a large "used" figure, a pill bar, a **Free up space** card and one row per category with a thin bar, sorted by size. Categories are Flora's applications plus Flora system (profiles, settings, tasks and tool data). Tap a category to see its files and delete them, or open **Free up space** for suggestions (largest files, files untouched for 60 days, empty files) with a running total of what you will free. Storage limit, persistent-storage protection and the browser's own allowance are at the bottom.

Limits are logical caps in KB, MB or GB (16, 32, 64, 128, …) bounded by the browser's reported quota. The cap does not reserve disk space, and export important work regularly.

## Themes, motion and accessibility

Light is Flora's original look. **Dark**, **Paper** and **Match system** are generated from the same colour tokens (`theme.css`), so every part of the interface follows. Document and slide pages stay paper-white in dark mode. Accent colour, font (Newsreader, clean sans, monospace, easy-reading), text size (80% to 150%), density, high contrast, roomier text, large targets and underlined links are all adjustable.

Animation level is **Full**, **Gentle** (fades only) or **Off**, with a speed control, four page-transition styles, an optional startup animation, touch ripples and counting numbers. Flora also follows your device's reduce-motion setting.

## Text encodings

Exports of text, HTML, CSV, JSON, Markdown and code use the encoding chosen in Settings (UTF-8, UTF-8 with BOM, UTF-16 LE/BE, ASCII, Latin-1 or Windows-1252). For single-byte encodings you choose what happens to characters that do not fit: simplify (é to e), replace with `?`, or write an escape code (`\uXXXX`, or `&#xXXXX;` in HTML). HTML exports get a matching `<meta charset>`. Line endings can be kept, or forced to LF or CRLF. CSV can carry a UTF-8 BOM so Excel shows accents correctly. Imports detect the encoding (byte-order mark, then valid UTF-8, otherwise Windows-1252) or use one you choose. Word/Excel/PowerPoint exports, PNGs and full backups are always UTF-8.

## Backup and restore

**Settings › Privacy and data** downloads one UTF-8 JSON file with every profile, file, task and tool's data, and restores it by merging (newest edit wins; nothing is deleted). An optional reminder nudges you after 7, 14 or 30 days.

## Export formats

- Azalea Docs: `.docx` (native Open XML), `.html`, `.doc` (HTML-based Word compatibility), `.txt`, `.md`.
- Amaryllis Sheets: `.xlsx` (native Open XML), `.csv`, `.json`, `.html`.
- Iris Presentations: `.pptx` (native Open XML), `.html`, `.json`.
- Anemone Notes: `.txt`, `.md`, `.html`.
- Dahlia Boards: `.json`, `.html`.
- Fern Code, Lavender Sketch, Jasmine Flashcards, Marigold Kanban and Wisteria Journal: see Built-in applications.

Office exports are dependency-free and intentionally lightweight. `.docx` preserves basic paragraphs, headings and inline emphasis. `.xlsx` preserves cell values and basic formulas but not charts, pivot tables or advanced formatting. `.pptx` exports title-and-body slides with a simple theme; it does not include animations, transitions or embedded media.

## Offline behaviour and data

All application code and assets are local. When served from `localhost` or HTTPS, `sw.js` caches the static app shell for offline visits. The CSS requests Newsreader by name and falls back to Georgia if Newsreader is not installed locally; no remote font file is downloaded. Files, profiles, settings, tasks and tool data stay in this browser's database. Clearing browser site data can remove your workspace; export important files for backup.

## Project layout and extending Flora

```
index.html        shell, splash, sidebar container, topbar
theme.css         generated colour tokens: light, dark, paper, and light-on-dark paper surfaces
styles.css        the original interface, with every colour turned into a theme variable
features.css      settings, storage, setup, tools, new applications, motion, developer overlays
android-ui.css    the Android 13 interface layer and home screen (toggle in Appearance)
encoding.js       pure text-encoding functions (no DOM)
presets.js        modes and starter files (pure data)
export-formats.js native .docx / .xlsx / .pptx writers
app.js            core: database, files, editors, sharing, navigation, settings engine, FloraCore API
dev.js            developer options engine: text rendering, overlays, debug log, inspector
apps.js           Fern Code, Lavender Sketch, Jasmine Flashcards, Marigold Kanban, Wisteria Journal
tools.js          Text Encoding Lab, Calculator, Units, Grades, Timetable, Countdowns, Word Stats
settings.js       Android-style settings and the mode picker
storage.js        Android-style storage page, category sheets and Free up space
setup.js          first-run wizard
sw.js             offline cache (bump the version when files change)
```

`app.js` exposes `window.FloraCore`. A new file-based application calls `FloraCore.registerApp({ type, label, short, glyph, blurb, landing, extensions, newContent, renderBody, mount, exportFile })`. A new tool calls `FloraCore.registerTool({ id, title, cat, desc, render, today })`; its data can live in `FloraCore.setMeta('tool:<name>', …)`, which the storage page counts automatically. Any page can be added with `FloraCore.registerView(id, { crumb, render })`. See `apps.js` and `tools.js` for complete examples.
