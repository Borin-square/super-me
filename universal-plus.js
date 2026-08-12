(() => {
  const KEY='super_me_v1';
  const $=s=>document.querySelector(s);
  const uid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{}}catch{return{}}};
  const save=d=>localStorage.setItem(KEY,JSON.stringify(d));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#039;'}[c]));
  let mediaRecorder=null,chunks=[],stream=null,timer=null,start=0,lastImage='';

  const MET={
    Bici:{bassa:5.5,media:7.5,alta:10},
    Corsa:{bassa:7,media:9.8,alta:12},
    Calisthenics:{bassa:3.8,media:6,alta:8},
    Camminata:{bassa:2.8,media:3.8,alta:5},
    Calcio:{bassa:5.5,media:8,alta:10}
  };

  function currentWeight(){
    const d=load();
    const rows=[...(d.weight||[])].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    return +(rows[0]?.value||d.profile?.weight||80);
  }
  function estimateSportKcal(type,minutes,intensity){
    const kg=currentWeight(),met=MET[type]?.[intensity]||MET[type]?.media||6;
    return Math.max(1,Math.round(met*kg*(+minutes||0)/60));
  }

  async function readJsonSafe(response){
    const text=await response.text();
    try{return JSON.parse(text)}catch{
      if(!response.ok) throw new Error('Il server non riesce a interpretare il dato in questo momento. Riprova tra poco.');
      throw new Error('Risposta del server non valida.');
    }
  }

  function openSheet(html){const sh=$('#sheet'),bd=$('#sheetBackdrop');if(!sh||!bd)return;sh.innerHTML=`<div class="handle"></div>${html}`;bd.classList.remove('hidden');sh.classList.remove('hidden');}
  function close(){try{if(mediaRecorder&&mediaRecorder.state!=='inactive')mediaRecorder.stop()}catch{};if(stream)stream.getTracks().forEach(t=>t.stop());clearInterval(timer);mediaRecorder=null;stream=null;$('#sheetBackdrop')?.classList.add('hidden');$('#sheet')?.classList.add('hidden');}
  function home(){openSheet(`<div class="sheet-head"><h2>Aggiungi</h2><p class="muted">Raccontami cosa hai fatto, mostramelo o scrivilo.</p></div><div class="action-list"><button class="action" id="uVoice"><span class="ico">🎙️</span><span><b>Parla</b><small>Cibo, sport, pressione, peso, meditazione, libri, sigarette</small></span></button><button class="action" id="uPhoto"><span class="ico">📸</span><span><b>Foto</b><small>Piatto, bilancia, misuratore, copertina</small></span></button><button class="action" id="uText"><span class="ico">✍️</span><span><b>Scrivi</b><small>Scrivi liberamente cosa vuoi registrare</small></span></button></div>`);$('#uVoice').onclick=voice;$('#uPhoto').onclick=photo;$('#uText').onclick=text;}
  function text(){openSheet(`<div class="sheet-head"><h2>Scrivi</h2><p class="muted">Esempio: “peso 97,7”, “ho meditato 12 minuti”, “ho finito Memorie di Adriano”.</p></div><div class="field"><label>COSA VUOI REGISTRARE?</label><textarea id="uTextValue" autofocus></textarea></div><button class="btn btn-primary" id="uAnalyze">Interpreta</button>`);$('#uAnalyze').onclick=()=>analyze({text:$('#uTextValue').value.trim()});}
  async function voice(){
    if(!navigator.mediaDevices?.getUserMedia){alert('Microfono non disponibile.');return;}
    try{stream=await navigator.mediaDevices.getUserMedia({audio:true});chunks=[];const type=MediaRecorder.isTypeSupported('audio/webm;codecs=opus')?'audio/webm;codecs=opus':'audio/webm';mediaRecorder=new MediaRecorder(stream,{mimeType:type});start=Date.now();
      openSheet(`<div class="sheet-head"><h2>Sto ascoltando</h2><p class="muted">Parla normalmente.</p></div><button class="voice-orb live" id="uStop">■</button><div class="timer" id="uTimer">00:00</div><button class="btn btn-secondary" id="uCancel">Annulla</button>`);
      const fmt=()=>{const s=Math.floor((Date.now()-start)/1000);if($('#uTimer'))$('#uTimer').textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`};timer=setInterval(fmt,250);mediaRecorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};mediaRecorder.onstop=async()=>{clearInterval(timer);stream?.getTracks().forEach(t=>t.stop());const blob=new Blob(chunks,{type});const fr=new FileReader();fr.onload=async()=>{try{openSheet(`<div class="loading"><span class="spinner"></span><b>Trascrivo e interpreto…</b></div>`);const r=await fetch('/api/transcribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audioDataUrl:fr.result})});const j=await readJsonSafe(r);if(!r.ok)throw new Error(j.error||'Trascrizione non riuscita');await analyze({text:j.text});}catch(e){alert(e.message);home();}};fr.readAsDataURL(blob);};mediaRecorder.start();$('#uStop').onclick=()=>mediaRecorder.stop();$('#uCancel').onclick=close;
    }catch(e){alert('Non riesco ad accedere al microfono.');}
  }
  function compress(file){return new Promise((resolve,reject)=>{const fr=new FileReader();fr.onerror=reject;fr.onload=()=>{const img=new Image();img.onerror=reject;img.onload=()=>{const sc=Math.min(1,1000/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);c.getContext('2d').drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',.8));};img.src=fr.result};fr.readAsDataURL(file)});}
  function photo(){const inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.capture='environment';inp.onchange=async()=>{const f=inp.files?.[0];if(!f)return;try{lastImage=await compress(f);await analyze({imageDataUrl:lastImage});}catch(e){alert(e.message);home();}};inp.click();}
  async function analyze(payload){
    if(!payload.text&&!payload.imageDataUrl)return;
    openSheet(`<div class="loading"><span class="spinner"></span><b>Sto interpretando…</b></div>`);
    try{
      const r=await fetch('/api/parse-v2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const d=await readJsonSafe(r);
      if(!r.ok)throw new Error(d.error||'AI non disponibile');
      if(d.kind==='sport'&&!d.kcalExplicit)d.kcal=estimateSportKcal(d.type,d.minutes,d.intensity||'media');
      confirmData(d);
    }catch(e){alert(e.message);home();}
  }
  function fields(d){
    if(d.kind==='food')return `<div class="field"><label>PASTO</label><select id="fMeal">${['Colazione','Pranzo','Cena','Snack'].map(x=>`<option ${x===d.meal?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>DESCRIZIONE</label><input id="fTitle" value="${esc(d.title)}"></div><div class="grid2"><div class="field"><label>KCAL</label><input id="fKcal" type="number" value="${d.kcal}"></div><div class="field"><label>PROTEINE G</label><input id="fP" type="number" step=".1" value="${d.p}"></div></div><div class="grid2"><div class="field"><label>CARBO G</label><input id="fC" type="number" step=".1" value="${d.c}"></div><div class="field"><label>GRASSI G</label><input id="fF" type="number" step=".1" value="${d.f}"></div></div>`;
    if(d.kind==='sport')return `<div class="field"><label>ATTIVITÀ</label><select id="sType">${['Bici','Corsa','Calisthenics','Camminata','Calcio'].map(x=>`<option ${x===d.type?'selected':''}>${x}</option>`).join('')}</select></div><div class="grid2"><div class="field"><label>MINUTI</label><input id="sMin" type="number" value="${d.minutes}"></div><div class="field"><label>KCAL</label><input id="sKcal" type="number" value="${d.kcal||0}"></div></div><div class="grid2"><div class="field"><label>KM</label><input id="sDist" type="number" step=".1" value="${d.distance||''}"></div><div class="field"><label>D+ METRI</label><input id="sElev" type="number" value="${d.elevation||''}"></div></div><div class="field"><label>INTENSITÀ</label><select id="sIntensity"><option value="bassa" ${d.intensity==='bassa'?'selected':''}>Bassa</option><option value="media" ${(!d.intensity||d.intensity==='media')?'selected':''}>Media</option><option value="alta" ${d.intensity==='alta'?'selected':''}>Alta</option></select></div><div class="notice" id="sportKcalNote">${d.kcalExplicit?'Calorie dichiarate dall’utente.':`Stima su ${currentWeight().toFixed(1).replace('.',',')} kg · ${d.intensity||'media'} intensità.`}</div>`;
    if(d.kind==='pressure')return `<div class="grid2"><div class="field"><label>SISTOLICA</label><input id="pSys" type="number" value="${d.sys}"></div><div class="field"><label>DIASTOLICA</label><input id="pDia" type="number" value="${d.dia}"></div></div><div class="field"><label>BATTITO</label><input id="pPulse" type="number" value="${d.pulse||''}"></div>`;
    if(d.kind==='weight')return `<div class="field"><label>PESO KG</label><input id="wValue" type="number" step=".1" value="${d.weight}"></div>`;
    if(d.kind==='meditation')return `<div class="field"><label>MINUTI</label><input id="mMinutes" type="number" value="${d.minutes}"></div>`;
    if(d.kind==='book')return `<div class="field"><label>TITOLO</label><input id="bTitle" value="${esc(d.title)}"></div><div class="field"><label>AUTORE</label><input id="bAuthor" value="${esc(d.author||'')}"></div>${lastImage?`<img src="${lastImage}" class="photo-preview" alt="Copertina">`:''}`;
    return `<div class="notice">${d.smokingAction==='smoked'?'Registrerò che hai fumato oggi e il contatore ripartirà da oggi.':'Imposterò oggi come nuovo giorno di partenza senza sigarette.'}</div>`;
  }
  function label(k){return ({food:'Alimentazione',sport:'Movimento',pressure:'Pressione',weight:'Peso',meditation:'Meditazione',book:'Lettura',smoking:'Sigarette'})[k]||k;}
  function bindSportRecalc(d){
    if(d.kind!=='sport'||d.kcalExplicit)return;
    const recalc=()=>{const type=$('#sType')?.value||d.type,minutes=+$('#sMin')?.value||0,intensity=$('#sIntensity')?.value||'media';const kcal=estimateSportKcal(type,minutes,intensity);if($('#sKcal'))$('#sKcal').value=kcal;if($('#sportKcalNote'))$('#sportKcalNote').textContent=`Stima su ${currentWeight().toFixed(1).replace('.',',')} kg · ${intensity} intensità.`;};
    $('#sType')?.addEventListener('change',recalc);$('#sMin')?.addEventListener('input',recalc);$('#sIntensity')?.addEventListener('change',recalc);
  }
  function confirmData(d){openSheet(`<div class="sheet-head"><h2>${label(d.kind)}</h2><p class="muted">Controlla prima di salvare.</p></div><div class="goal-card">${fields(d)}</div><button class="btn btn-primary" id="uSave" style="margin-top:12px">Salva</button><button class="btn btn-secondary" id="uBack" style="margin-top:8px">Indietro</button>`);bindSportRecalc(d);$('#uSave').onclick=()=>commit(d);$('#uBack').onclick=home;}
  function commit(d){const data=load(),now=new Date().toISOString();
    if(d.kind==='food'){data.food||=[];data.food.push({id:uid(),meal:$('#fMeal').value,title:$('#fTitle').value.trim(),kcal:+$('#fKcal').value||0,p:+$('#fP').value||0,c:+$('#fC').value||0,f:+$('#fF').value||0,estimated:true,createdAt:now});}
    else if(d.kind==='sport'){data.sport||=[];data.sport.push({id:uid(),type:$('#sType').value,minutes:+$('#sMin').value||0,distance:+$('#sDist').value||null,elevation:+$('#sElev').value||null,intensity:$('#sIntensity')?.value||d.intensity||'media',kcal:+$('#sKcal').value||0,kcalEstimated:!d.kcalExplicit,weightUsed:!d.kcalExplicit?currentWeight():null,createdAt:now});}
    else if(d.kind==='pressure'){data.pressure||=[];data.pressure.push({id:uid(),sys:+$('#pSys').value||0,dia:+$('#pDia').value||0,pulse:+$('#pPulse').value||null,context:d.context||'riposo',createdAt:now});}
    else if(d.kind==='weight'){const v=+$('#wValue').value;if(v<30||v>300)return alert('Peso non valido.');data.weight||=[];data.profile||={};data.weight.push({id:uid(),value:Math.round(v*10)/10,createdAt:now});data.profile.weight=Math.round(v*10)/10;}
    else if(d.kind==='meditation'){const v=+$('#mMinutes').value;if(v<=0)return alert('Minuti non validi.');data.meditation||=[];data.meditation.push({id:uid(),minutes:Math.round(v),createdAt:now});}
    else if(d.kind==='book'){const title=$('#bTitle').value.trim();if(!title)return alert('Titolo mancante.');data.books||=[];data.books.push({id:uid(),title,author:$('#bAuthor').value.trim(),finishedAt:new Date().toISOString().slice(0,10),comment:'',cover:lastImage||'',createdAt:now});}
    else if(d.kind==='smoking'){data.smoking={...(data.smoking||{}),since:now};}
    save(data);lastImage='';close();location.reload();
  }

  document.addEventListener('click',e=>{const t=e.target.closest('#addBtn,[data-quick]');if(!t)return;e.preventDefault();e.stopImmediatePropagation();const q=t.dataset.quick;if(q==='voice')voice();else if(q==='photo')photo();else if(q==='text')text();else home();},true);
  window.SuperMeUniversalPlus={open:home};
})();