(() => {
  const KEY = "super_me_v1";
  const $ = s => document.querySelector(s);
  const uid = () => Math.random().toString(36).slice(2)+Date.now().toString(36);
  const num = v => Number.isFinite(+v) ? +v : 0;
  const fmt = v => Number(v).toFixed(1).replace('.',',');

  function load(){ try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
  function save(d){ localStorage.setItem(KEY, JSON.stringify(d)); }

  function latestWeight(data){
    const arr=[...(data.weight||[])].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    return arr[0] || null;
  }

  function openSheet(html){
    const sheet=$("#sheet"),backdrop=$("#sheetBackdrop");
    if(!sheet||!backdrop)return;
    sheet.innerHTML=`<div class="handle"></div>${html}`;
    backdrop.classList.remove("hidden");sheet.classList.remove("hidden");
  }

  function renderWeightHome(){
    const host=$("#goalsV2Weekly");
    if(!host || $("#weightHomeCard")) return;
    const data=load(); const latest=latestWeight(data); const target=num(data.goals?.weightTarget);
    const block=document.createElement("div");
    block.id="weightHomeCard";
    block.style.cssText="margin-top:15px;padding-top:14px;border-top:1px solid #eee3d7";
    block.innerHTML=`
      <div class="row">
        <div><div class="muted small">PESO</div><div style="font-size:20px;font-weight:850">${latest?`${fmt(latest.value)} kg`:"—"}</div></div>
        <button id="openWeight" class="chip">Peso</button>
      </div>
      ${latest&&target?`<div class="muted small" style="margin-top:8px">Obiettivo <b>${fmt(target)} kg</b> · ${fmt(latest.value-target)} kg dal target</div>`:""}`;
    host.appendChild(block);
    $("#openWeight")?.addEventListener("click",openWeight);
  }

  function drawChart(rows){
    const c=$("#weightChart"); if(!c||rows.length<2)return;
    const ctx=c.getContext("2d"),W=c.width,H=c.height,p=28;
    ctx.clearRect(0,0,W,H);
    const vals=rows.map(r=>+r.value),mn=Math.min(...vals)-.5,mx=Math.max(...vals)+.5;
    const X=i=>p+i*(W-2*p)/(rows.length-1),Y=v=>H-p-(v-mn)*(H-2*p)/(mx-mn||1);
    ctx.strokeStyle="#e9dfd3";ctx.lineWidth=1;
    for(let i=0;i<4;i++){const y=p+i*(H-2*p)/3;ctx.beginPath();ctx.moveTo(p,y);ctx.lineTo(W-p,y);ctx.stroke();}
    ctx.strokeStyle="#6f9271";ctx.lineWidth=5;ctx.beginPath();
    rows.forEach((r,i)=>i?ctx.lineTo(X(i),Y(r.value)):ctx.moveTo(X(i),Y(r.value)));ctx.stroke();
    ctx.fillStyle="#6f9271";rows.forEach((r,i)=>{ctx.beginPath();ctx.arc(X(i),Y(r.value),5,0,Math.PI*2);ctx.fill();});
  }

  function openWeight(){
    const data=load(); data.weight ||= [];
    const rows=[...data.weight].sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
    const rev=[...rows].reverse(); const latest=rev[0]; const target=num(data.goals?.weightTarget);
    openSheet(`
      <div class="sheet-head"><h2>Peso ⚖️</h2><p class="muted">Registra il peso e guarda l'andamento nel tempo.</p></div>
      <div class="goal-card">
        <div class="grid2">
          <div><div class="muted small">ATTUALE</div><div style="font-size:30px;font-weight:900">${latest?`${fmt(latest.value)} kg`:"—"}</div></div>
          <div><div class="muted small">OBIETTIVO</div><div style="font-size:30px;font-weight:900">${target?`${fmt(target)} kg`:"—"}</div></div>
        </div>
      </div>
      <button id="addWeightBtn" class="btn btn-primary" style="margin-top:10px">+ Registra peso</button>
      <section class="card" style="margin-top:12px"><div class="row"><b>Andamento</b><span class="badge">ultimi 12</span></div><canvas id="weightChart" class="chart" width="640" height="220"></canvas></section>
      <div style="display:grid;gap:8px;margin-top:12px">
        ${rev.slice(0,20).map(x=>`<div class="goal-card" data-weight="${x.id}"><div class="row"><div><b>${fmt(x.value)} kg</b><div class="muted tiny">${new Date(x.createdAt).toLocaleDateString("it-IT")} · ${new Date(x.createdAt).toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})}</div></div><button class="chip deleteWeight">Elimina</button></div></div>`).join("")||`<div class="empty">Nessun peso registrato.</div>`}
      </div>`);
    setTimeout(()=>drawChart(rows.slice(-12)),0);
    $("#addWeightBtn")?.addEventListener("click",openAddWeight);
    document.querySelectorAll(".deleteWeight").forEach(btn=>btn.addEventListener("click",e=>{
      const id=e.target.closest("[data-weight]")?.dataset.weight; if(!id)return;
      if(confirm("Eliminare questa misurazione?")){const d=load();d.weight=(d.weight||[]).filter(x=>x.id!==id);save(d);openWeight();}
    }));
  }

  function openAddWeight(){
    const d=load(); const latest=latestWeight(d);
    openSheet(`
      <div class="sheet-head"><h2>Registra peso</h2><p class="muted">Inserisci il valore della bilancia.</p></div>
      <div class="goal-card"><div class="field"><label>PESO KG</label><input id="weightValue" type="number" step="0.1" inputmode="decimal" value="${latest?.value||d.profile?.weight||""}" placeholder="es. 97.7"></div></div>
      <button class="btn btn-primary" id="saveWeight" style="margin-top:12px">Salva peso</button>
      <button class="btn btn-secondary" id="backWeight" style="margin-top:8px">Torna al peso</button>`);
    setTimeout(()=>$("#weightValue")?.focus(),100);
    $("#saveWeight")?.addEventListener("click",()=>{
      const value=num($("#weightValue").value); if(!value||value<30||value>300){alert("Inserisci un peso valido.");return;}
      const data=load(); data.weight ||= []; data.profile ||= {};
      data.weight.push({id:uid(),value:Math.round(value*10)/10,createdAt:new Date().toISOString()});
      data.profile.weight=Math.round(value*10)/10;
      save(data);openWeight();
    });
    $("#backWeight")?.addEventListener("click",openWeight);
  }

  const observer=new MutationObserver(()=>renderWeightHome());
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(renderWeightHome,200);
})();
