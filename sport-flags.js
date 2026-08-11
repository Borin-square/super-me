(() => {
  const KEY = "super_me_v1";
  const SPORTS = [
    { key:"Bici", icon:"🚴", color:"#6f9271", elevation:true },
    { key:"Corsa", icon:"🏃", color:"#ef8d70" },
    { key:"Calisthenics", icon:"💪", color:"#81adbd" },
    { key:"Camminata", icon:"🚶", color:"#f0bc55" },
    { key:"Calcio", icon:"⚽", color:"#8c7eb8" }
  ];

  const $ = s => document.querySelector(s);
  const num = v => Number.isFinite(+v) ? +v : 0;

  function load(){
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch { return {}; }
  }
  function save(d){ localStorage.setItem(KEY, JSON.stringify(d)); }

  function startOfWeek(){
    const d = new Date();
    const day = (d.getDay()+6)%7;
    d.setHours(0,0,0,0);
    d.setDate(d.getDate()-day);
    return +d;
  }

  function flags(data){ return data.goals?.sportFlags || {}; }

  function qualifies(entry, rule){
    if(entry.type !== rule.type) return false;
    if(num(rule.minMinutes) && num(entry.minutes) < num(rule.minMinutes)) return false;
    if(num(rule.minElevation) && num(entry.elevation) < num(rule.minElevation)) return false;
    return true;
  }

  function activeRules(data){
    const f = flags(data);
    return SPORTS.map(s => ({
      ...s,
      type:s.key,
      count:num(f[s.key]?.count),
      minMinutes:num(f[s.key]?.minMinutes),
      minElevation:num(f[s.key]?.minElevation)
    })).filter(x => x.count > 0);
  }

  function weeklyResult(data){
    const sport = (data.sport || []).filter(x => +new Date(x.createdAt) >= startOfWeek());
    return activeRules(data).map(rule => {
      const matched = sport.filter(x => qualifies(x,rule));
      return {...rule, done:matched.length, complete:matched.length >= rule.count};
    });
  }

  function renderFlagsCard(){
    const host = $("#goalsV2Weekly");
    if(!host || $("#sportFlagsWeekly")) return;
    const data = load();
    const results = weeklyResult(data);
    if(!results.length) return;

    const total = results.reduce((a,x)=>a+x.count,0);
    const done = results.reduce((a,x)=>a+Math.min(x.done,x.count),0);
    const block = document.createElement("div");
    block.id = "sportFlagsWeekly";
    block.style.cssText = "margin-top:15px;padding-top:14px;border-top:1px solid #eee3d7";
    block.innerHTML = `
      <div class="row small"><b>Flag sport</b><span class="badge">${done}/${total}</span></div>
      <div style="display:grid;gap:8px;margin-top:10px">
        ${results.map(r => `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 11px;border-radius:14px;background:${r.complete?'#edf5ed':'#fff8ef'}">
            <div style="font-size:20px">${r.icon}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:800;font-size:14px">${r.key}</div>
              <div class="muted tiny">${r.minMinutes?`≥ ${r.minMinutes} min`:"qualsiasi durata"}${r.minElevation?` · ≥ ${r.minElevation} m D+`:""}</div>
            </div>
            <div style="font-weight:900;color:${r.complete?'#587b5b':'#9a795d'}">${Math.min(r.done,r.count)}/${r.count} ${r.complete?'✓':''}</div>
          </div>`).join("")}
      </div>`;
    host.appendChild(block);
  }

  function injectGoalEditor(){
    const sheet = $("#sheet");
    const saveBtn = $("#v2save");
    if(!sheet || !saveBtn || $("#sportFlagsEditor")) return;

    const data = load();
    const f = flags(data);
    const card = document.createElement("div");
    card.id = "sportFlagsEditor";
    card.className = "goal-card";
    card.style.marginTop = "10px";
    card.innerHTML = `
      <div class="row"><div class="goal-icon">🏁</div><b>Flag sport settimanali</b></div>
      <p class="muted small" style="margin:7px 0 12px">Imposta quante sedute vuoi completare. Le soglie sono per singola seduta.</p>
      <div style="display:grid;gap:10px">
        ${SPORTS.map(s => {
          const r=f[s.key]||{};
          return `<div style="padding:11px;border:1px solid #eadfd3;border-radius:15px">
            <div class="row"><b>${s.icon} ${s.key}</b><span class="muted tiny">a settimana</span></div>
            <div class="grid2" style="margin-top:8px">
              <div class="field"><label>SEDUTE</label><input data-flag="count" data-sport="${s.key}" type="number" min="0" max="7" value="${num(r.count)||""}" placeholder="0"></div>
              <div class="field"><label>MIN MIN / SEDUTA</label><input data-flag="minMinutes" data-sport="${s.key}" type="number" min="0" value="${num(r.minMinutes)||""}" placeholder="nessuno"></div>
            </div>
            ${s.elevation?`<div class="field"><label>D+ MINIMO / SEDUTA</label><input data-flag="minElevation" data-sport="${s.key}" type="number" min="0" value="${num(r.minElevation)||""}" placeholder="nessuno"></div>`:""}
          </div>`;
        }).join("")}
      </div>
      <div class="notice" style="margin-top:10px">Esempio: Bici 1 seduta, minimo 60 min e 500 m D+ → il flag scatta solo quando una singola uscita supera entrambe le soglie.</div>`;
    saveBtn.parentNode.insertBefore(card,saveBtn);
  }

  function saveFlags(){
    const editor = $("#sportFlagsEditor");
    if(!editor) return;
    const d = load(); d.goals ||= {}; d.goals.sportFlags ||= {};
    SPORTS.forEach(s => {
      const get = k => num(editor.querySelector(`[data-sport="${s.key}"][data-flag="${k}"]`)?.value);
      d.goals.sportFlags[s.key] = {
        count:get("count"),
        minMinutes:get("minMinutes"),
        minElevation:s.elevation?get("minElevation"):0
      };
    });
    save(d);
  }

  document.addEventListener("click", e => {
    if(e.target.closest("#v2save")) saveFlags();
  }, true);

  const observer = new MutationObserver(() => {
    injectGoalEditor();
    renderFlagsCard();
  });
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(() => { injectGoalEditor(); renderFlagsCard(); },150);
})();
