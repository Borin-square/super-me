(() => {
  const KEY="super_me_v1";
  const $=s=>document.querySelector(s);
  const uid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
  const num=v=>Number.isFinite(+v)?+v:0;

  function load(){try{return JSON.parse(localStorage.getItem(KEY))||{}}catch{return{}}}
  function save(d){localStorage.setItem(KEY,JSON.stringify(d))}
  function dayKey(d){const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`}
  function todayMinutes(d){const k=dayKey(new Date());return (d.meditation||[]).filter(x=>dayKey(x.createdAt)===k).reduce((a,x)=>a+(+x.minutes||0),0)}
  function weekMinutes(d){const start=new Date();const n=(start.getDay()+6)%7;start.setHours(0,0,0,0);start.setDate(start.getDate()-n);return (d.meditation||[]).filter(x=>+new Date(x.createdAt)>=+start).reduce((a,x)=>a+(+x.minutes||0),0)}
  function weekSessions(d){const start=new Date();const n=(start.getDay()+6)%7;start.setHours(0,0,0,0);start.setDate(start.getDate()-n);return (d.meditation||[]).filter(x=>+new Date(x.createdAt)>=+start).length}

  function ensureDefaults(){
    const d=load(); d.goals||={}; let changed=false;
    if(!d.goals.meditationMinutes){d.goals.meditationMinutes=10;changed=true;}
    if(!d.goals.meditationEnabledFrom){d.goals.meditationEnabledFrom=dayKey(new Date());changed=true;}
    if(!Array.isArray(d.meditation)){d.meditation=[];changed=true;}
    if(changed)save(d);
  }

  function openSheet(){
    const d=load(), target=num(d.goals?.meditationMinutes)||10;
    const sheet=$("#sheet"),backdrop=$("#sheetBackdrop"); if(!sheet||!backdrop)return;
    sheet.innerHTML=`<div class="handle"></div>
      <div class="sheet-head"><h2>Meditazione</h2><p class="muted">Registra la pratica di oggi. Conta la costanza, non la performance.</p></div>
      <div class="goal-card">
        <div class="field"><label>MINUTI</label><input id="medMinutes" type="number" min="1" max="180" step="1" inputmode="numeric" value="${target}"></div>
        <div class="field"><label>OBIETTIVO GIORNALIERO</label><input id="medTarget" type="number" min="1" max="120" step="1" inputmode="numeric" value="${target}"></div>
      </div>
      <button class="btn btn-primary" id="saveMeditation" style="margin-top:12px">Salva pratica</button>`;
    backdrop.classList.remove('hidden');sheet.classList.remove('hidden');
    $('#saveMeditation')?.addEventListener('click',()=>{
      const minutes=num($('#medMinutes')?.value), goal=num($('#medTarget')?.value);
      if(minutes<1||minutes>180||goal<1||goal>120){alert('Inserisci minuti validi.');return;}
      const data=load();data.goals||={};data.meditation||=[];
      data.goals.meditationMinutes=goal;
      data.goals.meditationEnabledFrom ||= dayKey(new Date());
      data.meditation.push({id:uid(),minutes:Math.round(minutes),createdAt:new Date().toISOString()});
      save(data);backdrop.classList.add('hidden');sheet.classList.add('hidden');
      injectBody(true);injectToday(true);
    });
  }

  function injectBody(force=false){
    if($('#pageTitle')?.textContent!=='Corpo')return;
    const host=$('#view .holistic-view');if(!host)return;
    const old=$('#meditationBodyCard');if(old&&!force)return;if(old)old.remove();
    const d=load(), today=todayMinutes(d), target=num(d.goals?.meditationMinutes)||10, wk=weekMinutes(d), sessions=weekSessions(d);
    const card=document.createElement('section');card.id='meditationBodyCard';card.className='card';
    card.innerHTML=`<div class="row"><div style="display:flex;align-items:center;gap:12px"><div class="hub-icon" style="background:#f3efe4">◉</div><div><div class="muted small">MEDITAZIONE · OGGI</div><div class="metric-sm">${today}/${target} min</div><div class="tiny muted">${sessions} sessioni · ${wk} min questa settimana</div></div></div><button class="chip" id="bodyMeditation">${today>=target?'Aggiungi':'Registra'}</button></div>`;
    const smoke=$('#smokeFreeCard'); if(smoke) smoke.insertAdjacentElement('afterend',card); else {const grid=host.querySelector('.grid2');grid?grid.insertAdjacentElement('afterend',card):host.appendChild(card);}
    $('#bodyMeditation')?.addEventListener('click',openSheet);
  }

  function injectToday(force=false){
    if($('#pageTitle')?.textContent!=='Super Me')return;
    const hero=$('#disciplineHero');if(!hero)return;
    const missions=hero.querySelector('.discipline-missions');if(!missions)return;
    const old=$('#meditationMission');if(old&&!force)return;if(old)old.remove();
    const d=load(), today=todayMinutes(d), target=num(d.goals?.meditationMinutes)||10, done=today>=target;
    const m=document.createElement('button');m.id='meditationMission';m.type='button';m.className=`discipline-mission discipline-mission-button ${done?'done':''}`;
    m.innerHTML=`<span class="dm-icon">◉</span><div><b>Meditazione</b><small>${done?`${today} min · pratica fatta`:`${today}/${target} min · completa la pratica`}</small></div><strong>${done?'✓':'○'}</strong>`;
    m.addEventListener('click',openSheet);missions.appendChild(m);
  }

  function injectAddShortcut(){
    const sheet=$('#sheet');if(!sheet||$('#meditationQuickAction'))return;
    const list=sheet.querySelector('.action-list');if(!list)return;
    const b=document.createElement('button');b.id='meditationQuickAction';b.className='action';b.innerHTML=`<span class="ico">◉</span><span><b>Meditazione</b><small>Registra i minuti della pratica</small></span>`;
    b.addEventListener('click',openSheet);list.appendChild(b);
  }

  ensureDefaults();
  const view=$('#view');if(view)new MutationObserver(()=>{injectBody(false);injectToday(false)}).observe(view,{childList:true,subtree:true});
  const sheet=$('#sheet');if(sheet)new MutationObserver(injectAddShortcut).observe(sheet,{childList:true,subtree:true});
  document.addEventListener('click',e=>{if(e.target.closest("[data-tab='food']"))setTimeout(()=>injectBody(false),0);if(e.target.closest("[data-tab='today']"))setTimeout(()=>injectToday(false),0)},true);
  setTimeout(()=>{injectBody(false);injectToday(false)},150);
})();
