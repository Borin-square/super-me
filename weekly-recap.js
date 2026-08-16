(() => {
  const KEY='super_me_v1';
  const $=s=>document.querySelector(s);
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{}}catch{return{}}};
  const n=v=>Number.isFinite(+v)?+v:0;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const dayKey=v=>{const d=new Date(v);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
  const sum=(a,k)=>a.reduce((t,x)=>t+(+x[k]||0),0);

  function startOfWeek(){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d}
  function week(items=[]){const s=+startOfWeek();return items.filter(x=>+new Date(x.createdAt)>=s)}
  function progress(value,target,inverse=false){if(!target)return null;const raw=inverse?(value<=target?1:target/value):(value/target);return clamp(Math.round(raw*100),0,100)}
  function foodDays(food){const map={};food.forEach(x=>{const k=dayKey(x.createdAt);map[k]||={kcal:0,sodiumMg:0};map[k].kcal+=n(x.kcal);map[k].sodiumMg+=n(x.sodiumMg)});return map}

  function stats(data){
    const g=data.goals||{},food=week(data.food),sport=week(data.sport),pressure=week(data.pressure),med=week(data.meditation),coffee=week(data.coffee),weights=week(data.weight),fd=foodDays(food),days=Object.values(fd);
    const sportMinutes=sum(sport,'minutes'),sportKcal=sum(sport,'kcal'),workouts=sport.length,pressureDays=new Set(pressure.map(x=>dayKey(x.createdAt))).size,medMinutes=sum(med,'minutes');
    const avgCoffee=(()=>{const m={};coffee.forEach(x=>{const k=dayKey(x.createdAt);m[k]=(m[k]||0)+1});const elapsed=((new Date().getDay()+6)%7)+1;return coffee.length/elapsed})();
    const avgSalt=days.length?avg(days.map(d=>d.sodiumMg*2.5/1000)):0;
    const kcalEaten=days.reduce((a,d)=>a+d.kcal,0),bmr=n(g.bmr),coveredDays=days.length,estimatedDeficit=bmr&&coveredDays?Math.max(0,Math.round(bmr*coveredDays+sportKcal-kcalEaten)):0;
    const pSys=pressure.map(x=>n(x.sys)).filter(Boolean),pDia=pressure.map(x=>n(x.dia)).filter(Boolean);
    const ws=[...weights].sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt)),weightDelta=ws.length>1?n(ws.at(-1).value)-n(ws[0].value):null;
    return {g,sportMinutes,sportKcal,workouts,pressureDays,medMinutes,avgCoffee,avgSalt,kcalEaten,coveredDays,estimatedDeficit,avgSys:avg(pSys),avgDia:avg(pDia),weightDelta};
  }

  function bar(label,valueText,pct,good=true){return `<div style="margin-top:13px"><div class="row small"><span>${label}</span><b>${valueText}</b></div><div class="progress" style="background:#eee8df;margin-top:7px"><i style="width:${pct==null?0:pct}%;background:${good?'#6f9271':'#ef8d70'}"></i></div></div>`}

  function render(){
    const old=$('#weeklyRecap');
    if($('#pageTitle')?.textContent!=='Super Me'){old?.remove();return;}
    const anchor=$('#discipline30')||$('#smartDisciplineMessage')||$('#disciplineHero');if(!anchor)return;
    const s=stats(load()),g=s.g;
    if(old)old.remove();
    const card=document.createElement('section');card.id='weeklyRecap';card.className='card';card.style.cssText='margin-top:12px;cursor:pointer';
    const parts=[];
    if(g.sportMinutes)parts.push(bar('Allenamento · minuti',`${Math.round(s.sportMinutes)} / ${Math.round(g.sportMinutes)}`,progress(s.sportMinutes,g.sportMinutes)));
    if(g.workoutsPerWeek)parts.push(bar('Allenamenti',`${s.workouts} / ${Math.round(g.workoutsPerWeek)}`,progress(s.workouts,g.workoutsPerWeek)));
    if(g.weeklyDeficit&&g.bmr)parts.push(bar('Deficit stimato',`${Math.round(s.estimatedDeficit)} / ${Math.round(g.weeklyDeficit)} kcal`,progress(s.estimatedDeficit,g.weeklyDeficit)));
    if(g.pressureMeasurements)parts.push(bar('Pressione · giorni',`${s.pressureDays} / ${Math.round(g.pressureMeasurements)}`,progress(s.pressureDays,g.pressureMeasurements)));
    if(g.meditationMinutes)parts.push(bar('Meditazione',`${Math.round(s.medMinutes)} min`,null));
    if(g.coffeeMax)parts.push(bar('Caffè · media/giorno',`${s.avgCoffee.toFixed(1).replace('.',',')} / ${g.coffeeMax}`,progress(s.avgCoffee,g.coffeeMax,true),s.avgCoffee<=g.coffeeMax));
    if(g.saltMax)parts.push(bar('Sale · media/giorno',`${s.avgSalt.toFixed(1).replace('.',',')} / ${g.saltMax} g`,progress(s.avgSalt,g.saltMax,true),s.avgSalt<=g.saltMax));
    card.innerHTML=`<div class="row"><div><div class="muted small">QUESTA SETTIMANA</div><div style="font-size:21px;font-weight:900;margin-top:3px">Scorecard obiettivi</div></div><span class="chip">Dettagli</span></div>${parts.join('')||'<div class="notice" style="margin-top:12px">Imposta gli obiettivi settimanali per vedere la scorecard.</div>'}${g.weeklyDeficit&&g.bmr?`<div class="tiny muted" style="margin-top:10px">Deficit su ${s.coveredDays} giorni con alimentazione registrata.</div>`:''}`;
    anchor.insertAdjacentElement('afterend',card);card.addEventListener('click',()=>openDetail(s));
  }

  function openDetail(s){
    const g=s.g,sh=$('#sheet'),bd=$('#sheetBackdrop');if(!sh||!bd)return;
    const delta=s.weightDelta==null?'—':`${s.weightDelta>0?'+':''}${s.weightDelta.toFixed(1).replace('.',',')} kg`;
    sh.innerHTML=`<div class="handle"></div><div class="sheet-head"><h2>Recap settimanale</h2><p class="muted">Da lunedì a oggi</p></div><div class="goal-card">
      <div class="row"><b>Allenamento</b><strong>${Math.round(s.sportMinutes)}${g.sportMinutes?` / ${g.sportMinutes}`:''} min</strong></div><div class="row small" style="margin-top:8px"><span>${s.workouts} attività</span><span>${Math.round(s.sportKcal)} kcal sport</span></div>
    </div>
    <div class="goal-card" style="margin-top:10px"><div class="row"><b>Bilancio energetico</b><strong>${g.bmr?`${Math.round(s.estimatedDeficit)} kcal`:'—'}</strong></div><div class="tiny muted" style="margin-top:7px">${g.bmr?`BMR ${g.bmr} × ${s.coveredDays} giorni + ${Math.round(s.sportKcal)} sport − ${Math.round(s.kcalEaten)} mangiate.`:'Imposta il BMR negli Obiettivi.'}</div>${g.weeklyDeficit?`<div class="tiny muted" style="margin-top:5px">Target deficit: ${g.weeklyDeficit} kcal/settimana.</div>`:''}</div>
    <div class="grid2" style="margin-top:10px"><div class="goal-card"><div class="muted tiny">PRESSIONE MEDIA</div><div class="metric-sm">${s.avgSys?`${Math.round(s.avgSys)}/${Math.round(s.avgDia)}`:'—'}</div><div class="tiny muted">${s.pressureDays} giorni</div></div><div class="goal-card"><div class="muted tiny">MEDITAZIONE</div><div class="metric-sm">${Math.round(s.medMinutes)} min</div></div><div class="goal-card"><div class="muted tiny">CAFFÈ</div><div class="metric-sm">${s.avgCoffee.toFixed(1).replace('.',',')}</div><div class="tiny muted">media/giorno</div></div><div class="goal-card"><div class="muted tiny">SALE</div><div class="metric-sm">${s.avgSalt?s.avgSalt.toFixed(1).replace('.',','):'—'} g</div><div class="tiny muted">media giorni registrati</div></div><div class="goal-card"><div class="muted tiny">PESO</div><div class="metric-sm">${delta}</div><div class="tiny muted">variazione settimana</div></div></div>`;
    bd.classList.remove('hidden');sh.classList.remove('hidden');
  }

  const view=$('#view');if(view)new MutationObserver(()=>requestAnimationFrame(render)).observe(view,{childList:true,subtree:true});setTimeout(render,300);
})();
