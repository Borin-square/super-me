(() => {
  const KEY="super_me_v1";
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const num=v=>Number.isFinite(+v)?+v:0;
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const fmtWeight=v=>Number(v).toFixed(1).replace('.',',');
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{}}catch{return{}}};
  const isToday=iso=>iso&&new Date(iso).toDateString()===new Date().toDateString();
  const startOfWeek=()=>{const d=new Date();const n=(d.getDay()+6)%7;d.setHours(0,0,0,0);d.setDate(d.getDate()-n);return +d};
  const latest=a=>[...(a||[])].sort((x,y)=>new Date(y.createdAt)-new Date(x.createdAt))[0];
  const sum=(a,k)=>(a||[]).reduce((s,x)=>s+(+x[k]||0),0);
  const pct=(n,d)=>d?Math.max(0,Math.min(100,Math.round(n/d*100))):0;
  let customMode=null;

  function renameNav(){
    const food=$("[data-tab='food']"), sport=$("[data-tab='sport']"), pressure=$("[data-tab='pressure']");
    if(food){food.querySelector('span').textContent='♥';food.querySelector('small').textContent='Corpo';}
    if(sport){sport.querySelector('span').textContent='↗';sport.querySelector('small').textContent='Movimento';}
    if(pressure){pressure.querySelector('span').textContent='✦';pressure.querySelector('small').textContent='Crescita';}
  }

  function active(which){
    $$('.nav-item').forEach(b=>b.classList.remove('active'));
    const map={body:'food',movement:'sport',growth:'pressure'};
    const el=$("[data-tab='"+map[which]+"']"); if(el)el.classList.add('active');
  }

  function setHeader(title,kicker){
    $('#pageTitle').textContent=title;
    $('#todayLabel').textContent=kicker;
  }

  function openQuick(){ $('#addBtn')?.click(); }

  function renderBody(){
    customMode='body'; active('body'); setHeader('Corpo','SALUTE & NUTRIZIONE');
    const d=load(), food=(d.food||[]).filter(x=>isToday(x.createdAt)), bp=latest(d.pressure), w=latest(d.weight);
    const kcal=sum(food,'kcal'), protein=sum(food,'p'), calGoal=num(d.goals?.calories), proteinGoal=num(d.goals?.protein);
    const recentFood=[...(d.food||[])].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,5);
    $('#view').innerHTML=`<div class="stack holistic-view">
      <section class="card body-hero">
        <div class="row"><div><div class="muted small">ALIMENTAZIONE · OGGI</div><div class="metric">${kcal} <span class="small muted">kcal</span></div></div><span class="badge">${calGoal?`${pct(kcal,calGoal)}%`:'target?'}</span></div>
        <div class="progress" style="background:#eee8df"><i style="width:${pct(kcal,calGoal)}%;background:#ef8d70"></i></div>
        <div class="row small"><span>Proteine <b>${Math.round(protein)}${proteinGoal?`/${proteinGoal}`:''} g</b></span><button class="chip" id="bodyAddFood">+ registra</button></div>
      </section>
      <div class="grid2">
        <section class="card hub-card"><div class="hub-icon">⚖️</div><div class="muted small">PESO</div><div class="metric-sm">${w?`${fmtWeight(w.value)} kg`:'—'}</div><div class="tiny muted">${d.goals?.weightTarget?`obiettivo ${fmtWeight(d.goals.weightTarget)} kg`:'imposta obiettivo'}</div><button class="chip" id="bodyWeight">Registra peso</button></section>
        <section class="card hub-card"><div class="hub-icon red">♥</div><div class="muted small">PRESSIONE</div><div class="metric-sm">${bp?`${bp.sys}/${bp.dia}`:'—'}</div><div class="tiny muted">${bp?`♥ ${bp.pulse||'—'}`:'nessun dato'}</div><button class="chip" id="bodyPressure">Registra</button></section>
      </div>
      <div class="section-title">Ultimi pasti</div>
      <div class="list-group">${recentFood.length?recentFood.map(x=>`<div class="entry-card"><div class="row"><div><h4>${esc(x.title)}</h4><p>${esc(x.meal||'')} · ${new Date(x.createdAt).toLocaleDateString('it-IT')}</p></div><b>${Math.round(x.kcal||0)} kcal</b></div></div>`).join(''):`<div class="empty">Nessun pasto registrato.</div>`}</div>
    </div>`;
    $('#bodyAddFood')?.addEventListener('click',openQuick);
    $('#bodyPressure')?.addEventListener('click',openQuick);
    $('#bodyWeight')?.addEventListener('click',openWeightEntry);
  }

  function openWeightEntry(){
    const d=load(), current=latest(d.weight)?.value||d.profile?.weight||'';
    const sheet=$('#sheet'), backdrop=$('#sheetBackdrop');
    sheet.innerHTML=`<div class="handle"></div><div class="sheet-head"><h2>Registra peso</h2><p class="muted">Una misura, poi torni subito al Corpo.</p></div><div class="goal-card"><div class="field"><label>PESO KG</label><input id="navWeightValue" type="number" step="0.1" inputmode="decimal" value="${current}"></div></div><button class="btn btn-primary" id="navSaveWeight" style="margin-top:12px">Salva peso</button>`;
    backdrop.classList.remove('hidden');sheet.classList.remove('hidden');
    $('#navSaveWeight').onclick=()=>{
      const value=num($('#navWeightValue').value); if(value<30||value>300){alert('Inserisci un peso valido.');return;}
      const data=load();data.weight||=[];data.profile||={};data.weight.push({id:Math.random().toString(36).slice(2)+Date.now().toString(36),value:Math.round(value*10)/10,createdAt:new Date().toISOString()});data.profile.weight=Math.round(value*10)/10;localStorage.setItem(KEY,JSON.stringify(data));
      backdrop.classList.add('hidden');sheet.classList.add('hidden');renderBody();
    };
  }

  function flagRows(d){
    const rules=d.goals?.sportFlags||{}, sport=(d.sport||[]).filter(x=>+new Date(x.createdAt)>=startOfWeek());
    return Object.entries(rules).filter(([,r])=>num(r.count)>0).map(([type,r])=>{const done=sport.filter(x=>x.type===type&&(!num(r.minMinutes)||num(x.minutes)>=num(r.minMinutes))&&(!num(r.minElevation)||num(x.elevation)>=num(r.minElevation))).length;return {type,count:num(r.count),done:Math.min(done,num(r.count)),minMinutes:num(r.minMinutes),minElevation:num(r.minElevation)}});
  }

  function renderMovement(){
    customMode='movement';active('movement');setHeader('Movimento','DISCIPLINA FISICA');
    const d=load(), rules=flagRows(d), sport=[...(d.sport||[])].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    const weekly=sport.filter(x=>+new Date(x.createdAt)>=startOfWeek()), mins=sum(weekly,'minutes'), goal=num(d.goals?.sportMinutes), done=rules.reduce((a,x)=>a+x.done,0), total=rules.reduce((a,x)=>a+x.count,0);
    $('#view').innerHTML=`<div class="stack holistic-view">
      <section class="card movement-hero"><div class="row"><div><div class="muted small">FLAG SETTIMANA</div><div class="metric">${done}/${total||'—'}</div></div><span class="badge">${goal?`${mins}/${goal} min`:`${mins} min`}</span></div>${goal?`<div class="progress" style="background:#eee8df"><i style="width:${pct(mins,goal)}%;background:#6f9271"></i></div>`:''}</section>
      <div class="mission-list">${rules.length?rules.map(r=>`<div class="movement-flag ${r.done>=r.count?'done':''}"><span>${r.done>=r.count?'✓':'○'}</span><div><b>${esc(r.type)}</b><small>${r.minMinutes?`≥ ${r.minMinutes} min`:''}${r.minElevation?` · ≥ ${r.minElevation} m D+`:''}</small></div><strong>${r.done}/${r.count}</strong></div>`).join(''):`<div class="empty">Imposta i flag sport negli Obiettivi.</div>`}</div>
      <button class="btn btn-primary" id="movementAdd">+ Registra attività</button>
      <div class="section-title">Ultime attività</div><div class="list-group">${sport.slice(0,10).map(x=>`<div class="entry-card"><div class="row"><div><h4>${esc(x.type)}</h4><p>${x.minutes} min ${x.distance?`· ${x.distance} km`:''} ${x.elevation?`· ${x.elevation} m D+`:''}</p></div><b>~${x.kcal||0} kcal</b></div></div>`).join('')||`<div class="empty">Nessuna attività registrata.</div>`}</div>
    </div>`;
    $('#movementAdd')?.addEventListener('click',openQuick);
  }

  function renderGrowth(){
    customMode='growth';active('growth');setHeader('Crescita','MENTE & CULTURA');
    const d=load(), year=new Date().getFullYear(), books=[...(d.books||[])].sort((a,b)=>new Date(b.finishedAt||b.createdAt)-new Date(a.finishedAt||a.createdAt));
    const current=books.filter(b=>{const dt=new Date((b.finishedAt||b.createdAt||'')+(String(b.finishedAt||'').length===10?'T12:00:00':''));return !isNaN(+dt)&&dt.getFullYear()===year}).length, target=num(d.goals?.booksPerYear);
    $('#view').innerHTML=`<div class="stack holistic-view">
      <section class="card growth-hero"><div class="row"><div><div class="muted small">LETTURE ${year}</div><div class="metric">${current}${target?` / ${target}`:''} <span class="small muted">libri</span></div></div><span class="growth-star">✦</span></div>${target?`<div class="progress" style="background:#eee8df"><i style="width:${pct(current,target)}%;background:#8c7eb8"></i></div>`:''}</section>
      <button class="btn btn-primary" id="growthAdd">+ Aggiungi libro letto</button>
      <div class="section-title">La tua libreria</div>
      <div class="books-grid">${books.length?books.map(b=>`<button class="book-tile" data-book-id="${b.id}">${b.cover?`<img src="${b.cover}" alt="">`:`<div class="book-placeholder">📖</div>`}<b>${esc(b.title)}</b><small>${esc(b.author||'')}</small></button>`).join(''):`<div class="empty" style="grid-column:1/-1">Ancora nessun libro registrato.</div>`}</div>
    </div>`;
    $('#growthAdd')?.addEventListener('click',()=>window.SuperMeBooks?.openAddBook());
    $$('.book-tile').forEach(b=>b.addEventListener('click',()=>window.SuperMeBooks?.openEditBook(b.dataset.bookId)));
  }

  document.addEventListener('click',e=>{
    const nav=e.target.closest('.nav-item'); if(!nav)return;
    if(nav.dataset.tab==='food'){e.preventDefault();e.stopImmediatePropagation();renderBody();}
    else if(nav.dataset.tab==='sport'){e.preventDefault();e.stopImmediatePropagation();renderMovement();}
    else if(nav.dataset.tab==='pressure'){e.preventDefault();e.stopImmediatePropagation();renderGrowth();}
    else if(nav.dataset.tab==='today'){customMode=null;}
  },true);

  const observer=new MutationObserver(()=>{
    renameNav();
    if(customMode==='body' && $('#pageTitle')?.textContent!=='Corpo') renderBody();
    if(customMode==='movement' && $('#pageTitle')?.textContent!=='Movimento') renderMovement();
    if(customMode==='growth' && $('#pageTitle')?.textContent!=='Crescita') renderGrowth();
  });
  observer.observe(document.body,{childList:true,subtree:true});
  renameNav();
})();
