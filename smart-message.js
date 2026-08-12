(() => {
  const KEY='super_me_v1';
  const $=s=>document.querySelector(s);
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{}}catch{return{}}};
  const num=v=>Number.isFinite(+v)?+v:0;
  const isToday=iso=>iso&&new Date(iso).toDateString()===new Date().toDateString();
  const startOfWeek=()=>{const d=new Date();const n=(d.getDay()+6)%7;d.setHours(0,0,0,0);d.setDate(d.getDate()-n);return +d};

  function status(d){
    const food=(d.food||[]).filter(x=>isToday(x.createdAt));
    const pressure=(d.pressure||[]).filter(x=>isToday(x.createdAt));
    const meditation=(d.meditation||[]).filter(x=>isToday(x.createdAt));
    const kcal=food.reduce((a,x)=>a+(+x.kcal||0),0), target=num(d.goals?.calories);
    const foodDone=food.length>0&&(!target||Math.abs(kcal-target)<=target*.12);
    const pressureDone=pressure.length>0;
    const meditationEnabled=d.goals?.meditationEnabled===true;
    const meditationTarget=num(d.goals?.meditationMinutes)||10;
    const meditationMinutes=meditation.reduce((a,x)=>a+(+x.minutes||0),0);
    const meditationDone=!meditationEnabled||meditationMinutes>=meditationTarget;
    return {foodDone,pressureDone,meditationDone,meditationEnabled,meditationTarget,meditationMinutes,kcal,target};
  }

  function weeklyFlags(d){
    const rules=d.goals?.sportFlags||{},sport=(d.sport||[]).filter(x=>+new Date(x.createdAt)>=startOfWeek());
    let total=0,done=0;
    Object.entries(rules).forEach(([type,r])=>{
      const count=num(r.count);if(!count)return;total+=count;
      const n=sport.filter(x=>x.type===type&&(!num(r.minMinutes)||num(x.minutes)>=num(r.minMinutes))&&(!num(r.minElevation)||num(x.elevation)>=num(r.minElevation))).length;
      done+=Math.min(n,count);
    });
    return {total,done,left:Math.max(0,total-done)};
  }

  function choose(d){
    const s=status(d),hour=new Date().getHours();
    const missing=[];
    if(!s.pressureDone)missing.push({key:'pressure',label:'la pressione'});
    if(!s.meditationDone)missing.push({key:'meditation',label:'la meditazione'});
    if(hour>=19&&!s.foodDone)missing.push({key:'food',label:'l’alimentazione'});

    if(missing.length===1){
      const m=missing[0];
      if(m.key==='meditation')return {icon:'◉',title:'Quasi fatta.',text:`Ti mancano ${Math.max(1,s.meditationTarget-s.meditationMinutes)} minuti di meditazione per chiudere la giornata.`,action:'meditation',cta:'Medita'};
      if(m.key==='pressure')return {icon:'♥',title:'Ti manca solo una cosa.',text:'Registra la pressione di oggi e chiudi la giornata.',action:'pressure',cta:'Registra'};
      return {icon:'🥗',title:'Ultimo check della giornata.',text:s.target?`Sei a ${Math.round(s.kcal)} kcal su ${s.target}. Controlla l’alimentazione di oggi.`:'Controlla l’alimentazione di oggi.',action:'food',cta:'Apri'};
    }

    if(missing.length>1){
      const labels=missing.map(x=>x.label).join(', ').replace(/, ([^,]*)$/, ' e $1');
      return {icon:'→',title:'La giornata è ancora aperta.',text:`Per chiuderla mancano ${labels}.`,action:missing[0].key,cta:'Continua'};
    }

    if(hour<19&&!s.foodDone){
      return {icon:'☀',title:'Giornata in corso.',text:s.target?`${Math.round(s.kcal)} / ${s.target} kcal registrate. Nessuna fretta: continua a raccontarmi cosa fai.`:'Continua a registrare la giornata quando vuoi.',action:'food',cta:'Aggiungi'};
    }

    const flags=weeklyFlags(d);
    if(flags.total&&flags.left>0){
      return {icon:'✓',title:'Giornata chiusa.',text:`Oggi hai fatto quello che avevi deciso. Questa settimana restano ${flags.left} ${flags.left===1?'flag sport':'flag sport'} da completare.`,action:'movement',cta:'Movimento'};
    }

    return {icon:'✓',title:'Giornata completa.',text:'Hai fatto quello che avevi deciso di fare. Per oggi basta così.',action:null,cta:null};
  }

  function act(kind){
    if(kind==='meditation'){$('#meditationMission')?.click();return;}
    if(kind==='movement'){$("[data-tab='sport']")?.click();return;}
    if(kind==='pressure'||kind==='food'){$('#addBtn')?.click();return;}
  }

  function render(){
    const old=$('#smartDisciplineMessage');
    if($('#pageTitle')?.textContent!=='Super Me'){old?.remove();return;}
    const hero=$('#disciplineHero');if(!hero)return;
    const msg=choose(load());
    if(old)old.remove();
    const card=document.createElement('section');card.id='smartDisciplineMessage';card.style.cssText='margin-top:12px;padding:15px 16px;border:1px solid rgba(51,66,46,.10);border-radius:20px;background:#fffaf4;display:flex;gap:12px;align-items:center';
    card.innerHTML=`<div style="width:38px;height:38px;border-radius:50%;background:#f1a33d;display:grid;place-items:center;font-weight:900;flex:0 0 auto">${msg.icon}</div><div style="flex:1;min-width:0"><div style="font-weight:850">${msg.title}</div><div class="muted small" style="margin-top:3px;line-height:1.35">${msg.text}</div></div>${msg.cta?`<button class="chip" id="smartMessageAction">${msg.cta}</button>`:''}`;
    hero.insertAdjacentElement('afterend',card);
    $('#smartMessageAction')?.addEventListener('click',()=>act(msg.action));
  }

  const view=$('#view');if(view)new MutationObserver(()=>setTimeout(render,0)).observe(view,{childList:true,subtree:true});
  window.addEventListener('storage',render);
  setTimeout(render,250);
})();
