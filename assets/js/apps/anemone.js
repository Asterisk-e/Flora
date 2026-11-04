import { escapeHTML } from "../core.js";

export const Anemone = {
  title: "Anemone — Poster Studio",
  async mount(root, ctx) {
    let objects = await ctx.store.get("anemone-poster", [{ type:"text", text:"Your Poster", x:220, y:65, color:"#49391d", size:42 }]);
    let selected = -1;
    root.innerHTML = `<section class="panel"><span class="eyebrow">ANEMONE / POSTER STUDIO</span><h2>Poster designer</h2><p class="muted">Add text, shapes and images. Drag items around the canvas.</p>
      <div class="toolbar"><button id="poster-text" class="action-button">Add text</button><button id="poster-rect">Add rectangle</button><button id="poster-circle">Add circle</button><label>Image <input id="poster-image" type="file" accept="image/*"></label><button id="poster-delete">Delete selected</button><button id="poster-save">Save</button><button id="poster-export">Export PNG</button></div>
      <div class="poster-stage" id="poster-stage" style="aspect-ratio:3/2"></div>
      <div class="form-grid" style="margin-top:14px"><label class="field-label">Selected text<input class="field" id="poster-text-value"></label><label class="field-label">Colour<input class="field" id="poster-colour" type="color" value="#49391d"></label><label class="field-label">Font size<input class="field" id="poster-size" type="number" min="10" max="120" value="42"></label></div></section>`;
    const stage = root.querySelector("#poster-stage");
    const render = () => {
      stage.innerHTML = "";
      objects.forEach((obj, index) => {
        const item = document.createElement("div"); item.className = `poster-object${index === selected ? " selected" : ""}`; item.style.left = `${obj.x}px`; item.style.top = `${obj.y}px`;
        if (obj.type === "text") { item.textContent = obj.text; item.style.color = obj.color; item.style.font = `600 ${obj.size || 32}px Georgia`; }
        if (obj.type === "rect" || obj.type === "circle") { item.style.background = obj.color || "#e9c969"; item.style.height = `${obj.h || 90}px`; item.style.width = `${obj.w || 150}px`; item.style.borderRadius = obj.type === "circle" ? "50%" : "8px"; }
        if (obj.type === "image") { const img = document.createElement("img"); img.src = obj.src; img.alt = "Poster image"; img.style.maxWidth = "180px"; img.style.maxHeight = "150px"; item.append(img); }
        item.addEventListener("pointerdown", event => {
          selected = index;
          stage.querySelectorAll(".poster-object").forEach((node, i) => node.classList.toggle("selected", i === selected));
          const target = item;
          const startX = event.clientX, startY = event.clientY, origX = obj.x, origY = obj.y;
          target.setPointerCapture?.(event.pointerId);
          const move = e => { obj.x = Math.max(0, origX + e.clientX - startX); obj.y = Math.max(0, origY + e.clientY - startY); target.style.left = `${obj.x}px`; target.style.top = `${obj.y}px`; };
          const stop = () => { target.removeEventListener("pointermove", move); target.removeEventListener("pointerup", stop); target.removeEventListener("pointercancel", stop); };
          target.addEventListener("pointermove", move); target.addEventListener("pointerup", stop); target.addEventListener("pointercancel", stop); syncControls();
        });
        stage.append(item);
      });
      syncControls();
    };
    const syncControls = () => { const obj = objects[selected]; root.querySelector("#poster-text-value").value = obj?.type === "text" ? obj.text : ""; root.querySelector("#poster-colour").value = obj?.color || "#49391d"; root.querySelector("#poster-size").value = obj?.size || 42; };
    root.querySelector("#poster-text").onclick = () => { objects.push({ type:"text", text:"New text", x:50, y:50, color:"#49391d", size:32 }); selected=objects.length-1; render(); };
    root.querySelector("#poster-rect").onclick = () => { objects.push({ type:"rect", x:70, y:80, color:"#e9c969", w:150, h:90 }); selected=objects.length-1; render(); };
    root.querySelector("#poster-circle").onclick = () => { objects.push({ type:"circle", x:100, y:110, color:"#dfb7aa", w:100, h:100 }); selected=objects.length-1; render(); };
    root.querySelector("#poster-delete").onclick = () => { if (selected >= 0) objects.splice(selected,1); selected=-1; render(); };
    root.querySelector("#poster-text-value").oninput = e => { const obj=objects[selected]; if (obj?.type === "text") { obj.text=e.target.value; render(); } };
    root.querySelector("#poster-colour").oninput = e => { const obj=objects[selected]; if (obj) { obj.color=e.target.value; render(); } };
    root.querySelector("#poster-size").onchange = e => { const obj=objects[selected]; if (obj?.type === "text") { obj.size=Math.max(10,Math.min(120,Number(e.target.value)||32)); render(); } };
    root.querySelector("#poster-image").onchange = e => { const file=e.target.files?.[0]; if (!file) return; const reader=new FileReader(); reader.onload=()=>{ objects.push({type:"image",src:reader.result,x:80,y:80}); selected=objects.length-1; render(); }; reader.readAsDataURL(file); };
    root.querySelector("#poster-save").onclick = async () => { await ctx.store.set("anemone-poster", objects); ctx.toast("Poster saved locally."); };
    root.querySelector("#poster-export").onclick = () => {
      const canvas=document.createElement("canvas"); canvas.width=900; canvas.height=600; const c=canvas.getContext("2d"); c.fillStyle="#fff8df"; c.fillRect(0,0,900,600);
      let pending=0; const finish=()=>{ if (!pending) canvas.toBlob(blob=>blob && ctx.download("anemone-poster.png",blob,"image/png"),"image/png"); };
      objects.forEach(obj=>{ if(obj.type==="text"){c.fillStyle=obj.color;c.font=`600 ${obj.size||32}px Georgia`;c.fillText(obj.text,obj.x,obj.y+(obj.size||32));} else if(obj.type==="rect"||obj.type==="circle"){c.fillStyle=obj.color||"#e9c969";if(obj.type==="circle"){c.beginPath();c.ellipse(obj.x+(obj.w||100)/2,obj.y+(obj.h||100)/2,(obj.w||100)/2,(obj.h||100)/2,0,0,Math.PI*2);c.fill();}else c.fillRect(obj.x,obj.y,obj.w||150,obj.h||90);} else if(obj.type==="image"){pending++;const img=new Image();img.onload=()=>{c.drawImage(img,obj.x,obj.y,180,150);pending--;finish();};img.onerror=()=>{pending--;finish();};img.src=obj.src;} }); finish();
    };
    render(); return () => {};
  }
};
