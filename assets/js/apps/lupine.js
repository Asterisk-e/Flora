import { escapeHTML } from "../core.js";

const languages = { javascript:"js", typescript:"ts", python:"py", html:"html", css:"css", json:"json", java:"java", c:"c", cpp:"cpp", rust:"rs", go:"go", shell:"sh", sql:"sql", plain:"txt" };
export const Lupine = {
  title: "Lupine — Code Editor",
  async mount(root, ctx) {
    const saved = await ctx.store.get("lupine-code", { language:"javascript", filename:"main.js", code:"// Welcome to Lupine\nconsole.log('Hello, Flora!');" });
    root.innerHTML = `<section class="panel"><span class="eyebrow">LUPINE / CODE EDITOR</span><h2>Code workspace</h2><p class="muted">A lightweight browser editor for snippets and small projects. It does not compile or run code.</p>
      <div class="toolbar"><label>Language <select id="code-language">${Object.keys(languages).map(lang=>`<option value="${lang}">${lang}</option>`).join("")}</select></label><input class="field" id="code-filename" aria-label="Filename" value="${escapeHTML(saved.filename)}"><button id="code-save" class="action-button">Save</button><button id="code-download">Download source</button><button id="code-copy">Copy</button></div>
      <textarea class="code-editor" id="code-input" spellcheck="false" autocapitalize="off" aria-label="Code editor"></textarea><p class="muted" id="code-lines"></p></section>`;
    const language = root.querySelector("#code-language"), filename = root.querySelector("#code-filename"), editor = root.querySelector("#code-input");
    language.value = saved.language; editor.value = saved.code;
    const updateExtension = () => { const base = filename.value.replace(/\.[^.]+$/, "") || "main"; filename.value = `${base}.${languages[language.value]}`; };
    language.addEventListener("change", updateExtension);
    editor.addEventListener("input", () => root.querySelector("#code-lines").textContent = `${editor.value.split("\n").length} lines · ${editor.value.length} characters`);
    root.querySelector("#code-save").onclick = async () => { await ctx.store.set("lupine-code", { language:language.value, filename:filename.value, code:editor.value }); ctx.setStatus("Code saved locally"); ctx.toast("Code saved."); };
    root.querySelector("#code-download").onclick = () => ctx.download(filename.value || `main.${languages[language.value]}`, editor.value);
    root.querySelector("#code-copy").onclick = async () => { try { await navigator.clipboard.writeText(editor.value); ctx.toast("Code copied."); } catch { ctx.toast("Clipboard access was blocked by the browser."); } };
    editor.dispatchEvent(new Event("input")); return () => {};
  }
};
