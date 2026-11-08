# Flora — offline-first creative workspace

Flora is a dependency-free HTML, CSS and JavaScript workspace for local documents, spreadsheets, presentations, notes, boards and utilities. It stores profiles and files in this browser using IndexedDB (with a localStorage fallback). There is no Flora account, cloud file store or analytics endpoint.

## Run Flora

1. Extract `Flora-Offline.zip`.
2. Open a terminal in the `flora-offline` folder.
3. Run `python3 -m http.server 8000`.
4. Open `http://localhost:8000`.

For Amethyst on a local network, start the server with `python3 -m http.server 8000 --bind 0.0.0.0`, then let other devices on the same network open `http://<host-lan-ip>:8000`. Use your computer's LAN address, not its public address. Firewall rules may need to allow local TCP port 8000.

## First-run setup

The first-run wizard has four steps: local profile and cursor colour, workspace appearance and navigation density, virtual storage cap, and a local privacy review. Names, cursor colours, bios and optional pronouns can be edited later from Profile settings by opening the profile menu and selecting Edit current profile.

## Built-in applications

- **Azalea Docs** — page-centred rich-text editor, formatting ribbon, headings, lists, alignment and document exports.
- **Amaryllis Sheets** — editable cells, CSV import/export, row/column expansion, cell references and basic arithmetic / `SUM(A1:A5)` formulas.
- **Iris Presentations** — title-and-body slides, slide ordering and presentation exports.
- **Anemone Notes** — quick plain-text notes.
- **Dahlia Boards** — lightweight sticky-note idea boards.
- **My files** — search, filter, open, rename, import, export and delete local files.

## Tools

- **Amethyst** — direct browser-to-browser Flora file transfer using WebRTC data channels. The sender creates an offer code; the receiver pastes it and creates an answer code; the sender applies that answer. Files are transferred directly in chunks and saved to the receiver's My files library.
- **Rowan Tasks** — local checklist.
- **Camellia Focus** — focus and break timer.
- **Flora Storage** — local usage and storage cap overview.

### Amethyst network requirements

Amethyst is designed for two users on the same local network. It uses host ICE candidates only (`iceServers: []`), so there is no external STUN/TURN service or cloud relay. Users must exchange offer/answer codes themselves, for example through a local chat. It does not automatically discover other devices. Both browsers must support `RTCPeerConnection` and permit WebRTC on the Flora origin; some browsers restrict peer connections on plain HTTP LAN origins, in which case a trusted HTTPS local deployment may be required. Treat offer and answer codes as private connection invitations and share them only with the intended recipient. The WebRTC data channel is protected by the browser transport, but Amethyst does not add account-based identity verification or approval prompts.

The local-network server command serves Flora files; it is not a permanent file relay. The transferred file travels over the peer connection and is written to the receiver's local browser database. Cross-network transfers would require additional ICE/STUN/TURN infrastructure and are not part of this offline build.

## Profiles and collaboration

Profiles are local labels inside the same browser database, not separate operating-system accounts and not password-protected. The profile menu allows switching, creating and editing profiles. Pronouns and bios are optional.

The existing collaborative editor syncs open files and broadcasts participant presence between tabs/windows on the same browser origin using `BroadcastChannel`. It shows full first names, favourite cursor colours, activity labels, and on-page cursors for document text selections (plus cell focus indicators in sheets). It is not a cloud collaboration service: separate devices and separate browsers do not share the IndexedDB workspace automatically. Amethyst transfers copies of files; it does not provide simultaneous remote editing.

Updates still use whole-file replacement (last update wins), not a conflict-free CRDT. Avoid concurrent edits to the same text range when testing multiple tabs.

## Storage limits

Flora offers configurable logical caps in KB, MB or GB using powers of two beginning at 16 (16, 32, 64, 128, …). Choices are bounded by the browser's reported site-storage quota where available. The cap does not reserve disk space. Browser quota differs by browser/device and can be reduced by other site data. The storage bar animates newly added usage in blue before merging it into the warm base bar. Export important work regularly.

## Export formats

- Azalea Docs: `.docx` (native Open XML), `.html`, `.doc` (HTML-based Word compatibility), `.txt`, `.md`.
- Amaryllis Sheets: `.xlsx` (native Open XML), `.csv`, `.json`, `.html`.
- Iris Presentations: `.pptx` (native Open XML), `.html`, `.json`.
- Anemone Notes: `.txt`, `.md`, `.html`.
- Dahlia Boards: `.json`, `.html`.

Office exports are dependency-free and intentionally lightweight. `.docx` preserves basic paragraphs, headings and inline emphasis. `.xlsx` preserves cell values and basic formulas but not charts, pivot tables or advanced formatting. `.pptx` exports title-and-body slides with a simple theme; it does not include animations, transitions or embedded media.

## Offline behaviour and data

All application code and assets are local. When served from `localhost` or HTTPS, `sw.js` caches the static app shell for offline visits. The CSS requests Newsreader by name and falls back to Georgia if Newsreader is not installed locally; no remote font file is downloaded. Files, profiles, settings and tasks stay in this browser's database. Clearing browser site data can remove your workspace; export important files for backup.
