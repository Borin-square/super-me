(() => {
  const KEY = "super_me_v1";

  const $ = s => document.querySelector(s);
  const num = v => Number.isFinite(+v) ? +v : 0;
  const clamp = (n,a,b) => Math.max(a, Math.min(b,n));
  const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

  function load(){
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch { return {}; }
  }

  function save(data){
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function startOfWeek(){
    const d = new Date();
    const day = (d.getDay()+6)%7;
    d.setHours(0,0,0,0);
    d.setDate(d.getDate()-day);
    return d;
  }

  function weekItems(items=[]){
    const start = +startOfWeek();
    return items.filter(x => +new Date(x.createdAt) >= start);
  }

  function avg(arr){ return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0; }
  function sum(arr,key){ return arr.reduce((a,x)=>a+(+x[key]||0),0); }
  function pct(n,d){ return d ? clamp(Math.round(n/d*100),0,100) : 0; }

  function goalProgress(data){
    const food = weekItems(data.food || []);
    const sport = weekItems(data.sport || []);
    const pressure = weekItems(data.pressure || []);
    const goals = data.goals || {};

    const foodDays = {};
    food.forEach(x => {
      const k = new Date(x.createdAt).toDateString();
      foodDays[k] ||= {kcal:0,p:0};
      foodDays[k].kcal += +x.kcal || 0;
      foodDays[k].p += +x.p || 0;
    });
    const days = Object.values(foodDays);
    const calTarget = num(goals.calories);
    const proteinTarget = num(goals.protein);
    const calorieDays = calTarget ? days.filter(d => Math.abs(d.kcal-calTarget) <= calTarget*0.10).length : 0;
    const proteinAvg = days.length ? avg(days.map(d=>d.p)) : 0;
    const sportMinutes = sum(sport,"minutes");
    const workoutCount = sport.length;

    const pressureDays = new Set(pressure.map(x=>new Date(x.createdAt).toDateString())).size;

    return { food, sport, pressure, days, calorieDays, proteinAvg, sportMinutes, workoutCount, pressureDays };
  }

  function miniProgress(label,value,goal,color="#6f9271"){
    const p = pct(value,goal);
    return `<div style="margin-top:12px">
      <div class="row small"><span>${esc(label)}</span><b>${Math.round(value)}${goal?` / ${Math.round(goal)}`:""}</b></div>
      <div class="progress" style="background:#eee8df;margin:7px 0 0"><i style="width:${p}%;background:${color}"></i></div>
    </div>`;
  }

  function injectWeeklyCard(){
    const view = $("#view");
    if(!view || $("#goalsV2Weekly")) return;
    const isToday = $("#pageTitle")?.textContent === "Super Me";
    if(!isToday) return;

    const data = load();
    const goals = data.goals || {};
    const m = goalProgress(data);
    const targetWeight = num(goals.weightTarget);
    const currentWeight = num(data.profile?.weight);

    const card = document.createElement("section");
    card.id = "goalsV2Weekly";
    card.className = "card";
    card.style.marginTop = "14px";
    card.innerHTML = `
      <div class="row">
        <div>
          <div class="muted small">QUESTA SETTIMANA</div>
          <div style="font-size:20px;font-weight:850;margin-top:3px">Il tuo piano</div>
        </div>
        <button id="openGoalsV2Mini" class="chip">Obiettivi</button>
      </div>
      ${goals.calories ? miniProgress("Giorni calorie in target",m.calorieDays,7,"#ef8d70") : ""}
      ${goals.protein ? miniProgress("Proteine medie · g",m.proteinAvg,goals.protein,"#81adbd") : ""}
      ${goals.sportMinutes ? miniProgress("Sport · minuti",m.sportMinutes,goals.sportMinutes,"#6f9271") : ""}
      ${goals.workoutsPerWeek ? miniProgress("Allenamenti",m.workoutCount,goals.workoutsPerWeek,"#f0bc55") : ""}
      ${goals.pressureMeasurements ? miniProgress("Giorni con pressione",m.pressureDays,goals.pressureMeasurements,"#b56662") : ""}
      ${currentWeight && targetWeight ? `<div class="notice" style="margin-top:13px"><b>${currentWeight.toFixed(1)} kg → ${targetWeight.toFixed(1)} kg</b>${goals.targetDate?` · obiettivo ${new Date(goals.targetDate+"T12:00:00").toLocaleDateString("it-IT",{day:"numeric",month:"short"})}`:""}</div>`:""}
    `;
    view.querySelector(".stack")?.appendChild(card);
    $("#openGoalsV2Mini")?.addEventListener("click", openGoalsV2);
  }

  function openSheet(html){
    const sheet = $("#sheet"), backdrop = $("#sheetBackdrop");
    if(!sheet || !backdrop) return;
    sheet.innerHTML = `<div class="handle"></div>${html}`;
    backdrop.classList.remove("hidden");
    sheet.classList.remove("hidden");
  }

  function calcPlan(){
    const weight = num($("#v2weight")?.value);
    const height = num($("#v2height")?.value);
    const age = num($("#v2age")?.value);
    const sex = $("#v2sex")?.value;
    const activity = num($("#v2activity")?.value) || 1.4;
    const targetWeight = num($("#v2targetWeight")?.value);
    if(!weight || !height || !age || !sex){
      alert("Per proporre il piano inserisci peso, altezza, età e sesso.");
      return;
    }
    const bmr = sex === "M" ? (10*weight + 6.25*height - 5*age + 5) : (10*weight + 6.25*height - 5*age - 161);
    const maintenance = bmr * activity;
    const losing = targetWeight && targetWeight < weight;
    const calories = Math.round((losing ? maintenance - 400 : maintenance)/50)*50;
    const protein = Math.round(weight * 1.6 / 5)*5;
    $("#v2calories").value = Math.max(1500,calories);
    $("#v2protein").value = protein;
    if(!$("#v2workouts").value) $("#v2workouts").value = 4;
    if(!$("#v2sportMinutes").value) $("#v2sportMinutes").value = 180;
    $("#v2calcNote").innerHTML = `Stima proposta: circa <b>${Math.max(1500,calories)} kcal</b> e <b>${protein} g proteine</b>/giorno. È un punto di partenza, non un target clinico.`;
  }

  function openGoalsV2(){
    const data = load();
    data.profile ||= {};
    data.goals ||= {};
    const p = data.profile, g = data.goals;

    openSheet(`
      <div class="sheet-head">
        <h2>Obiettivi Super Me ☀️</h2>
        <p class="muted">Un obiettivo chiaro, poi comportamenti settimanali semplici.</p>
      </div>

      <div class="goal-card">
        <div class="row"><div class="goal-icon">🎯</div><b>Dove voglio arrivare</b></div>
        <div class="grid2">
          <div class="field"><label>PESO ATTUALE KG</label><input id="v2weight" type="number" step=".1" value="${p.weight||""}"></div>
          <div class="field"><label>PESO OBIETTIVO KG</label><input id="v2targetWeight" type="number" step=".1" value="${g.weightTarget||""}"></div>
        </div>
        <div class="field"><label>DATA OBIETTIVO</label><input id="v2targetDate" type="date" value="${g.targetDate||""}"></div>
      </div>

      <div class="goal-card" style="margin-top:10px">
        <div class="row"><div class="goal-icon">✨</div><b>Calcola il mio piano</b></div>
        <div class="grid2">
          <div class="field"><label>ALTEZZA CM</label><input id="v2height" type="number" value="${p.height||""}"></div>
          <div class="field"><label>ETÀ</label><input id="v2age" type="number" value="${p.age||""}"></div>
        </div>
        <div class="grid2">
          <div class="field"><label>SESSO</label><select id="v2sex"><option value="">—</option><option value="M" ${p.sex==="M"?"selected":""}>Uomo</option><option value="F" ${p.sex==="F"?"selected":""}>Donna</option></select></div>
          <div class="field"><label>ATTIVITÀ QUOTIDIANA</label><select id="v2activity"><option value="1.2">Sedentaria</option><option value="1.4" ${String(p.activity||1.4)==="1.4"?"selected":""}>Leggera</option><option value="1.55" ${String(p.activity)==="1.55"?"selected":""}>Media</option><option value="1.7" ${String(p.activity)==="1.7"?"selected":""}>Alta</option></select></div>
        </div>
        <button class="btn btn-secondary" id="v2calc">✨ Proponi il piano</button>
        <div class="notice" id="v2calcNote" style="margin-top:10px">La stima serve come base da confermare e modificare.</div>
      </div>

      <div class="goal-card" style="margin-top:10px">
        <div class="row"><div class="goal-icon">📅</div><b>Il mio piano settimanale</b></div>
        <div class="grid2">
          <div class="field"><label>CALORIE / GIORNO</label><input id="v2calories" type="number" value="${g.calories||""}"></div>
          <div class="field"><label>PROTEINE G / GIORNO</label><input id="v2protein" type="number" value="${g.protein||""}"></div>
        </div>
        <div class="grid2">
          <div class="field"><label>ALLENAMENTI / SETTIMANA</label><input id="v2workouts" type="number" value="${g.workoutsPerWeek||""}"></div>
          <div class="field"><label>MINUTI SPORT / SETTIMANA</label><input id="v2sportMinutes" type="number" value="${g.sportMinutes||""}"></div>
        </div>
      </div>

      <div class="goal-card" style="margin-top:10px">
        <div class="row"><div class="goal-icon">♥️</div><b>Salute</b></div>
        <div class="grid2">
          <div class="field"><label>SISTOLICA MAX</label><input id="v2sys" type="number" value="${g.sysMax||""}"></div>
          <div class="field"><label>DIASTOLICA MAX</label><input id="v2dia" type="number" value="${g.diaMax||""}"></div>
        </div>
        <div class="field"><label>GIORNI DI MISURAZIONE / SETTIMANA</label><input id="v2pressureMeasurements" type="number" min="0" max="7" value="${g.pressureMeasurements||""}"></div>
        <div class="notice">Super Me non calcola automaticamente un target pressorio: usa qui il riferimento concordato con il medico.</div>
      </div>

      <button class="btn btn-primary" id="v2save" style="margin-top:14px">Salva il mio piano</button>
    `);

    $("#v2calc")?.addEventListener("click", calcPlan);
    $("#v2save")?.addEventListener("click", () => {
      const d = load(); d.profile ||= {}; d.goals ||= {};
      d.profile.weight = num($("#v2weight").value) || null;
      d.profile.height = num($("#v2height").value) || null;
      d.profile.age = num($("#v2age").value) || null;
      d.profile.sex = $("#v2sex").value || null;
      d.profile.activity = num($("#v2activity").value) || 1.4;
      d.goals.weightTarget = num($("#v2targetWeight").value) || null;
      d.goals.targetDate = $("#v2targetDate").value || null;
      d.goals.calories = num($("#v2calories").value) || null;
      d.goals.protein = num($("#v2protein").value) || null;
      d.goals.workoutsPerWeek = num($("#v2workouts").value) || null;
      d.goals.sportMinutes = num($("#v2sportMinutes").value) || null;
      d.goals.sysMax = num($("#v2sys").value) || null;
      d.goals.diaMax = num($("#v2dia").value) || null;
      d.goals.pressureMeasurements = num($("#v2pressureMeasurements").value) || null;
      save(d);
      location.reload();
    });
  }

  document.addEventListener("click", e => {
    const target = e.target.closest("#settingsBtn,#goalCta");
    if(!target) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openGoalsV2();
  }, true);

  const observer = new MutationObserver(() => injectWeeklyCard());
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(injectWeeklyCard,100);
})();
