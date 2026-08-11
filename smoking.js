(() => {
  const KEY = "super_me_v1";
  const $ = s => document.querySelector(s);

  function load(){ try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
  function save(data){ localStorage.setItem(KEY, JSON.stringify(data)); }

  function daysSince(iso){
    if(!iso) return null;
    const start = new Date(iso);
    if(isNaN(+start)) return null;
    const now = new Date();
    const a = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.max(0, Math.floor((b-a)/86400000));
  }

  function fmtDate(iso){
    if(!iso) return "";
    return new Intl.DateTimeFormat("it-IT",{day:"numeric",month:"short",year:"numeric"}).format(new Date(iso));
  }

  function openSheet(){
    const data = load();
    const since = data.smoking?.since || "";
    const dateValue = since ? new Date(since).toISOString().slice(0,10) : new Date().toISOString().slice(0,10);
    const sheet=$("#sheet"), backdrop=$("#sheetBackdrop");
    if(!sheet||!backdrop) return;
    sheet.innerHTML=`
      <div class="handle"></div>
      <div class="sheet-head"><h2>Sigarette</h2><p class="muted">Scegli da quale giorno vuoi far partire il contatore.</p></div>
      <div class="goal-card">
        <div class="field"><label>GIORNO DI PARTENZA</label><input id="smokeFreeDate" type="date" value="${dateValue}"></div>
      </div>
      <button class="btn btn-primary" id="saveSmokeFree" style="margin-top:12px">Salva partenza</button>
      ${since?`<button class="btn btn-secondary" id="smokedToday" style="margin-top:8px">Ho fumato oggi · riparti da oggi</button>`:""}
    `;
    backdrop.classList.remove("hidden"); sheet.classList.remove("hidden");

    $("#saveSmokeFree")?.addEventListener("click",()=>{
      const v=$("#smokeFreeDate")?.value; if(!v)return;
      const d=load(); d.smoking={...(d.smoking||{}),since:new Date(v+"T00:00:00").toISOString()}; save(d);
      backdrop.classList.add("hidden"); sheet.classList.add("hidden"); inject(true);
    });
    $("#smokedToday")?.addEventListener("click",()=>{
      const d=load(); d.smoking={...(d.smoking||{}),since:new Date().toISOString()}; save(d);
      backdrop.classList.add("hidden"); sheet.classList.add("hidden"); inject(true);
    });
  }

  function inject(force=false){
    if($("#pageTitle")?.textContent !== "Corpo") return;
    const host=$("#view .holistic-view"); if(!host) return;
    const old=$("#smokeFreeCard"); if(old && !force) return;
    if(old) old.remove();

    const data=load(), since=data.smoking?.since || null, days=daysSince(since);
    const card=document.createElement("section");
    card.id="smokeFreeCard"; card.className="card smoke-free-card";
    card.innerHTML=`
      <div class="row">
        <div style="display:flex;align-items:center;gap:12px">
          <div class="hub-icon" style="background:#f0f3ea">◌</div>
          <div><div class="muted small">GIORNI SENZA SIGARETTE</div><div class="metric" style="margin-top:2px">${days===null?'—':days} <span class="small muted">${days===1?'giorno':'giorni'}</span></div></div>
        </div>
        <button class="chip" id="editSmokeFree">${since?'Gestisci':'Inizia'}</button>
      </div>
      <div class="tiny muted" style="margin-top:9px">${since?`Dal ${fmtDate(since)}`:'Imposta il giorno da cui vuoi iniziare il conteggio.'}</div>
    `;
    const grid=host.querySelector('.grid2');
    if(grid) grid.insertAdjacentElement('afterend',card); else host.appendChild(card);
    $("#editSmokeFree")?.addEventListener("click",openSheet);
  }

  const view=$("#view");
  if(view){
    const obs=new MutationObserver(()=>inject(false));
    obs.observe(view,{childList:true,subtree:true});
  }
  document.addEventListener("click",e=>{ if(e.target.closest("[data-tab='food']")) setTimeout(()=>inject(false),0); },true);
  setTimeout(()=>inject(false),200);
})();
