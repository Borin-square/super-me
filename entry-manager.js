(() => {
  const KEY='super_me_v1';
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#039;'}[c]));
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{}}catch{return{}}};
  const save=d=>localStorage.setItem(KEY,JSON.stringify(d));
  const openSheet=html=>{const sh=$('#sheet'),bd=$('#sheetBackdrop');if(!sh||!bd)return;sh.innerHTML=`<div class="handle"></div>${html}`;bd.classList.remove('hidden');sh.classList.remove('hidden');};
  const closeSheet=()=>{$('#sheetBackdrop')?.classList.add('hidden');$('#sheet')?.classList.add('hidden');};
  const fmtDate=iso=>new Date(iso).toLocaleString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});

  function updateProfileWeight(data){
    const latest=[...(data.weight||[])].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))[0];
    data.profile||={};data.profile.weight=latest?.value||data.profile.weight||null;
  }

  function remove(kind,id){
    if(!confirm('Eliminare definitivamente questa voce?'))return;
    const d=load();d[kind]=(d[kind]||[]).filter(x=>x.id!==id);if(kind==='weight')updateProfileWeight(d);save(d);closeSheet();location.reload();
  }

  function edit(kind,id){
    const d=load(),x=(d[kind]||[]).find(r=>r.id===id);if(!x)return;
    let fields='';
    if(kind==='food')fields=`<div class="field"><label>PASTO</label><select id="emMeal">${['Colazione','Pranzo','Cena','Snack'].map(v=>`<option ${v===x.meal?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label>DESCRIZIONE</label><input id="emTitle" value="${esc(x.title)}"></div><div class="grid2"><div class="field"><label>KCAL</label><input id="emKcal" type="number" value="${x.kcal||0}"></div><div class="field"><label>PROTEINE</label><input id="emP" type="number" step=".1" value="${x.p||0}"></div></div><div class="grid2"><div class="field"><label>CARBO</label><input id="emC" type="number" step=".1" value="${x.c||0}"></div><div class="field"><label>GRASSI</label><input id="emF" type="number" step=".1" value="${x.f||0}"></div></div>`;
    if(kind==='sport')fields=`<div class="field"><label>ATTIVITÀ</label><select id="emType">${['Bici','Corsa','Calisthenics','Camminata','Calcio'].map(v=>`<option ${v===x.type?'selected':''}>${v}</option>`).join('')}</select></div><div class="grid2"><div class="field"><label>MINUTI</label><input id="emMinutes" type="number" value="${x.minutes||0}"></div><div class="field"><label>KCAL</label><input id="emKcal" type="number" value="${x.kcal||0}"></div></div><div class="grid2"><div class="field"><label>KM</label><input id="emDistance" type="number" step=".1" value="${x.distance||''}"></div><div class="field"><label>D+ METRI</label><input id="emElevation" type="number" value="${x.elevation||''}"></div></div><div class="field"><label>INTENSITÀ</label><select id="emIntensity"><option value="bassa" ${x.intensity==='bassa'?'selected':''}>Bassa</option><option value="media" ${(!x.intensity||x.intensity==='media')?'selected':''}>Media</option><option value="alta" ${x.intensity==='alta'?'selected':''}>Alta</option></select></div>`;
    if(kind==='pressure')fields=`<div class="grid2"><div class="field"><label>SISTOLICA</label><input id="emSys" type="number" value="${x.sys}"></div><div class="field"><label>DIASTOLICA</label><input id="emDia" type="number" value="${x.dia}"></div></div><div class="field"><label>BATTITO</label><input id="emPulse" type="number" value="${x.pulse||''}"></div>`;
    if(kind==='weight')fields=`<div class="field"><label>PESO KG</label><input id="emWeight" type="number" step=".1" value="${x.value}"></div>`;
    if(kind==='meditation')fields=`<div class="field"><label>MINUTI</label><input id="emMinutes" type="number" value="${x.minutes}"></div>`;
    const titles={food:'Pasto',sport:'Attività',pressure:'Pressione',weight:'Peso',meditation:'Meditazione'};
    openSheet(`<div class="sheet-head"><h2>${titles[kind]||'Voce'}</h2><p class="muted">${fmtDate(x.createdAt)}</p></div><div class="goal-card">${fields}</div><button class="btn btn-primary" id="emSave" style="margin-top:12px">Salva modifiche</button><button class="btn btn-secondary" id="emDelete" style="margin-top:8px">Elimina voce</button>`);
    $('#emSave').onclick=()=>{
      if(kind==='food')Object.assign(x,{meal:$('#emMeal').value,title:$('#emTitle').value.trim(),kcal:+$('#emKcal').value||0,p:+$('#emP').value||0,c:+$('#emC').value||0,f:+$('#emF').value||0,updatedAt:new Date().toISOString()});
      if(kind==='sport')Object.assign(x,{type:$('#emType').value,minutes:+$('#emMinutes').value||0,kcal:+$('#emKcal').value||0,distance:+$('#emDistance').value||null,elevation:+$('#emElevation').value||null,intensity:$('#emIntensity').value,updatedAt:new Date().toISOString()});
      if(kind==='pressure'){const sys=+$('#emSys').value,dia=+$('#emDia').value;if(sys<=0||dia<=0)return alert('Inserisci valori validi.');Object.assign(x,{sys,dia,pulse:+$('#emPulse').value||null,updatedAt:new Date().toISOString()});}
      if(kind==='weight'){const v=+$('#emWeight').value;if(v<30||v>300)return alert('Peso non valido.');x.value=Math.round(v*10)/10;x.updatedAt=new Date().toISOString();updateProfileWeight(d);}
      if(kind==='meditation'){const v=+$('#emMinutes').value;if(v<=0)return alert('Minuti non validi.');x.minutes=Math.round(v);x.updatedAt=new Date().toISOString();}
      save(d);closeSheet();location.reload();
    };
    $('#emDelete').onclick=()=>remove(kind,id);
  }

  function decorateList(selector,records,kind){
    $$(selector).forEach((el,i)=>{
      const rec=records[i];if(!rec||el.dataset.entryManaged)return;
      el.dataset.entryManaged='1';el.style.cursor='pointer';
      const chip=document.createElement('button');chip.className='chip';chip.textContent='Modifica';chip.style.marginTop='8px';chip.addEventListener('click',e=>{e.stopPropagation();edit(kind,rec.id)});el.appendChild(chip);
      el.addEventListener('click',()=>edit(kind,rec.id));
    });
  }

  function decorate(){
    const d=load(),title=$('#pageTitle')?.textContent;
    if(title==='Corpo'){
      const food=[...(d.food||[])].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,5);
      decorateList('#view .section-title + .list-group .entry-card',food,'food');
    }
    if(title==='Movimento'){
      const sport=[...(d.sport||[])].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,10);
      decorateList('#view .section-title + .list-group .entry-card',sport,'sport');
    }
    const sh=$('#sheet');
    if(sh?.querySelector('#healthWeightChart')){
      const rows=[...(d.weight||[])].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,16);
      decorateList('#sheet .list-group .entry-card',rows,'weight');
    } else if(sh?.querySelector('#healthPressureChart')){
      const rows=[...(d.pressure||[])].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,16);
      decorateList('#sheet .list-group .entry-card',rows,'pressure');
    }
  }

  new MutationObserver(decorate).observe(document.body,{childList:true,subtree:true});
  setTimeout(decorate,200);
  window.SuperMeEntries={edit,remove};
})();
