(() => {
  const KEY = "super_me_v1";
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const num = v => Number.isFinite(+v) ? +v : 0;
  const uid = () => Math.random().toString(36).slice(2)+Date.now().toString(36);

  function load(){ try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
  function save(d){ localStorage.setItem(KEY, JSON.stringify(d)); }

  function yearBooks(data){
    const y = new Date().getFullYear();
    return (data.books || []).filter(b => {
      const d = new Date((b.finishedAt || b.createdAt || "") + (String(b.finishedAt||"").length===10?"T12:00:00":""));
      return !isNaN(+d) && d.getFullYear() === y;
    });
  }

  function resizeImage(file,max=720,quality=.78){
    return new Promise((resolve,reject)=>{
      const fr = new FileReader();
      fr.onerror=reject;
      fr.onload=()=>{
        const img=new Image();
        img.onerror=reject;
        img.onload=()=>{
          const scale=Math.min(1,max/Math.max(img.width,img.height));
          const w=Math.round(img.width*scale),h=Math.round(img.height*scale);
          const c=document.createElement("canvas");c.width=w;c.height=h;
          c.getContext("2d").drawImage(img,0,0,w,h);
          resolve(c.toDataURL("image/jpeg",quality));
        };
        img.src=fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  function openSheet(html){
    const sheet=$("#sheet"),backdrop=$("#sheetBackdrop");
    if(!sheet||!backdrop)return;
    sheet.innerHTML=`<div class="handle"></div>${html}`;
    backdrop.classList.remove("hidden");sheet.classList.remove("hidden");
  }

  function renderBooksHome(){
    const host=$("#goalsV2Weekly");
    if(!host || $("#booksYearCard")) return;
    const data=load(); data.goals ||= {};
    const books=yearBooks(data), target=num(data.goals.booksPerYear);
    const block=document.createElement("div");
    block.id="booksYearCard";
    block.style.cssText="margin-top:15px;padding-top:14px;border-top:1px solid #eee3d7";
    const pct=target?Math.min(100,Math.round(books.length/target*100)):0;
    block.innerHTML=`
      <div class="row"><div><div class="muted small">LETTURE ${new Date().getFullYear()}</div><div style="font-size:18px;font-weight:850">${books.length}${target?` / ${target}`:" libri"}</div></div><button id="openBooks" class="chip">Libri</button></div>
      ${target?`<div class="progress" style="background:#eee8df;margin-top:9px"><i style="width:${pct}%;background:#8c7eb8"></i></div>`:""}
      ${books.length?`<div class="muted small" style="margin-top:8px">Ultimo: <b>${esc([...books].sort((a,b)=>new Date(b.finishedAt)-new Date(a.finishedAt))[0].title)}</b></div>`:`<div class="muted small" style="margin-top:8px">Nessun libro registrato quest'anno.</div>`}`;
    host.appendChild(block);
    $("#openBooks")?.addEventListener("click",openBooks);
  }

  function injectGoalField(){
    const saveBtn=$("#v2save"); if(!saveBtn || $("#booksGoalField")) return;
    const d=load(); const g=d.goals||{};
    const card=document.createElement("div");
    card.id="booksGoalField";card.className="goal-card";card.style.marginTop="10px";
    card.innerHTML=`<div class="row"><div class="goal-icon">📚</div><b>Letture</b></div><div class="field"><label>LIBRI / ANNO</label><input id="v2booksPerYear" type="number" min="0" value="${g.booksPerYear||""}" placeholder="es. 20"></div>`;
    saveBtn.parentNode.insertBefore(card,saveBtn);
  }

  function saveGoal(){
    const el=$("#v2booksPerYear"); if(!el)return;
    const d=load();d.goals||={};d.goals.booksPerYear=num(el.value)||null;save(d);
  }

  function openBooks(){
    const data=load(); data.books ||= [];
    const books=[...data.books].sort((a,b)=>new Date(b.finishedAt||b.createdAt)-new Date(a.finishedAt||a.createdAt));
    const target=num(data.goals?.booksPerYear), current=yearBooks(data).length;
    openSheet(`
      <div class="sheet-head"><h2>Libri 📚</h2><p class="muted">${current}${target?` / ${target}`:""} letti nel ${new Date().getFullYear()}</p></div>
      <button class="btn btn-primary" id="addBookBtn">+ Aggiungi libro letto</button>
      <div style="display:grid;gap:10px;margin-top:14px">
        ${books.length?books.map(b=>`<div class="goal-card" data-book="${b.id}"><div style="display:flex;gap:12px">${b.cover?`<img src="${b.cover}" alt="" style="width:72px;height:98px;object-fit:cover;border-radius:10px;background:#eee">`:"<div style='width:72px;height:98px;border-radius:10px;background:#eee8df;display:grid;place-items:center;font-size:28px'>📖</div>"}<div style="flex:1;min-width:0"><div style="font-weight:900">${esc(b.title)}</div><div class="muted small">${esc(b.author||"")}</div><div class="muted tiny" style="margin-top:4px">${b.finishedAt?new Date(b.finishedAt+"T12:00:00").toLocaleDateString("it-IT"):""}</div>${b.comment?`<div style="margin-top:8px;font-size:13px;line-height:1.35">“${esc(b.comment)}”</div>`:""}</div></div><button class="chip deleteBook" style="margin-top:9px">Elimina</button></div>`).join(""):`<div class="empty">Ancora nessun libro registrato.</div>`}
      </div>`);
    $("#addBookBtn")?.addEventListener("click",openAddBook);
    document.querySelectorAll(".deleteBook").forEach(btn=>btn.addEventListener("click",e=>{
      const id=e.target.closest("[data-book]")?.dataset.book; if(!id)return;
      if(confirm("Eliminare questo libro?")){ const d=load();d.books=(d.books||[]).filter(x=>x.id!==id);save(d);openBooks(); }
    }));
  }

  function openAddBook(){
    const today=new Date().toISOString().slice(0,10);
    openSheet(`
      <div class="sheet-head"><h2>Aggiungi libro</h2><p class="muted">Copertina, dati essenziali e una nota tua.</p></div>
      <div class="goal-card">
        <div class="field"><label>TITOLO</label><input id="bookTitle" type="text" placeholder="Titolo del libro"></div>
        <div class="field"><label>AUTORE</label><input id="bookAuthor" type="text" placeholder="Autore"></div>
        <div class="field"><label>FINITO IL</label><input id="bookDate" type="date" value="${today}"></div>
        <div class="field"><label>COMMENTO</label><textarea id="bookComment" rows="4" placeholder="Cosa ti è rimasto? Una frase, un'idea, un'impressione..."></textarea></div>
        <div class="field"><label>FOTO COPERTINA</label><input id="bookCover" type="file" accept="image/*"></div>
        <div id="bookPreview" style="margin-top:8px"></div>
      </div>
      <button class="btn btn-primary" id="saveBook" style="margin-top:12px">Salva libro</button>
      <button class="btn btn-secondary" id="backBooks" style="margin-top:8px">Torna ai libri</button>`);

    let cover="";
    $("#bookCover")?.addEventListener("change",async e=>{
      const f=e.target.files?.[0]; if(!f)return;
      try{cover=await resizeImage(f);$("#bookPreview").innerHTML=`<img src="${cover}" alt="Anteprima" style="width:90px;height:125px;object-fit:cover;border-radius:12px">`;}catch{alert("Non riesco a leggere questa immagine.");}
    });
    $("#saveBook")?.addEventListener("click",()=>{
      const title=$("#bookTitle").value.trim(); if(!title){alert("Inserisci il titolo.");return;}
      const d=load();d.books||=[];
      d.books.push({id:uid(),title,author:$("#bookAuthor").value.trim(),finishedAt:$("#bookDate").value||today,comment:$("#bookComment").value.trim(),cover,createdAt:new Date().toISOString()});
      save(d);openBooks();
    });
    $("#backBooks")?.addEventListener("click",openBooks);
  }

  document.addEventListener("click",e=>{ if(e.target.closest("#v2save")) saveGoal(); },true);
  const observer=new MutationObserver(()=>{injectGoalField();renderBooksHome();});
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>{injectGoalField();renderBooksHome();},180);
})();
