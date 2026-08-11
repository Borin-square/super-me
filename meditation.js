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

  function ensureData(){const d=load();let changed=false;if(!Array.isArray(d.meditation)){d.meditation=[];changed=true;}d.goals||={};if(d.goals.meditationEnabled==null&&d.goals.meditationEnabledFrom){d.goals.meditationEnabled=true;changed=true;}if(changed)save(d);}
  function enabled(d){return d.goals?.meditationEnabled===true;}

  function openSheet(){
    const d=load(), target=num(d.goals?.meditationMinutes)||10;
    const sheet=$("#sheet"),backdrop=$("#sheetBackdrop"); if(!sheet||!backdrop)return;
    sheet.innerHTML=`<div class="handle"></div><div class="sheet-head"><h2>Meditazione</h2><p class="muted">Registra la pratica di oggi. Conta la costanza, non la performance.</p></div><div class="goal-card"><div class="field"><label>MINUTI</label><input id="medMinutes" type="number" min="1" max="180" step="1" inputmode="numeric" value="${target}"></div></div><button class="btn btn-primary" id="saveMeditation" style="margin-top:12px">Salva pratica</button>`;
    backdrop.classList.remove('hidden');sheet.classList.remove('hidden');
    $('#saveMeditation')?.addEventListener('click',()=>{const minutes=num($('#medMinutes')?.value);if(minutes<1||minutes>180){alert('Inserisci minuti validi.');return;}const data=load();data.meditation||=[];data.meditation.push({id:uid(),minutes:Math.round(minutes),createdAt:new Date().toISOString()});save(data);backdrop.classList.add('hidden');sheet.classList.add('hidden');injectBody(true);injectToday(true);});
  }

  function injectBody(force=false){
    const old=$('#meditationBodyCard');
    if($('#pageTitle')?.textContent!=='Corpo'){old?.remove();return;}
    const d=load(); if(!enabled(d)){old?.remove();return;}
    const host=$('#view .holistic-view');if(!host)return;if(old&&!force)return;if(old)old.remove();
    const today=todayMinutes(d), target=num(d.goals?.meditationMinutes)||10, wk=weekMinutes(d), sessions=weekSessions(d);
    const card=document.createElement('section');card.id='meditationBodyCard';card.className='card';
    card.innerHTML=`<div class="row"><div style="display:flex;align-items:center;gap:12px"><div class="hub-icon" style="background:#f3efe4">◉</div><div><div class="muted small">MEDITAZIONE · OGGI</div><div class="metric-sm">${today}/${target} min</div><div class="tiny muted">${sessions} sessioni · ${wk} min questa settimana</div></div></div><button class="chip" id="bodyMeditation">${today>=target?'Aggiungi':'Registra'}</button></div>`;
    const smoke=$('#smokeFreeCard'); if(smoke) smoke.insertAdjacentElement('afterend',card); else {const grid=host.querySelector('.grid2');grid?grid.insertAdjacentElement('afterend',card):host.appendChild(card);}
    $('#bodyMeditation')?.addEventListener('click',openSheet);
  }

  function injectToday(force=false){
    const old=$('#meditationMission');
    if($('#pageTitle')?.textContent!=='Super Me'){old?.remove();return;}
    const d=load(); if(!enabled(d)){old?.remove();return;}
    const hero=$('#disciplineHero');if(!hero)return;const missions=hero.querySelector('.discipline-missions');if(!missions)return;if(old&&!force)return;if(old)old.remove();
    const today=todayMinutes(d), target=num(d.goals?.meditationMinutes)||10, done=today>=target;
    const m=document.createElement('button');m.id='meditationMission';m.type='button';m.className=`discipline-mission discipline-mission-button ${done?'done':''}`;
    m.innerHTML=`<span class="dm-icon">◉</span><div><b>Meditazione</b><small>${done?`${today} min · pratica fatta`:`${today}/${target} min · completa la pratica`}</small></div><strong>${done?'✓':'○'}</strong>`;
    m.addEventListener('click',openSheet);missions.appendChild(m);
  }

  function injectAddShortcut(){
    const sheet=$('#sheet');if(!sheet)return;const old=$('#meditationQuickAction');const d=load();if(!enabled(d)){old?.remove();return;}if(old)return;
    const list=sheet.querySelector('.action-list');if(!list)return;
    const b=document.createElement('button');b.id='meditationQuickAction';b.className='action';b.innerHTML=`<span class="ico">◉</span><span><b>Meditazione</b><small>Registra i minuti della pratica</small></span>`;b.addEventListener('click',openSheet);list.appendChild(b);
  }

  function injectGoalField(){
    const saveBtn=$('#v2save');if(!saveBtn||$('#meditationGoalField'))return;
    const d=load(),g=d.goals||{},on=g.meditationEnabled===true,target=num(g.meditationMinutes)||10;
    const card=document.createElement('div');card.id='meditationGoalField';card.className='goal-card';card.style.marginTop='10px';
    card.innerHTML=`<div class="row"><div class="goal-icon">◉</div><b>Meditazione</b></div><div class="field"><label>INCLUDI NELLA DISCIPLINA QUOTIDIANA</label><select id="v2meditationEnabled"><option value="no" ${!on?'selected':''}>No</option><option value="yes" ${on?'selected':''}>Sì</option></select></div><div class="field"><label>MINUTI / GIORNO</label><input id="v2meditationMinutes" type="number" min="1" max="120" value="${target}"></div>`;
    saveBtn.parentNode.insertBefore(card,saveBtn);
  }

  function saveGoal(){
    const enabledEl=$('#v2meditationEnabled');if(!enabledEl)return;
    const d=load();d.goals||={};const on=enabledEl.value==='yes';d.goals.meditationEnabled=on;d.goals.meditationMinutes=num($('#v2meditationMinutes')?.value)||10;
    if(on&&!d.goals.meditationEnabledFrom)d.goals.meditationEnabledFrom=dayKey(new Date());
    if(!on)d.goals.meditationEnabledFrom=null;
    save(d);
  }

  ensureData();
  const view=$('#view');if(view)new MutationObserver(()=>{injectBody(false);injectToday(false)}).observe(view,{childList:true,subtree:true});
  const sheet=$('#sheet');if(sheet)new MutationObserver(()=>{injectAddShortcut();injectGoalField();}).observe(sheet,{childList:true,subtree:true});
  document.addEventListener('click',e=>{if(e.target.closest('#v2save'))saveGoal();if(e.target.closest("[data-tab='food']"))setTimeout(()=>injectBody(false),0);if(e.target.closest("[data-tab='today']"))setTimeout(()=>injectToday(false),0)},true);
  setTimeout(()=>{injectBody(false);injectToday(false);injectGoalField();},150);
})();