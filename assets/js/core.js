const DB_NAME = "flora-workspace";
const DB_VERSION = 1;

export class FloraStore {
  constructor() { this.dbPromise = this.open(); }
  open() {
    if (!("indexedDB" in window)) return Promise.resolve(null);
    return new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("records")) db.createObjectStore("records", { keyPath: "key" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  }
  async get(key, fallback = null) {
    const db = await this.dbPromise;
    if (!db) { try { return JSON.parse(localStorage.getItem(`flora:${key}`)) ?? fallback; } catch { return fallback; } }
    return new Promise((resolve) => {
      const req = db.transaction("records", "readonly").objectStore("records").get(key);
      req.onsuccess = () => resolve(req.result?.value ?? fallback);
      req.onerror = () => resolve(fallback);
    });
  }
  async set(key, value) {
    const db = await this.dbPromise;
    if (!db) { localStorage.setItem(`flora:${key}`, JSON.stringify(value)); return; }
    return new Promise((resolve, reject) => {
      const tx = db.transaction("records", "readwrite");
      tx.objectStore("records").put({ key, value });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  async remove(key) {
    const db = await this.dbPromise;
    if (!db) { localStorage.removeItem(`flora:${key}`); return; }
    return new Promise((resolve, reject) => {
      const tx = db.transaction("records", "readwrite");
      tx.objectStore("records").delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export function downloadFile(filename, content, type = "text/plain;charset=utf-8") {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]);
}

export class FloraApp {
  constructor() {
    this.shell = document.querySelector("#flora-shell");
    this.workspace = document.querySelector("#workspace");
    this.title = document.querySelector("#page-title");
    this.status = document.querySelector("#save-status");
    this.store = new FloraStore();
    this.active = "home";
    this.cleanup = null;
    this.settings = { theme: "warm", reducedMotion: false, compact: false };
  }
  async init(apps) {
    this.apps = apps;
    this.settings = { ...this.settings, ...(await this.store.get("settings", {})) };
    this.applySettings();
    document.querySelectorAll("[data-open]").forEach(button => button.addEventListener("click", () => this.open(button.dataset.open)));
    document.querySelector("#sidebar-toggle").addEventListener("click", () => this.toggleSidebar());
    document.querySelector("#mobile-menu").addEventListener("click", () => this.shell.classList.toggle("mobile-open"));
    document.querySelector("#theme-toggle").addEventListener("click", () => this.cycleTheme());
    await this.updateStorageEstimate();
    this.open("home");
  }
  async open(name) {
    if (this.cleanup) { this.cleanup(); this.cleanup = null; }
    this.active = name;
    this.title.textContent = name === "home" ? "Home" : name === "settings" ? "Settings" : this.apps[name]?.title || name;
    document.querySelectorAll("[data-open]").forEach(button => button.classList.toggle("active", button.dataset.open === name));
    this.shell.classList.remove("mobile-open");
    if (name === "home") { this.renderHome(); return; }
    if (name === "settings") { this.renderSettings(); return; }
    const app = this.apps[name];
    if (!app) { this.toast("That application is not available."); this.open("home"); return; }
    this.workspace.innerHTML = "<div class='panel'><p class='muted'>Opening workspace…</p></div>";
    const cleanup = await app.mount(this.workspace, this.context());
    this.cleanup = typeof cleanup === "function" ? cleanup : null;
  }
  context() {
    return {
      store: this.store,
      toast: message => this.toast(message),
      download: downloadFile,
      setStatus: message => { this.status.textContent = message; },
      open: name => this.open(name),
      updateStorage: () => this.updateStorageEstimate()
    };
  }
  renderHome() {
    const cards = [
      ["azalea", "A", "Azalea", "Write, format and organise documents."],
      ["iris", "I", "Iris", "Build presentations and slide decks."],
      ["amaryllis", "S", "Amaryllis", "Organise data in spreadsheets."],
      ["lupine", "L", "Lupine", "Write and edit source code."],
      ["anemone", "P", "Anemone", "Design posters and graphics."]
    ];
    this.workspace.innerHTML = `
      <section class="hero"><div class="hero-inner"><div><span class="eyebrow">A WARMER WAY TO WORK</span><h1>Five creative tools.<br>One workspace.</h1><p>Meet Flora: a collection of focused tools for writing, presenting, organising data, coding and designing.</p></div><img class="hero-image" id="flora-hero-image" src="assets/images/flora-hero.jpg" alt="Flora floral website banner" hidden></div></section>
      <div class="section-heading"><h2>Your workspace</h2><span class="muted">Choose an application to begin</span></div>
      <section class="app-grid">${cards.map(([id,letter,title,description]) => `<button class="app-card" data-card="${id}"><span class="app-letter">${letter}</span><strong>${title}</strong><small>${description}</small></button>`).join("")}</section>
      <div class="section-heading"><h2>Built around your work</h2></div>
      <section class="panel"><p class="muted">Flora stores your workspace data in this browser using IndexedDB where available. Use Settings to change the appearance and review local-storage information. Export important work regularly because browser data can be cleared.</p><button class="action-button secondary" id="home-settings">Open settings</button></section>`;
    this.workspace.querySelectorAll("[data-card]").forEach(button => button.addEventListener("click", () => this.open(button.dataset.card)));
    this.workspace.querySelector("#home-settings").addEventListener("click", () => this.open("settings"));
    const heroImage = this.workspace.querySelector("#flora-hero-image");
    heroImage.addEventListener("load", () => { heroImage.hidden = false; });
    heroImage.addEventListener("error", () => { heroImage.hidden = true; });
  }
  renderSettings() {
    this.workspace.innerHTML = `
      <section class="panel"><span class="eyebrow">PREFERENCES</span><h2>Settings</h2><p class="muted">Choose how Flora looks and behaves in this browser.</p>
        <div class="settings-tabs"><button class="active" data-setting-tab="appearance">Appearance</button><button data-setting-tab="accessibility">Accessibility</button><button data-setting-tab="storage">Storage & data</button><button data-setting-tab="privacy">Privacy</button></div>
        <div id="settings-content"></div>
      </section>`;
    const renderTab = tab => {
      const host = this.workspace.querySelector("#settings-content");
      if (tab === "appearance") host.innerHTML = `<div class="form-grid"><label class="field-label">Colour theme<select class="field" id="setting-theme"><option value="warm">Warm yellow</option><option value="sage">Soft sage</option><option value="rose">Soft rose</option><option value="dark">Dark</option></select></label></div><p class="muted">The warm yellow theme is Flora's default appearance.</p>`;
      if (tab === "accessibility") host.innerHTML = `<label class="list-row"><span>Reduce motion</span><input type="checkbox" id="setting-motion" ${this.settings.reducedMotion ? "checked" : ""}></label><p class="muted">The interface also respects your operating-system reduced-motion preference.</p>`;
      if (tab === "storage") host.innerHTML = `<h3>Browser storage</h3><p class="muted" id="storage-details">Checking available browser storage…</p><div class="notice">Browser storage is controlled by the browser and device. An app setting cannot guarantee a fixed amount of disk space.</div><button class="action-button secondary" id="refresh-storage">Refresh estimate</button>`;
      if (tab === "privacy") host.innerHTML = `<h3>Local-first storage</h3><p class="muted">This starter build does not send your documents to a Flora server. Data remains in this browser unless you export or otherwise share it. Clearing site data may delete your work.</p>`;
      const theme = host.querySelector("#setting-theme"); if (theme) { theme.value = this.settings.theme; theme.addEventListener("change", async () => { this.settings.theme = theme.value; await this.saveSettings(); this.applySettings(); }); }
      const motion = host.querySelector("#setting-motion"); if (motion) motion.addEventListener("change", async () => { this.settings.reducedMotion = motion.checked; await this.saveSettings(); this.applySettings(); });
      const refresh = host.querySelector("#refresh-storage"); if (refresh) refresh.addEventListener("click", () => this.updateStorageEstimate());
      if (tab === "storage") this.updateStorageEstimate();
    };
    this.workspace.querySelectorAll("[data-setting-tab]").forEach(button => button.addEventListener("click", () => {
      this.workspace.querySelectorAll("[data-setting-tab]").forEach(item => item.classList.toggle("active", item === button)); renderTab(button.dataset.settingTab);
    }));
    renderTab("appearance");
  }
  async saveSettings() { await this.store.set("settings", this.settings); this.status.textContent = "Settings saved locally"; }
  applySettings() {
    document.documentElement.dataset.theme = this.settings.theme === "warm" ? "" : this.settings.theme;
    document.documentElement.classList.toggle("reduce-motion", !!this.settings.reducedMotion);
    document.documentElement.style.scrollBehavior = this.settings.reducedMotion ? "auto" : "smooth";
  }
  async cycleTheme() {
    const themes = ["warm", "sage", "rose", "dark"];
    this.settings.theme = themes[(themes.indexOf(this.settings.theme) + 1) % themes.length];
    await this.saveSettings(); this.applySettings(); this.toast(`Theme: ${this.settings.theme}`);
  }
  toggleSidebar() {
    const collapsed = this.shell.classList.toggle("sidebar-collapsed");
    const button = document.querySelector("#sidebar-toggle");
    button.textContent = collapsed ? "Expand sidebar" : "Collapse sidebar";
    button.setAttribute("aria-expanded", String(!collapsed));
  }
  async updateStorageEstimate() {
    const caption = document.querySelector("#storage-caption");
    const details = document.querySelector("#storage-details");
    const percent = document.querySelector("#storage-percent");
    try {
      if (!navigator.storage?.estimate) throw new Error("Storage estimates are unavailable in this browser.");
      const { usage = 0, quota = 0 } = await navigator.storage.estimate();
      const usedMB = (usage / 1048576).toFixed(1);
      const quotaMB = quota ? (quota / 1048576).toFixed(0) : "unknown";
      const ratio = quota ? Math.min(100, usage / quota * 100) : 0;
      document.querySelector("#storage-ring").style.setProperty("--usage", `${ratio}%`);
      percent.textContent = `${Math.round(ratio)}%`;
      caption.textContent = `${usedMB} MB used`;
      if (details) details.textContent = `${usedMB} MB currently used. Estimated browser quota: ${quotaMB} MB.`;
    } catch (error) {
      caption.textContent = "Estimate unavailable";
      percent.textContent = "—";
      if (details) details.textContent = error.message;
    }
  }
  toast(message) {
    const el = document.querySelector("#toast"); el.textContent = message; el.classList.add("visible");
    clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => el.classList.remove("visible"), 2600);
  }
}
