(() => {
  const KEY="super_me_v1";
  const $=s=>document.querySelector(s);
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{}}catch{return{}}};
  const dayKey=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
  const sameDay=(iso,key)=>{if(!iso)return false;return dayKey(iso)===key};
  const startOfWeek=()=>{const d=new Date();const n=(d.getDay()+6)%7;d.setHours(0,0,0,0);d.setDate(d.getDate()-n);return d};
  const pct=(n,d)=>d?Math.max(0,Math.min(100,Math.round(n/d*100))):0;
  const num=v=>Number.isFinite(+v)?+v:0;

  function dailyStatus(data,key){
    const food=(data.food||[]).filter(x=>sameDay(x.createdAt,key));
    const pressure=(data.pressure||[]).filter(x=>sameDay(x.createdAt,key));
    const sport=(data.sport||[]).filter(x=>sameDay(x.createdAt,key));
    const weight=(data.weight||[]).filter(x=>sameDay(x.createdAt,key));
    const calories=food.reduce((a,x)=>a+(+x.kcal||0),0);
    const calTarget=num(data.goals?.calories);
    const foodDone=food.length>0 && (!calTarget || Math.abs(calories-calTarget)<=calTarget*.12);
    const pressureDone=pressure.length>0;
    const movementDone=sport.length>0;
    const weightDone=weight.length>0;
    const core=[foodDone,pressureDone];
    const done=core.filter(Boolean).length;
    return {foodDone,pressureDone,movementDone,weightDone,done,total:core.length,complete:done===core.length,calories,calTarget};
  }

  function streak(data){
    let s=0; const d=new Date(); d.setHours(12,0,0,0);
    for(let i=0;i<120;i++){
      const k=dayKey(d);
      if(dailyStatus(data,k).complete)s++;
      else if(i===0){ d.setDate(d.getDate()-1); continue; }
      else break;
      d.setDate(d.getDate()-1);
    }
    return s;
  }

  function weekDays(data){
    const start=startOfWeek();
    const labels=['L','M','M','G','V','S','D'];
    return labels.map((label,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);const k=dayKey(d);const status=dailyStatus(data,k);const future=d>new Date();return {label,key:k,status,future,today:k===dayKey(new Date())}});
  }

  function sportFlags(data){
    const flags=data.goals?.sportFlags||{};
    const start=+startOfWeek();
    const sport=(data.sport||[]).filter(x=>+new Date(x.createdAt)>=start);
    const rows=[];
    Object.entries(flags).forEach(([type,r])=>{
      const count=num(r.count); if(!count)return;
      const done=sport.filter(x=>x.type===type && (!num(r.minMinutes)||num(x.minutes)>=num(r.minMinutes)) && (!num(r.minElevation)||num(x.elevation)>=num(r.minElevation))).length;
      rows.push({type,count,done:Math.min(done,count)});
    });
    return rows;
  }

  function render(){
    const view=$('#view');
    if(!view || $('#disciplineHero') || $('#pageTitle')?.textContent!=='Super Me')return;
    const stack=view.querySelector('.stack'); if(!stack)return;
    const data=load(); const today=dailyStatus(data,dayKey(new Date())); const st=streak(data); const week=weekDays(data);
    const flags=sportFlags(data); const flagDone=flags.reduce((a,x)=>a+x.done,0); const flagTotal=flags.reduce((a,x)=>a+x.count,0);
    const sportMinutes=(data.sport||[]).filter(x=>+new Date(x.createdAt)>=+startOfWeek()).reduce((a,x)=>a+(+x.minutes||0),0);
    const sportGoal=num(data.goals?.sportMinutes);
    const books=(data.books||[]).filter(b=>{const d=new Date((b.finishedAt||b.createdAt||'')+(String(b.finishedAt||'').length===10?'T12:00:00':''));return !isNaN(+d)&&d.getFullYear()===new Date().getFullYear()}).length;
    const booksGoal=num(data.goals?.booksPerYear);
    const hero=document.createElement('section'); hero.id='disciplineHero'; hero.className='discipline-shell';
    hero.innerHTML=`
      <div class="discipline-top">
        <div><div class="discipline-kicker">DISCIPLINA</div><div class="discipline-streak">🔥 ${st} <span>giorni</span></div></div>
        <div class="discipline-ring" style="--p:${pct(today.done,today.total)}"><div>${today.done}/${today.total}</div><small>oggi</small></div>
      </div>
      <div class="discipline-week">${week.map(x=>`<div class="discipline-day ${x.status.complete?'done':''} ${x.today?'today':''} ${x.future?'future':''}"><span>${x.label}</span><i>${x.status.complete?'✓':''}</i></div>`).join('')}</div>
      <div class="discipline-missions">
        <div class="discipline-mission ${today.foodDone?'done':''}"><span class="dm-icon">🥗</span><div><b>Alimentazione</b><small>${today.foodDone?'Giornata in target':'Completa la giornata in target'}</small></div><strong>${today.foodDone?'✓':'○'}</strong></div>
        <div class="discipline-mission ${today.pressureDone?'done':''}"><span class="dm-icon">♥</span><div><b>Pressione</b><small>${today.pressureDone?'Misurata oggi':'Registra la misurazione di oggi'}</small></div><strong>${today.pressureDone?'✓':'○'}</strong></div>
      </div>
      <div class="discipline-subgrid">
        <div class="discipline-mini"><small>MOVIMENTO</small><b>${flagTotal?`${flagDone}/${flagTotal} flag`:`${sportMinutes} min`}</b><span>${sportGoal?`${sportMinutes}/${sportGoal} min questa settimana`:'questa settimana'}</span></div>
        <div class="discipline-mini"><small>CRESCITA</small><b>${booksGoal?`${books}/${booksGoal}`:`${books} libri`}</b><span>letti nel ${new Date().getFullYear()}</span></div>
      </div>
    `;
    stack.prepend(hero);
  }

  const obs=new MutationObserver(render);obs.observe(document.body,{childList:true,subtree:true});setTimeout(render,100);
})();
