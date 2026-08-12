(() => {
  const KEY='super_me_v1';
  const $=s=>document.querySelector(s);
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{}}catch{return{}}};
  const num=v=>Number.isFinite(+v)?+v:0;
  const pad=n=>String(n).padStart(2,'0');
  const dayKey=d=>{const x=new Date(d);return `${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}`};
  const sameDay=(iso,key)=>iso&&dayKey(iso)===key;
  const fmtShort=d=>new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'short'}).format(d);
  const fmtLong=d=>new Intl.DateTimeFormat('it-IT',{weekday:'long',day:'numeric',month:'long'}).format(d);

  function status(data,key){
    const food=(data.food||[]).filter(x=>sameDay(x.createdAt,key));
    const pressure=(data.pressure||[]).filter(x=>sameDay(x.createdAt,key));
    const meditation=(data.meditation||[]).filter(x=>sameDay(x.createdAt,key));
    const sport=(data.sport||[]).filter(x=>sameDay(x.createdAt,key));
    const calories=food.reduce((a,x)=>a+(+x.kcal||0),0);
    const calTarget=num(data.goals?.calories);
    const foodDone=food.length>0&&(!calTarget||Math.abs(calories-calTarget)<=calTarget*.12);
    const pressureDone=pressure.length>0;
    const meditationTarget=num(data.goals?.meditationMinutes)||10;
    const meditationMinutes=meditation.reduce((a,x)=>a+(+x.minutes||0),0);
    const enabledFrom=data.goals?.meditationEnabledFrom||null;
    const meditationRequired=!!enabledFrom&&key>=enabledFrom;
    const meditationDone=!meditationRequired||meditationMinutes>=meditationTarget;
    const required=[foodDone,pressureDone];if(meditationRequired)required.push(meditationDone);
    return {complete:required.every(Boolean),foodDone,pressureDone,meditationRequired,meditationDone,meditationMinutes,meditationTarget,calories,calTarget,sportMinutes:sport.reduce((a,x)=>a+(+x.minutes||0),0)};
  }

  function firstObservedKey(data){
    const dates=[];
    ['food','pressure','meditation','sport','weight'].forEach(k=>(data[k]||[]).forEach(x=>{if(x.createdAt)dates.push(+new Date(x.createdAt));}));
    (data.books||[]).forEach(x=>{const v=x.createdAt||x.finishedAt;if(v)dates.push(+new Date(String(v).length===10?v+'T12:00:00':v));});
    if(data.goals?.meditationEnabledFrom)dates.push(+new Date(data.goals.meditationEnabledFrom+'T12:00:00'));
    const valid=dates.filter(Number.isFinite);return valid.length?dayKey(new Date(Math.min(...valid))):dayKey(new Date());
  }

  function build(data){
    const today=new Date();today.setHours(12,0,0,0);const first=firstObservedKey(data),rows=[];
    for(let i=29;i>=0;i--){const d=new Date(today);d.setDate(d.getDate()-i);const key=dayKey(d);const s=status(data,key);const before=key<first;const isToday=i===0;rows.push({d,key,s,before,isToday});}
    return rows;
  }

  function stats(rows){
    const eligible=rows.filter(x=>!x.before&&!x.isToday);
    const complete=eligible.filter(x=>x.s.complete).length;
    let best=0,run=0;for(const x of eligible){if(x.s.complete){run++;best=Math.max(best,run);}else run=0;}
    const today=rows[rows.length-1];if(today&&!today.before&&today.s.complete){run++;best=Math.max(best,run);}
    return {eligible:eligible.length,complete,best,pct:eligible.length?Math.round(complete/eligible.length*100):0};
  }

  function openDay(row){
    const s=row.s,parts=[];
    parts.push(`<div class="movement-flag ${s.foodDone?'done':''}"><span>${s.foodDone?'✓':'○'}</span><div><b>Alimentazione</b><small>${s.calTarget?`${Math.round(s.calories)} / ${s.calTarget} kcal`:`${Math.round(s.calories)} kcal`}</small></div></div>`);
    parts.push(`<div class="movement-flag ${s.pressureDone?'done':''}"><span>${s.pressureDone?'✓':'○'}</span><div><b>Pressione</b><small>${s.pressureDone?'Registrata':'Non registrata'}</small></div></div>`);
    if(s.meditationRequired)parts.push(`<div class="movement-flag ${s.meditationDone?'done':''}"><span>${s.meditationDone?'✓':'○'}</span><div><b>Meditazione</b><small>${s.meditationMinutes} / ${s.meditationTarget} min</small></div></div>`);
    if(s.sportMinutes)parts.push(`<div class="movement-flag done"><span>↗</span><div><b>Movimento</b><small>${s.sportMinutes} min</small></div></div>`);
    const sh=$('#sheet'),bd=$('#sheetBackdrop');if(!sh||!bd)return;
    sh.innerHTML=`<div class="handle"></div><div class="sheet-head"><h2>${fmtLong(row.d)}</h2><p class="muted">${row.before?'Prima dell’inizio del monitoraggio':row.isToday&&!s.complete?'Giornata ancora in corso':s.complete?'Giornata completata':'Giornata non completata'}</p></div><div class="mission-list">${parts.join('')}</div>`;
    bd.classList.remove('hidden');sh.classList.remove('hidden');
  }

  function render(){
    const old=$('#discipline30');
    if($('#pageTitle')?.textContent!=='Super Me'){old?.remove();return;}
    const hero=$('#disciplineHero');if(!hero)return;
    const data=load(),rows=build(data),st=stats(rows);
    if(old)old.remove();
    const card=document.createElement('section');card.id='discipline30';card.className='card';card.style.cssText='margin-top:12px';
    card.innerHTML=`
      <div class="row"><div><div class="muted small">ULTIMI 30 GIORNI</div><div class="metric-sm">${st.pct}% <span class="small muted">disciplina</span></div></div><div style="text-align:right"><div style="font-weight:900">${st.complete}/${st.eligible||0}</div><div class="tiny muted">giorni chiusi</div></div></div>
      <div style="display:grid;grid-template-columns:repeat(10,1fr);gap:6px;margin-top:14px">${rows.map((r,i)=>{
        let bg='#eee8df',mark='';
        if(r.before){bg='#f5f0e9';mark='';}
        else if(r.s.complete){bg='#6f9271';mark='✓';}
        else if(r.isToday){bg='#f1a33d';mark='·';}
        else {bg='#ead8cf';mark='';}
        return `<button data-d30="${i}" title="${fmtShort(r.d)}" style="aspect-ratio:1;border:0;border-radius:9px;background:${bg};font-size:11px;font-weight:900;color:${r.s.complete?'white':'#4d4a45'}">${mark}</button>`;
      }).join('')}</div>
      <div class="row tiny muted" style="margin-top:10px"><span>Miglior streak: <b>${st.best} giorni</b></span><span>Oggi non penalizza finché è aperto</span></div>`;
    const smart=$('#smartDisciplineMessage');if(smart)smart.insertAdjacentElement('afterend',card);else hero.insertAdjacentElement('afterend',card);
    card.querySelectorAll('[data-d30]').forEach(b=>b.addEventListener('click',()=>openDay(rows[+b.dataset.d30])));
  }

  const view=$('#view');if(view)new MutationObserver(()=>setTimeout(render,0)).observe(view,{childList:true,subtree:true});
  setTimeout(render,300);
})();
