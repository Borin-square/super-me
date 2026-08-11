(() => {
  const KEY="super_me_v1";
  const $=s=>document.querySelector(s);
  const num=v=>Number.isFinite(+v)?+v:0;
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{}}catch{return{}}};
  const save=d=>localStorage.setItem(KEY,JSON.stringify(d));
  const fmt=v=>Number(v).toFixed(1).replace('.',',');
  const uid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

  function openSheet(html){
    const sheet=$("#sheet"),backdrop=$("#sheetBackdrop"); if(!sheet||!backdrop)return;
    sheet.innerHTML=`<div class="handle"></div>${html}`;
    backdrop.classList.remove("hidden");sheet.classList.remove("hidden");
  }

  function drawWeight(rows){
    const c=$("#healthWeightChart"); if(!c||rows.length<2)return;
    const x=c.getContext("2d"),W=c.width,H=c.height,p=30;
    const vals=rows.map(r=>+r.value),mn=Math.min(...vals)-.5,mx=Math.max(...vals)+.5;
    const X=i=>p+i*(W-2*p)/(rows.length-1),Y=v=>H-p-(v-mn)*(H-2*p)/(mx-mn||1);
    x.clearRect(0,0,W,H);x.strokeStyle="#e9dfd3";x.lineWidth=1;
    for(let i=0;i<4;i++){const y=p+i*(H-2*p)/3;x.beginPath();x.moveTo(p,y);x.lineTo(W-p,y);x.stroke();}
    x.strokeStyle="#6f9271";x.lineWidth=5;x.beginPath();rows.forEach((r,i)=>i?x.lineTo(X(i),Y(r.value)):x.moveTo(X(i),Y(r.value)));x.stroke();
    x.fillStyle="#6f9271";rows.forEach((r,i)=>{x.beginPath();x.arc(X(i),Y(r.value),5,0,Math.PI*2);x.fill();});
  }

  function openWeight(){
    const d=load(),rows=[...(d.weight||[])].sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt)),rev=[...rows].reverse(),cur=rev[0],target=num(d.goals?.weightTarget);
    openSheet(`<div class="sheet-head"><h2>Peso</h2><p class="muted">Andamento nel tempo e nuove misurazioni.</p></div>
      <div class="grid2"><div class="goal-card"><div class="muted small">ATTUALE</div><div class="metric-sm">${cur?`${fmt(cur.value)} kg`:'—'}</div></div><div class="goal-card"><div class="muted small">OBIETTIVO</div><div class="metric-sm">${target?`${fmt(target)} kg`:'—'}</div></div></div>
      <section class="card" style="margin-top:12px"><div class="row"><b>Andamento</b><span class="badge">ultime 12</span></div><canvas id="healthWeightChart" class="chart" width="640" height="220"></canvas></section>
      <button class="btn btn-primary" id="healthAddWeight" style="margin-top:12px">+ Registra peso</button>
      <div class="list-group" style="margin-top:12px">${rev.slice(0,16).map(x=>`<div class="entry-card"><div class="row"><b>${fmt(x.value)} kg</b><span class="tiny muted">${new Date(x.createdAt).toLocaleDateString('it-IT')}</span></div></div>`).join('')||`<div class="empty">Nessun dato.</div>`}</div>`);
    setTimeout(()=>drawWeight(rows.slice(-12)),0);
    $("#healthAddWeight")?.addEventListener("click",openWeightEntry);
  }

  function openWeightEntry(){
    const d=load(),cur=[...(d.weight||[])].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))[0]?.value||d.profile?.weight||"";
    openSheet(`<div class="sheet-head"><h2>Registra peso</h2><p class="muted">Inserisci il valore della bilancia.</p></div><div class="goal-card"><div class="field"><label>PESO KG</label><input id="healthWeightValue" type="number" step="0.1" inputmode="decimal" value="${cur}"></div></div><button class="btn btn-primary" id="healthSaveWeight" style="margin-top:12px">Salva peso</button>`);
    $("#healthSaveWeight")?.addEventListener("click",()=>{const v=num($("#healthWeightValue")?.value);if(v<30||v>300){alert("Inserisci un peso valido.");return;}const data=load();data.weight||=[];data.profile||={};data.weight.push({id:uid(),value:Math.round(v*10)/10,createdAt:new Date().toISOString()});data.profile.weight=Math.round(v*10)/10;save(data);openWeight();});
  }

  function drawPressure(rows){
    const c=$("#healthPressureChart");if(!c||rows.length<2)return;
    const x=c.getContext("2d"),W=c.width,H=c.height,p=32,vals=rows.flatMap(r=>[r.sys,r.dia]),mn=Math.min(...vals)-10,mx=Math.max(...vals)+10;
    const X=i=>p+i*(W-2*p)/(rows.length-1),Y=v=>H-p-(v-mn)*(H-2*p)/(mx-mn||1);
    x.clearRect(0,0,W,H);x.strokeStyle="#e9dfd3";x.lineWidth=1;for(let i=0;i<4;i++){const y=p+i*(H-2*p)/3;x.beginPath();x.moveTo(p,y);x.lineTo(W-p,y);x.stroke();}
    [["sys","#b96864"],["dia","#77a4b5"]].forEach(([k,col])=>{x.strokeStyle=col;x.lineWidth=5;x.beginPath();rows.forEach((r,i)=>i?x.lineTo(X(i),Y(r[k])):x.moveTo(X(i),Y(r[k])));x.stroke();x.fillStyle=col;rows.forEach((r,i)=>{x.beginPath();x.arc(X(i),Y(r[k]),5,0,Math.PI*2);x.fill();});});
  }

  function openPressure(){
    const d=load(),rows=[...(d.pressure||[])].sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt)),rev=[...rows].reverse(),cur=rev[0];
    openSheet(`<div class="sheet-head"><h2>Pressione</h2><p class="muted">Andamento di sistolica e diastolica nel tempo.</p></div>
      <div class="goal-card"><div class="muted small">ULTIMA MISURAZIONE</div><div class="metric">${cur?`${cur.sys}/${cur.dia}`:'—'} <span class="small muted">mmHg</span></div>${cur?`<div class="tiny muted">♥ ${cur.pulse||'—'} · ${esc(cur.context||'')}</div>`:''}</div>
      <section class="card" style="margin-top:12px"><div class="row"><b>Andamento</b><span class="badge">ultime 12</span></div><canvas id="healthPressureChart" class="chart" width="640" height="220"></canvas></section>
      <button class="btn btn-primary" id="healthAddPressure" style="margin-top:12px">+ Registra pressione</button>
      <div class="list-group" style="margin-top:12px">${rev.slice(0,16).map(x=>`<div class="entry-card"><div class="row"><div><b>${x.sys}/${x.dia} mmHg</b><div class="tiny muted">♥ ${x.pulse||'—'} · ${esc(x.context||'')}</div></div><span class="tiny muted">${new Date(x.createdAt).toLocaleDateString('it-IT')}</span></div></div>`).join('')||`<div class="empty">Nessun dato.</div>`}</div>`);
    setTimeout(()=>drawPressure(rows.slice(-12)),0);
    $("#healthAddPressure")?.addEventListener("click",()=>$("#addBtn")?.click());
  }

  document.addEventListener("click",e=>{
    const weight=e.target.closest("#bodyWeight,#bodyWeightCard");
    const pressure=e.target.closest("#bodyPressure,#bodyPressureCard");
    if(weight){e.preventDefault();e.stopImmediatePropagation();openWeight();}
    if(pressure){e.preventDefault();e.stopImmediatePropagation();openPressure();}
  },true);
})();