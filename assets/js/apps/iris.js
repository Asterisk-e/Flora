import { escapeHTML } from "../core.js";

export const Iris = {
  title: "Iris — Presentations",
  async mount(root, ctx) {
    let slides = await ctx.store.get("iris-slides", [{ title: "Welcome to Iris", body: "Your presentation starts here." }]);
    let current = 0;
    root.innerHTML = `<section class="panel"><span class="eyebrow">IRIS / PRESENTATIONS</span><h2>Presentation designer</h2><p class="muted">Create a simple slide deck and present it in the browser.</p>
      <div class="toolbar"><button id="slide-add" class="action-button">Add slide</button><button id="slide-duplicate">Duplicate</button><button id="slide-delete">Delete</button><button id="slide-prev">Previous</button><button id="slide-next">Next</button><button id="slide-present">Present</button><button id="slide-export">Export HTML</button>
      <select id="slide-template" aria-label="Presentation template"><option value="blank">Blank deck</option><option value="pitch">Project pitch</option><option value="lesson">Lesson</option><option value="report">Project report</option></select></div>
      <div class="split-layout"><div class="list-stack" id="slide-list"></div><div><div class="slide-canvas" id="slide-canvas"><input class="field" id="slide-title" aria-label="Slide title"><textarea class="field" id="slide-body" rows="6" aria-label="Slide content"></textarea><small id="slide-position"></small></div></div></div></section>`;
    const list = root.querySelector("#slide-list"), heading = root.querySelector("#slide-title"), body = root.querySelector("#slide-body");
    const save = async () => { await ctx.store.set("iris-slides", slides); ctx.setStatus("Presentation saved locally"); };
    const render = () => {
      current = Math.max(0, Math.min(current, slides.length - 1));
      heading.value = slides[current].title; body.value = slides[current].body;
      root.querySelector("#slide-position").textContent = `Slide ${current + 1} of ${slides.length}`;
      list.innerHTML = slides.map((slide, i) => `<button class="list-row" data-slide="${i}"><span>${i + 1}. ${escapeHTML(slide.title || "Untitled slide")}</span></button>`).join("");
      list.querySelectorAll("[data-slide]").forEach(b => b.addEventListener("click", () => { sync(); current = Number(b.dataset.slide); render(); }));
    };
    const sync = () => { slides[current] = { title: heading.value, body: body.value }; save(); };
    heading.addEventListener("input", sync); body.addEventListener("input", sync);
    root.querySelector("#slide-add").onclick = () => { sync(); slides.push({ title: "New slide", body: "Add your content here." }); current = slides.length - 1; render(); save(); };
    root.querySelector("#slide-duplicate").onclick = () => { sync(); slides.splice(current + 1, 0, { ...slides[current], title: `${slides[current].title} (copy)` }); current++; render(); save(); };
    root.querySelector("#slide-delete").onclick = () => { if (slides.length === 1) return ctx.toast("A presentation needs at least one slide."); slides.splice(current, 1); current = Math.max(0, current - 1); render(); save(); };
    root.querySelector("#slide-prev").onclick = () => { sync(); current = Math.max(0, current - 1); render(); };
    root.querySelector("#slide-next").onclick = () => { sync(); current = Math.min(slides.length - 1, current + 1); render(); };
    root.querySelector("#slide-template").onchange = e => { const templates = { blank:[{title:"Untitled presentation",body:""}], pitch:[{title:"Project Pitch",body:"The opportunity"},{title:"Our proposal",body:"The solution"},{title:"Next steps",body:"What happens next"}], lesson:[{title:"Lesson Title",body:"Learning objectives"},{title:"Key Ideas",body:"Main points"},{title:"Review",body:"Questions and recap"}], report:[{title:"Project Report",body:"Summary"},{title:"Progress",body:"Achievements and challenges"},{title:"Conclusion",body:"Recommendations"}] }; slides = templates[e.target.value].map(x => ({...x})); current = 0; render(); save(); };
    root.querySelector("#slide-present").onclick = () => { sync(); const w = window.open("", "_blank"); if (!w) return ctx.toast("Allow pop-ups to present slides."); w.document.write(`<title>${escapeHTML(heading.value)}</title><style>body{background:#fff8df;color:#463719;font:24px Georgia;display:grid;place-items:center;min-height:100vh;text-align:center}main{max-width:900px;padding:8vw}h1{font-size:3em}</style><main><h1>${escapeHTML(slides[current].title)}</h1><p>${escapeHTML(slides[current].body).replace(/\n/g,"<br>")}</p><small>Use the browser back button to close this presentation.</small></main>`); w.document.close(); };
    root.querySelector("#slide-export").onclick = () => { sync(); const html = slides.map((s,i)=>`<section><h1>${escapeHTML(s.title)}</h1><p>${escapeHTML(s.body).replace(/\n/g,"<br>")}</p><small>${i+1} / ${slides.length}</small></section>`).join(""); ctx.download("iris-presentation.html", `<!doctype html><meta charset="utf-8"><style>body{font:20px Georgia;background:#fff8df;color:#463719}section{min-height:90vh;display:grid;align-content:center;justify-items:center;text-align:center;padding:5vw}h1{font-size:3em}</style>${html}`, "text/html"); };
    render(); return () => {};
  }
};
