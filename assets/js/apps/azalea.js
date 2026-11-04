import { escapeHTML } from "../core.js";

export const Azalea = {
  title: "Azalea — Documents",
  async mount(root, ctx) {
    const saved = await ctx.store.get("azalea-document", { title: "Untitled document", body: "" });
    root.innerHTML = `<section class="panel"><span class="eyebrow">AZALEA / DOCUMENTS</span><h2>Document editor</h2><p class="muted">Write and format notes, drafts and longer documents.</p>
      <input class="field" id="doc-title" aria-label="Document title" value="${escapeHTML(saved.title)}" placeholder="Document title">
      <div class="toolbar" role="toolbar" aria-label="Text formatting">
        <button data-command="bold"><strong>B</strong></button><button data-command="italic"><em>I</em></button><button data-command="underline"><u>U</u></button>
        <select id="doc-size" aria-label="Text size"><option value="3">Normal</option><option value="4">Large</option><option value="5">Extra large</option></select>
        <select id="doc-font" aria-label="Font"><option>Newsreader</option><option>Georgia</option><option>Arial</option><option>Verdana</option><option>Times New Roman</option></select>
        <label class="muted">Text colour <input id="doc-color" type="color" value="#40351f"></label>
        <label class="muted">Highlight <input id="doc-highlight" type="color" value="#fff0a8"></label>
        <button data-command="insertUnorderedList">Bullets</button><button data-command="insertOrderedList">Numbers</button>
        <button id="doc-export">Export HTML</button>
      </div>
      <div class="editor" id="doc-body" contenteditable="true" spellcheck="true" aria-label="Document text">${saved.body || "<p>Start writing here…</p>"}</div>
      <p class="muted" id="doc-count">Word count: 0</p>
    </section>`;
    const editor = root.querySelector("#doc-body"), title = root.querySelector("#doc-title");
    const save = async () => { await ctx.store.set("azalea-document", { title: title.value, body: editor.innerHTML }); ctx.setStatus("Document saved locally"); root.querySelector("#doc-count").textContent = `Word count: ${editor.innerText.trim().split(/\s+/).filter(Boolean).length}`; };
    root.querySelectorAll("[data-command]").forEach(button => button.addEventListener("click", () => { editor.focus(); document.execCommand(button.dataset.command, false); save(); }));
    root.querySelector("#doc-size").addEventListener("change", e => { editor.focus(); document.execCommand("fontSize", false, e.target.value); save(); });
    root.querySelector("#doc-font").addEventListener("change", e => { editor.focus(); document.execCommand("fontName", false, e.target.value); save(); });
    root.querySelector("#doc-color").addEventListener("input", e => { editor.focus(); document.execCommand("foreColor", false, e.target.value); save(); });
    root.querySelector("#doc-highlight").addEventListener("input", e => { editor.focus(); document.execCommand("hiliteColor", false, e.target.value); save(); });
    root.querySelector("#doc-export").addEventListener("click", () => ctx.download(`${title.value.trim() || "document"}.html`, `<!doctype html><meta charset="utf-8"><title>${escapeHTML(title.value)}</title>${editor.innerHTML}`, "text/html"));
    editor.addEventListener("input", save); title.addEventListener("input", save); await save();
    return () => {};
  }
};
