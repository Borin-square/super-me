(() => {
  const KEY='super_me_v1';
  const $=s=>document.querySelector(s);
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{}}catch{return{}}};
  const save=d=>localStorage.setItem(KEY,JSON.stringify(d));
  const uid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#039;'}[c]));
  const num=v=>Number(String(v??'').replace(',','.'))||0;
  const saltFromSodium=mg=>Math.round(((+mg||0)*2.5/1000)*10)/10;
  const sodiumFromSalt=g=>Math.max(0,Math.round((+g||0)*400));
  let mediaRecorder=null,chunks=[],stream=null,timer=null,start=0,lastImage='';

  const MET={Bici:{bassa:5.5,media:7.5,alta:10},Corsa:{bassa:7,media:9.8,alta:12},Calisthenics:{bassa:3.8,media:6,alta:8},Camminata:{bassa:2.8,media:3.8,alta:5},Calcio:{bassa:5.5,media:8,alta:10}};
  function currentWeight(){const d=load(),rows=[...(d.weight||[])].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));return +(rows[0]?.value||d.profile?.weight||80)}
  function sportKcal(type,minutes,intensity){const met=MET[type]?.[intensity]||MET[type]?.media||6;return Math.max(1,Math.round(met*currentWeight()*(+minutes||0)/60))}
  async function readJson(r){const t=await r.text();try{return JSON.parse(t)}catch{throw new Error(r.ok?'Risposta del server non valida.':'Errore server. Riprova.')}}
  function open(html){const sh=$('#sheet'),bd=$('#sheetBackdrop');if(!sh||!bd)return;sh.innerHTML=`<div class="handle"></div>${html}`;bd.classList.remove('hidden');sh.classList.remove('hidden')}
  function close(){try{if(mediaRecorder&&mediaRecorder.state!=='inactive')mediaRecorder.stop()}catch{};stream?.getTracks().forEach(t=>t.stop());clearInterval(timer);mediaRecorder=null;stream=null;$('#sheetBackdrop')?.classList.add('hidden');$('#sheet')?.classList.add('hidden')}

  function home(){open(`<div class="sheet-head"><h2>Aggiungi</h2><p class="muted">Puoi dire anche più cose insieme.</p></div><div class="action-list"><button class="action" id="v3Voice"><span class="ico">🎙️</span><span><b>Parla</b><small>“Due caffè, peso 96,8 e pressione 137 su 89”</small></span></button><button class="action" id="v3Photo"><span class="ico">📸</span><span><b>Foto</b><small>Piatto, bilancia, pressione, libro</small></span></button><button class="action" id="v3Text"><span class="ico">✍️</span><span><b>Scrivi</b><small>Una o più cose nella stessa frase</small></span></button></div>`);$('#v3Voice').onclick=voice;$('#v3Photo').onclick=photo;$('#v3Text').onclick=()=>editTranscript('')}
  function editTranscript(text){open(`<div class="sheet-head"><h2>${text?'Ho capito questo':'Scrivi'}</h2><p class="muted">Correggi pure la frase prima di salvarla.</p></div><div class="field"><label>TESTO</label><textarea id="v3Transcript" rows="4" autofocus>${esc(text)}</textarea></div><button class="btn btn-primary" id="v3Analyze">Interpreta</button><button class="btn btn-secondary" id="v3Back" style="margin-top:8px">Indietro</button>`);$('#v3Analyze').onclick=()=>analyzeText($('#v3Transcript').value.trim());$('#v3Back').onclick=home}

  function exactShortcuts(text){
    const entries=[];let rest=text.toLowerCase();
    const p=rest.match(/(?:pressione\s*)?(\d{2,3})\s*(?:su|\/)\s*(\d{2,3})(?:\s*(?:battito|pulse)\s*(\d{2,3}))?/i);
    if(p){entries.push({kind:'pressure',confidence:1,needsReview:false,note:'',sys:+p[1],dia:+p[2],pulse:+p[3]||0,context:'riposo'});rest=rest.replace(p[0],' ')}
    const w=rest.match(/(?:peso|peso corporeo)\s*(?:è|:)?\s*(\d{2,3}(?:[,.]\d)?)/i);
    if(w){entries.push({kind:'weight',confidence:1,needsReview:false,note:'',weight:num(w[1])});rest=rest.replace(w[0],' ')}
    const words={un:1,uno:1,una:1,due:2,tre:3,quattro:4,cinque:5,sei:6};
    const c=rest.match(/(?:(un|uno|una|due|tre|quattro|cinque|sei|\d+)\s+)?caff[eè]/i);
    if(c){const n=words[(c[1]||'un').toLowerCase()]||(+c[1]||1);entries.push({kind:'coffee',confidence:1,needsReview:false,note:'',coffeeCount:n});rest=rest.replace(c[0],' ')}
    const clean=rest.replace(/\b(ho|bevuto|misurato|e|poi|anche|oggi|il|la|di|un|una|sono|a|kg|chilogrammi)\b/gi,' ').replace(/[,.]/g,' ').replace(/\s+/g,' ').trim();
    if(entries.length&&clean.length<3)return entries;
    return null;
  }

  async function analyzeText(text){if(!text)return;const shortcut=exactShortcuts(text);if(shortcut)return confirm(shortcut,text);return analyze({text},text)}
  async function analyze(payload,source=''){open(`<div class="loading"><span class="spinner"></span><b>Interpreto e verifico…</b></div>`);try{const r=await fetch('/api/parse-v3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),j=await readJson(r);if(!r.ok)throw new Error(j.error||'Analisi non riuscita');confirm(j.entries||[],source)}catch(e){alert(e.message);source?editTranscript(source):home()}}

  async function voice(){
    if(!navigator.mediaDevices?.getUserMedia)return alert('Microfono non disponibile.');
    try{stream=await navigator.mediaDevices.getUserMedia({audio:true});chunks=[];const type=MediaRecorder.isTypeSupported('audio/webm;codecs=opus')?'audio/webm;codecs=opus':'audio/webm';mediaRecorder=new MediaRecorder(stream,{mimeType:type});start=Date.now();open(`<div class="sheet-head"><h2>Sto ascoltando</h2><p class="muted">Puoi dire più cose nella stessa frase.</p></div><button class="voice-orb live" id="v3Stop">■</button><div class="timer" id="v3Timer">00:00</div><button class="btn btn-secondary" id="v3Cancel">Annulla</button>`);timer=setInterval(()=>{const s=Math.floor((Date.now()-start)/1000);if($('#v3Timer'))$('#v3Timer').textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`},250);mediaRecorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};mediaRecorder.onstop=()=>{clearInterval(timer);stream?.getTracks().forEach(t=>t.stop());const fr=new FileReader();fr.onload=async()=>{try{open(`<div class="loading"><span class="spinner"></span><b>Trascrivo…</b></div>`);const r=await fetch('/api/transcribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audioDataUrl:fr.result})}),j=await readJson(r);if(!r.ok)throw new Error(j.error||'Trascrizione non riuscita');editTranscript(j.text||'')}catch(e){alert(e.message);home()}};fr.readAsDataURL(new Blob(chunks,{type}))};mediaRecorder.start();$('#v3Stop').onclick=()=>mediaRecorder.stop();$('#v3Cancel').onclick=close
    }catch{alert('Non riesco ad accedere al microfono.')}
  }
  function compress(file){return new Promise((resolve,reject)=>{const fr=new FileReader();fr.onerror=reject;fr.onload=()=>{const img=new Image();img.onerror=reject;img.onload=()=>{const sc=Math.min(1,1400/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);c.getContext('2d').drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',.86))};img.src=fr.result};fr.readAsDataURL(file)})}
  function photo(){const inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.capture='environment';inp.onchange=async()=>{const f=inp.files?.[0];if(!f)return;try{lastImage=await compress(f);await analyze({imageDataUrl:lastImage})}catch(e){alert(e.message);home()}};inp.click()}

  function entryFields(e,i){
    const warn=e.needsReview||e.confidence<.7?`<div class="notice" style="margin-top:8px">⚠ ${esc(e.note||'Controlla questo dato prima di salvare.')}</div>`:'';
    let body='';
    if(e.kind==='pressure')body=`<div class="grid2"><div class="field"><label>SISTOLICA</label><input data-f="sys" data-i="${i}" type="number" value="${e.sys||''}"></div><div class="field"><label>DIASTOLICA</label><input data-f="dia" data-i="${i}" type="number" value="${e.dia||''}"></div></div><div class="field"><label>BATTITO</label><input data-f="pulse" data-i="${i}" type="number" value="${e.pulse||''}"></div>`;
    else if(e.kind==='weight')body=`<div class="field"><label>PESO KG</label><input data-f="weight" data-i="${i}" type="number" step=".1" value="${e.weight||''}"></div>`;
    else if(e.kind==='coffee')body=`<div class="field"><label>CAFFÈ</label><input data-f="coffeeCount" data-i="${i}" type="number" min="1" max="12" value="${e.coffeeCount||1}"></div>`;
    else if(e.kind==='meditation')body=`<div class="field"><label>MINUTI</label><input data-f="minutes" data-i="${i}" type="number" value="${e.minutes||''}"></div>`;
    else if(e.kind==='sport')body=`<div class="grid2"><div class="field"><label>ATTIVITÀ</label><select data-f="type" data-i="${i}">${['Bici','Corsa','Calisthenics','Camminata','Calcio'].map(x=>`<option ${x===e.type?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>MINUTI</label><input data-f="minutes" data-i="${i}" type="number" value="${e.minutes||''}"></div></div><div class="field"><label>INTENSITÀ</label><select data-f="intensity" data-i="${i}"><option value="bassa" ${e.intensity==='bassa'?'selected':''}>Bassa</option><option value="media" ${(!e.intensity||e.intensity==='media')?'selected':''}>Media</option><option value="alta" ${e.intensity==='alta'?'selected':''}>Alta</option></select></div>`;
    else if(e.kind==='food')body=`<div class="field"><label>DESCRIZIONE</label><input data-f="title" data-i="${i}" value="${esc(e.title)}"></div><div class="grid2"><div class="field"><label>KCAL</label><input data-f="kcal" data-i="${i}" type="number" value="${e.kcal||0}"></div><div class="field"><label>SALE G</label><input data-f="salt" data-i="${i}" type="number" step=".1" value="${saltFromSodium(e.sodiumMg)}"></div></div><div class="grid2"><div class="field"><label>PROTEINE</label><input data-f="p" data-i="${i}" type="number" step=".1" value="${e.p||0}"></div><div class="field"><label>CARBO</label><input data-f="c" data-i="${i}" type="number" step=".1" value="${e.c||0}"></div></div><div class="field"><label>GRASSI</label><input data-f="f" data-i="${i}" type="number" step=".1" value="${e.f||0}"></div>`;
    else if(e.kind==='book')body=`<div class="field"><label>TITOLO</label><input data-f="title" data-i="${i}" value="${esc(e.title)}"></div><div class="field"><label>AUTORE</label><input data-f="author" data-i="${i}" value="${esc(e.author||'')}"></div>`;
    else if(e.kind==='smoking')body=`<div class="notice">${e.smokingAction==='smoked'?'Segno che hai fumato oggi.':'Imposto oggi come ripartenza senza sigarette.'}</div>`;
    return `<div class="goal-card" style="margin-top:10px"><div class="row"><b>${({food:'Alimentazione',sport:'Movimento',pressure:'Pressione',weight:'Peso',meditation:'Meditazione',book:'Lettura',smoking:'Sigarette',coffee:'Caffè'})[e.kind]||e.kind}</b><span class="badge">${Math.round((e.confidence||1)*100)}%</span></div>${body}${warn}</div>`
  }

  function confirm(entries,source=''){
    if(!entries.length)return alert('Non ho trovato nulla da registrare.');
    open(`<div class="sheet-head"><h2>${entries.length>1?`${entries.length} voci riconosciute`:'Controlla la voce'}</h2><p class="muted">${source?`Da: “${esc(source)}”`:'Verifica prima di salvare.'}</p></div>${entries.map(entryFields).join('')}<button class="btn btn-primary" id="v3Save" style="margin-top:14px">Salva ${entries.length>1?'tutto':'voce'}</button><button class="btn btn-secondary" id="v3Retry" style="margin-top:8px">${source?'Correggi frase':'Indietro'}</button>`);
    $('#v3Save').onclick=()=>commit(entries);$('#v3Retry').onclick=()=>source?editTranscript(source):home()
  }

  function val(i,f){const el=document.querySelector(`[data-i="${i}"][data-f="${f}"]`);return el?.value??''}
  function commit(entries){
    const data=load(),now=new Date().toISOString();
    for(let i=0;i<entries.length;i++){
      const e=entries[i];
      if(e.kind==='pressure'){const sys=+val(i,'sys'),dia=+val(i,'dia');if(sys<70||dia<40)return alert('Controlla i valori della pressione.');data.pressure||=[];data.pressure.push({id:uid(),sys,dia,pulse:+val(i,'pulse')||null,context:e.context||'riposo',createdAt:now})}
      else if(e.kind==='weight'){const weight=num(val(i,'weight'));if(weight<30||weight>300)return alert('Controlla il peso.');data.weight||=[];data.profile||={};data.weight.push({id:uid(),value:weight,createdAt:now});data.profile.weight=weight}
      else if(e.kind==='coffee'){const n=Math.max(1,Math.min(12,Math.round(+val(i,'coffeeCount')||1)));data.coffee||=[];for(let x=0;x<n;x++)data.coffee.push({id:uid(),createdAt:new Date(Date.now()+x).toISOString()})}
      else if(e.kind==='meditation'){const minutes=+val(i,'minutes');if(minutes<=0)return alert('Controlla i minuti di meditazione.');data.meditation||=[];data.meditation.push({id:uid(),minutes:Math.round(minutes),createdAt:now})}
      else if(e.kind==='sport'){const type=val(i,'type'),minutes=+val(i,'minutes'),intensity=val(i,'intensity')||'media';if(!type||minutes<=0)return alert('Controlla attività e durata.');data.sport||=[];data.sport.push({id:uid(),type,minutes:Math.round(minutes),distance:e.distance>0?e.distance:null,elevation:e.elevation>0?e.elevation:null,intensity,kcal:sportKcal(type,minutes,intensity),kcalEstimated:true,weightUsed:currentWeight(),createdAt:now})}
      else if(e.kind==='food'){const title=String(val(i,'title')).trim();if(!title)return alert('Controlla la descrizione del pasto.');data.food||=[];data.food.push({id:uid(),meal:e.meal||'Snack',title,kcal:+val(i,'kcal')||0,p:+val(i,'p')||0,c:+val(i,'c')||0,f:+val(i,'f')||0,sodiumMg:sodiumFromSalt(val(i,'salt')),sodiumEstimated:!e.sodiumExplicit,estimated:true,createdAt:now})}
      else if(e.kind==='book'){const title=String(val(i,'title')).trim();if(!title)return alert('Controlla il titolo del libro.');data.books||=[];data.books.push({id:uid(),title,author:String(val(i,'author')).trim(),finishedAt:new Date().toISOString().slice(0,10),comment:'',cover:lastImage||'',createdAt:now})}
      else if(e.kind==='smoking'){data.smoking={...(data.smoking||{}),since:now}}
    }
    save(data);lastImage='';close();location.reload()
  }

  document.addEventListener('click',e=>{const t=e.target.closest('#addBtn,[data-quick]');if(!t)return;e.preventDefault();e.stopImmediatePropagation();const q=t.dataset.quick;if(q==='voice')voice();else if(q==='photo')photo();else if(q==='text')editTranscript('');else home()},true);
  window.SuperMeUniversalPlusV3={open:home};
})();
