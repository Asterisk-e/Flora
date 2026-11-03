# Flora

**Flora is a local productivity suite containing five integrated applications for documents, presentations, spreadsheets, programming and graphic design.**

Flora brings everyday productivity tools together in one application, with separate workspaces for each program.

---

## Applications

Flora currently contains five applications.

### 1. Azalea — Document Editor

Azalea is a rich-text document editor designed for writing, editing and organising information.

**Features:**
- Rich-text formatting.
- Custom fonts and text sizes.
- Text colouring and highlighting.
- Headings and subheadings.
- Bulleted and numbered lists.
- Text alignment.
- Tables and hyperlinks.
- Image insertion.
- Page breaks.
- Checklists and footnotes.
- Automatic saving.
- Find and replace.
- Word and character statistics.
- Focus mode and zoom controls.
- Document templates.

**Available templates include:**
- Blank document.
- Research and class notes.
- Formal reports.
- Meeting minutes.
- Business letters.
- Project plans.
- CVs and résumés.

### 2. Iris — Presentation Designer

Iris allows users to create and deliver slide-based presentations.

**Features:**
- Create and delete slides.
- Duplicate slides.
- Reorder slides.
- Custom slide layouts.
- Custom slide backgrounds.
- Multiple presentation themes.
- Custom text sizes.
- Image insertion.
- Slide transitions.
- Full-screen presentation mode.
- Keyboard navigation.
- Presentation export.

**Available themes:**
- Light.
- Dark.
- Blue.
- Warm.
- Minimal.
- High contrast.

**Available templates include:**
- Clean starter presentation.
- Project pitch.
- Lesson or lecture.
- Business report.
- Portfolio showcase.

### 3. Amaryllis — Spreadsheet Editor

Amaryllis provides a simple spreadsheet workspace for organising information and performing calculations.

**Features:**
- Editable spreadsheet cells.
- Rows and columns.
- Formula input.
- Automatic formula recalculation.
- Add and remove rows.
- Add and remove columns.
- CSV export.

**Supported basic formulas:**
- Arithmetic calculations.
- SUM
- AVERAGE
- MIN
- MAX
- COUNT
- COUNTA

**Available templates include:**
- Blank workbook.
- Monthly budget.
- Task tracker.
- Inventory list.
- Gradebook.
- Weekly schedule.

### 4. Lupine — Code Editor

Lupine is Flora's built-in programming and scripting editor.

**Features:**
- Syntax highlighting.
- Programming language selection.
- Automatic file extension adjustment.
- Line numbers.
- Configurable indentation.
- Automatic indentation.
- Optional line wrapping.
- Code copying.
- Code export.

**Supported languages:**
- Python
- JavaScript
- TypeScript
- Java
- C
- C#
- C++
- Go
- Rust
- Ruby
- PHP
- Lua
- Shell
- SQL
- JSON
- Plain text

### 5. Anemone — Poster Studio

Anemone is a poster and graphic-design workspace built around positioned objects.

**Features:**
- Drag-and-drop text objects.
- Drag-and-drop images.
- Rectangles, circles and stars.
- Custom object colours.
- Custom poster backgrounds.
- Object positioning.
- Object resizing.
- Object selection.
- Layer ordering.
- Duplicate and delete objects.
- Grid visibility.
- Snap-to-grid.
- PNG export.

**Available templates include:**
- Blank canvas.
- Event announcement.
- Sale or promotion.
- School project.
- Wide information banner.

---

## Home Dashboard

Flora includes a central home dashboard that provides access to its applications and workspace information.

The dashboard includes:
- Application navigation.
- Recent documents.
- Storage information.
- Usage statistics.
- Quick access to settings.
- Profile information.

The sidebar can be expanded or collapsed. When collapsed, storage usage is displayed using a circular indicator.

---

## Storage System

Flora provides configurable local storage allowances.

Every available storage setting is free.

**Available storage limits:**

| Category | Options |
|---|---|
| Kilobytes | 35 KB, 50 KB, 350 KB, 500 KB, 750 KB |
| Megabytes | 1 MB, 2 MB, 5 MB, 10 MB, 25 MB, 50 MB, 75 MB, 100 MB, 150 MB, 250 MB, 350 MB, 500 MB, 750 MB |
| Gigabytes | 1 GB, 2 GB, 3 GB, 4 GB, 6 GB, 8 GB, 12 GB, 16 GB, 24 GB, 32 GB, 48 GB, 64 GB, 96 GB, 128 GB, 192 GB, 256 GB, 512 GB |
| Terabytes | 1 TB |

Storage is configured using a slider rather than a traditional selection menu.

**Important:** These values represent Flora's application storage limits. Actual available storage depends on browser and device restrictions. Selecting a larger allowance does not guarantee that the browser can physically allocate that amount.

---

## Usage Tracker

Flora includes a local usage tracker that records storage snapshots and application activity.

It provides three views:

- **Hourly:** Recent activity across 24 hourly periods.
- **Daily:** Activity across 30 daily periods.
- **Monthly:** Activity across 12 monthly periods.

Usage information includes:
- Latest recorded storage usage.
- Recorded storage changes.
- Number of recorded activity events.
- Historical usage charts.

Tracking can be disabled in Settings.

The tracker is based on recorded application activity, not continuous operating-system monitoring.

---

## Profiles and Security

Flora supports multiple local user profiles.

Each profile can have:
- Its own documents.
- Its own files.
- Its own password.
- Its own sign-in session.

The main profile acts as the administrator.

Administrators can:
- Create additional profiles.
- Enable or disable shared storage.
- Configure application presets.
- Manage the global storage allowance.

When shared storage is enabled, profiles share the same storage allowance without sharing their documents.

Passwords are checked using salted PBKDF2 password hashing through the browser's Web Crypto API.

**Security limitation:** Profile passwords provide a local sign-in restriction, not document encryption. Documents and files are not encrypted at rest.

---

## Settings

Flora provides a categorised settings panel.

Current categories include:

| Category | Purpose |
|---|---|
| General | General application preferences |
| Appearance | Themes, colours and interface appearance |
| Accessibility | Text size, contrast and accessibility preferences |
| Storage | Storage allowance and usage |
| Profiles | Local profiles and profile management |
| Security | Local password protection information |
| Applications | Application presets and defaults |
| Lupine | Programming language and code-editor preferences |
| Presentations | Default presentation appearance and transitions |
| Poster Studio | Poster backgrounds and design preferences |
| Backup and Data | Profile backup |
| Privacy | Usage tracking and activity history |

### Accessibility

Accessibility options include:
- Larger interface text.
- High-contrast mode.
- Reduced motion.
- Screen-reader support preferences.
- Spell-check controls.

### Application Presets

The administrator can select one of three presets:

- Personal Use
- Family Use
- Enterprise Use

These presets adjust selected application preferences. They do not provide cloud-based administration or enterprise identity management.

---

## How Flora Works

Flora is a browser-based application built using:

- HTML
- CSS
- JavaScript
- IndexedDB
- Local Storage
- Web Crypto API
- Canvas API

The application runs within the browser rather than requiring a traditional desktop installation.

### Local Data Storage

Flora uses IndexedDB to store documents and files on the device.

Local Storage is used for application preferences, profiles and usage history.

This means:
- No Flora cloud account is required.
- Documents are stored locally.
- Profiles are local to the browser.
- Documents are not automatically synchronised between devices.
- Clearing browser data can delete locally stored content.

Users should regularly create backups of important work.

### Exports

Flora supports different export formats depending on the application.

**Azalea:**
PDF, DOCX, EPUB, HTML, Markdown, TXT, JSON, CSV and ZIP.

**Iris:**
HTML presentation export.

**Amaryllis:**
CSV export.

**Lupine:**
Programming-language-specific source files and additional code formats.

**Anemone:**
PNG poster export.

---

## Installation and Usage

Flora is distributed as an HTML application.

1. Download or clone the repository.
2. Locate the main `Flora.html` application.
3. Open it in a supported modern browser.
4. Sign in to your local profile.
5. Select an application from the sidebar.
6. Start creating.

Some browser environments may require a compatible download integration for file exports. Browser storage and Web Crypto capabilities also depend on the browser context.

---

## Privacy

Flora is designed around local storage.

The current application does not provide:
- Cloud document synchronisation.
- Online user accounts.
- Automatic remote backups.
- Real-time collaboration.
- Encrypted document storage.

Your locally stored documents remain associated with the browser and device in which they were created.

For important documents, maintain external backups.

---

## Project Information

**Project:** Flora  
**Applications:** Azalea, Iris, Amaryllis, Lupine and Anemone  
**Platform:** Browser-based  
**Architecture:** Client-side HTML, CSS and JavaScript  
**Storage:** IndexedDB and Local Storage  
**Default Theme:** Warm pastel yellow  
**Default Document Font:** Newsreader

---

## Development Status

Flora is an evolving productivity suite. Features and application functionality may change as development continues.

Suggestions, bug reports and feature requests are welcome.

**Flora — Five creative tools. One workspace.**
