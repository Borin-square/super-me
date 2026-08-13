(() => {
  const KEY='super_me_v1';
  const $=s=>document.querySelector(s);
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{}}catch{return{}}};
  const save=d=>localStorage.setItem(KEY,JSON.stringify(d));
  const num=v=>Number.isFinite(+v)?+v:0;
  const isToday=iso=>iso&&new Date(iso).toDateString()===new Date().toDateString();
  const saltG=food=>(food||[]).reduce((a,x)=>a+((+x.sodiumMg||0)*2.5/1000),0);
  const fmt=v=>(Math.round(v*10)/10).toFixed(1).replace('.',',');

  function injectGoalField(){
    const sheet=$('#sheet');if(!sheet||!$('#v2save')||$('#v2salt'))return;
    const cards=[...sheet.querySelectorAll('.goal-card')];
    const plan=cards.find(c=>c.textContent.includes('Il mio piano settimanale'));
    if(!plan)return;
    const d=load(),g=d.goals||{};
    const wrap=document.createElement('div');wrap.className='field';wrap.style.marginTop='10px';
    wrap.innerHTML=`<label>SALE MAX · G / GIORNO</label><input id="v2salt" type="number" step="0.1" min="0" value="${g.saltGrams||''}" placeholder="es. 5,0"><div class="tiny muted" style="margin-top:6px">Usato come obiettivo personale nell’app. Puoi modificarlo quando vuoi.</div>`;
    plan.appendChild(wrap);
  }

  document.addEventListener('click',e=>{
    const t=e.target.closest('#v2save');if(!t)return;
    const field=$('#v2salt');if(!field)return;
    const d=load();d.goals||={};d.goals.saltGrams=num(field.value)||null;save(d);
  },true);

  function renderBodySalt(){
    if($('#pageTitle')?.textContent!=='Corpo')return;
    const hero=$('#view .body-hero');if(!hero)return;
    let box=$('#bodySaltGoal');if(box)box.remove();
    const d=load(),today=(d.food||[]).filter(x=>isToday(x.createdAt));
    const used=saltG(today),goal=num(d.goals?.saltGrams),pct=goal?Math.min(100,Math.round(used/goal*100)):0,left=goal-used;
    box=document.createElement('div');box.id='bodySaltGoal';box.style.marginTop='12px';
    box.innerHTML=`<div class="row small"><span>Sale <b>${fmt(used)}${goal?` / ${fmt(goal)}`:''} g</b></span><span class="tiny muted">${goal?(left>=0?`${fmt(left)} g rimasti`:`${fmt(Math.abs(left))} g oltre`):'imposta obiettivo'}</span></div>${goal?`<div class="progress" style="background:#eee8df;margin-top:7px"><i style="width:${pct}%;background:${used<=goal?'#6f9271':'#b96864'}"></i></div>`:''}`;
    hero.appendChild(box);

    const rows=[...$('#view')?.querySelectorAll('.section-title + .list-group .entry-card')||[]];
    const recent=[...(d.food||[])].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,5);
    rows.forEach((el,i)=>{const x=recent[i];if(!x||el.querySelector('.salt-entry-note'))return;const g=(+x.sodiumMg||0)*2.5/1000;const note=document.createElement('div');note.className='tiny muted salt-entry-note';note.style.marginTop='4px';note.textContent=`Sale ~${fmt(g)} g${x.sodiumEstimated!==false?' · stima':''}`;el.querySelector('div')?.appendChild(note);});
  }

  function decorateFoodEditor(){
    const sheet=$('#sheet');if(!sheet)return;
    const title=sheet.querySelector('.sheet-head h2')?.textContent;
    if(title!=='Pasto'||!$('#emKcal')||$('#emSalt'))return;
    const btn=$('#emSave');if(!btn)return;
    const d=load();
    const food=[...(d.food||[])];
    const kcal=num($('#emKcal').value),name=$('#emTitle')?.value||'';
    const candidate=food.find(x=>num(x.kcal)===kcal&&x.title===name) || null;
    const g=candidate?((+candidate.sodiumMg||0)*2.5/1000):0;
    const field=document.createElement('div');field.className='field';field.innerHTML=`<label>SALE · G</label><input id="emSalt" type="number" step="0.1" min="0" value="${fmt(g).replace(',','.')}">`;
    btn.before(field);
    btn.addEventListener('click',()=>{
      if(!candidate)return;
      const data=load(),row=(data.food||[]).find(x=>x.id===candidate.id);if(!row)return;
      row.sodiumMg=Math.round((+$('#emSalt').value||0)*400);row.sodiumEstimated=false;save(data);
    },true);
  }

  function run(){injectGoalField();renderBodySalt();decorateFoodEditor();}
  new MutationObserver(()=>setTimeout(run,0)).observe(document.body,{childList:true,subtree:true});
  setTimeout(run,250);
})();
