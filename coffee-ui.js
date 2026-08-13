(() => {
  const KEY='super_me_v1';
  const $=s=>document.querySelector(s);
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{}}catch{return{}}};
  const save=d=>localStorage.setItem(KEY,JSON.stringify(d));
  const uid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
  const isToday=iso=>iso&&new Date(iso).toDateString()===new Date().toDateString();

  function todayCount(d){return (d.coffee||[]).filter(x=>isToday(x.createdAt)).length;}

  function addCoffee(){
    const d=load();d.coffee||=[];d.coffee.push({id:uid(),createdAt:new Date().toISOString()});save(d);render();
  }

  function removeLastCoffee(){
    const d=load(),today=(d.coffee||[]).filter(x=>isToday(x.createdAt));
    if(!today.length)return;
    const last=[...today].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))[0];
    d.coffee=(d.coffee||[]).filter(x=>x.id!==last.id);save(d);render();
  }

  function injectGoal(){
    const sheet=$('#sheet');if(!sheet||!sheet.querySelector('#v2save')||sheet.querySelector('#coffeeGoalField'))return;
    const d=load(),goal=d.goals?.coffeeMax||'';
    const health=[...sheet.querySelectorAll('.goal-card')].find(x=>x.textContent.includes('Salute'))||sheet.querySelector('.goal-card:last-of-type');
    if(!health)return;
    const wrap=document.createElement('div');wrap.id='coffeeGoalField';wrap.className='field';wrap.innerHTML=`<label>CAFFÈ MAX / GIORNO</label><input id="coffeeGoalValue" type="number" min="0" max="20" value="${goal}">`;
    health.appendChild(wrap);
    const saveBtn=sheet.querySelector('#v2save');
    if(saveBtn&&!saveBtn.dataset.coffeeBound){saveBtn.dataset.coffeeBound='1';saveBtn.addEventListener('click',()=>{const data=load();data.goals||={};const v=+$('#coffeeGoalValue')?.value;data.goals.coffeeMax=v>0?v:null;save(data);},true);}
  }

  function render(){
    const old=$('#coffeeDailyCard');if(old)old.remove();
    if($('#pageTitle')?.textContent!=='Corpo')return;
    const d=load(),count=todayCount(d),goal=+d.goals?.coffeeMax||0;
    const host=$('#view .body-hero');if(!host)return;
    const card=document.createElement('div');card.id='coffeeDailyCard';card.style.cssText='margin-top:12px;padding-top:12px;border-top:1px solid #eee8df';
    const over=goal&&count>goal,at=goal&&count===goal;
    card.innerHTML=`<div class="row"><div><div class="muted small">☕ CAFFÈ · OGGI</div><div style="font-size:20px;font-weight:850;margin-top:2px">${count}${goal?` / ${goal}`:''}</div></div><div style="display:flex;gap:8px"><button class="chip" id="coffeeMinus" ${count?'':'disabled'}>−1</button><button class="chip" id="coffeePlus">+1</button></div></div>${goal?`<div class="tiny muted" style="margin-top:6px">${over?`Sei oltre di ${count-goal}.`:at?'Hai raggiunto il limite di oggi.':`Te ne ${goal-count===1?'resta':'restano'} ${goal-count}.`}</div>`:''}`;
    host.appendChild(card);
    $('#coffeePlus')?.addEventListener('click',addCoffee);$('#coffeeMinus')?.addEventListener('click',removeLastCoffee);
  }

  new MutationObserver(()=>{render();injectGoal();}).observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>{render();injectGoal();},250);
  window.SuperMeCoffee={add:addCoffee,removeLast:removeLastCoffee};
})();
