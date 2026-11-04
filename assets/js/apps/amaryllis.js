import { escapeHTML } from "../core.js";

const columns = "ABCDEFGH".split("");
function valueOf(ref, cells) { const value = cells[ref] ?? ""; return value.startsWith("=") ? evaluate(value.slice(1), cells) : Number(value) || 0; }
function evaluate(expression, cells) {
  const fn = /^(SUM|AVERAGE|MIN|MAX|COUNT)\(([^()]*)\)$/i.exec(expression.trim());
  if (fn) {
    const values = fn[2].split(",").flatMap(part => {
      const range = /^([A-H]\d+):([A-H]\d+)$/i.exec(part.trim());
      if (!range) return [valueOf(part.trim().toUpperCase(), cells)];
      const a = /^([A-H])(\d+)$/i.exec(range[1]), b = /^([A-H])(\d+)$/i.exec(range[2]);
      const c1 = columns.indexOf(a[1].toUpperCase()), c2 = columns.indexOf(b[1].toUpperCase());
      const out = []; for (let r = Math.min(+a[2],+b[2]); r <= Math.max(+a[2],+b[2]); r++) for (let c = Math.min(c1,c2); c <= Math.max(c1,c2); c++) out.push(valueOf(`${columns[c]}${r}`, cells)); return out;
    });
    if (fn[1].toUpperCase() === "SUM") return values.reduce((a,b)=>a+b,0);
    if (fn[1].toUpperCase() === "AVERAGE") return values.length ? values.reduce((a,b)=>a+b,0)/values.length : 0;
    if (fn[1].toUpperCase() === "MIN") return Math.min(...values);
    if (fn[1].toUpperCase() === "MAX") return Math.max(...values);
    return values.filter(Number.isFinite).length;
  }
  const substituted = expression.replace(/\b([A-H]\d+)\b/gi, ref => String(valueOf(ref.toUpperCase(), cells)));
  if (!/^[\d\s.+*/()\-]+$/.test(substituted)) return "#ERROR";
  try { return Function(`"use strict"; return (${substituted})`)(); } catch { return "#ERROR"; }
}

export const Amaryllis = {
  title: "Amaryllis — Spreadsheets",
  async mount(root, ctx) {
    let cells = await ctx.store.get("amaryllis-cells", {});
    root.innerHTML = `<section class="panel"><span class="eyebrow">AMARYLLIS / SPREADSHEETS</span><h2>Spreadsheet</h2><p class="muted">Enter values or formulas. Try <code>=SUM(A1:A4)</code> or <code>=A1+B1</code>.</p>
      <div class="toolbar"><button class="action-button" id="sheet-save">Save</button><button id="sheet-clear">Clear sheet</button><button id="sheet-export">Export CSV</button><select id="sheet-template"><option value="blank">Blank sheet</option><option value="budget">Monthly budget</option><option value="tasks">Task tracker</option><option value="grades">Gradebook</option></select></div>
      <div class="sheet-wrap"><table class="sheet" id="sheet"><thead><tr><th></th>${columns.slice(0,8).map(c=>`<th>${c}</th>`).join("")}</tr></thead><tbody>${Array.from({length:20},(_,r)=>`<tr><th>${r+1}</th>${columns.map(c=>`<td><input data-cell="${c}${r+1}" aria-label="${c}${r+1}" value="${escapeHTML(cells[`${c}${r+1}`] || "")}"></td>`).join("")}</tr>`).join("")}</tbody></table></div>
      <p class="muted" id="sheet-status">20 rows × 8 columns</p></section>`;
    const renderValues = () => root.querySelectorAll("[data-cell]").forEach(input => { const raw = cells[input.dataset.cell] || ""; input.title = raw.startsWith("=") ? `Result: ${evaluate(raw.slice(1), cells)}` : raw; });
    root.querySelectorAll("[data-cell]").forEach(input => input.addEventListener("change", () => { cells[input.dataset.cell] = input.value; renderValues(); }));
    root.querySelector("#sheet-save").onclick = async () => { await ctx.store.set("amaryllis-cells", cells); ctx.setStatus("Spreadsheet saved locally"); ctx.toast("Spreadsheet saved."); };
    root.querySelector("#sheet-clear").onclick = () => { cells = {}; root.querySelectorAll("[data-cell]").forEach(input => input.value = ""); renderValues(); };
    root.querySelector("#sheet-template").onchange = e => { const templates = { blank:{}, budget:{A1:"Category",B1:"Planned",C1:"Actual",A2:"Housing",B2:"900",A3:"Food",B3:"250",A4:"Travel",B4:"100",A5:"Total",B5:"=SUM(B2:B4)"}, tasks:{A1:"Task",B1:"Owner",C1:"Status",A2:"Plan project",C2:"Not started",A3:"Review work",C3:"In progress"}, grades:{A1:"Student",B1:"Assessment 1",C1:"Assessment 2",D1:"Average",A2:"Student 1",B2:"80",C2:"90",D2:"=AVERAGE(B2:C2)"} }; cells = {...templates[e.target.value]}; root.querySelectorAll("[data-cell]").forEach(input => input.value = cells[input.dataset.cell] || ""); renderValues(); };
    root.querySelector("#sheet-export").onclick = () => { const csv = Array.from({length:20},(_,r)=>columns.map(c=>`"${String(cells[`${c}${r+1}`] || "").replace(/"/g,'""')}"`).join(",")).join("\n"); ctx.download("amaryllis-sheet.csv", csv, "text/csv;charset=utf-8"); };
    renderValues(); return () => {};
  }
};
