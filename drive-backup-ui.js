(() => {
  const KEY='super_me_v1', LAST='super_me_drive_last_backup_day';
  const $=s=>document.querySelector(s);
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{}}catch{return{}}};
  const day=()=>new Date().toISOString().slice(0,10);
  async function status(){const r=await fetch('/api/drive-status');return r.json()}
  async function backup(manual=false){
    const s=await status(); if(!s.configured||!s.connected) return {skipped:true,status:s};
    if(!manual&&localStorage.getItem(LAST)===day()) return {skipped:true,status:s};
    const r=await fetch('/api/drive-backup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({backupDay:day(),data:load()})});
    const j=await r.json().catch(()=>({})); if(!r.ok) throw new Error(j.error||'Backup non riuscito');
    localStorage.setItem(LAST,day()); return j;
  }
  async function inject(){
    const sheet=$('#sheet'); if(!sheet||$('#driveBackupCard')) return;
    if(!sheet.querySelector('#v2save')) return;
    let s; try{s=await status()}catch{return}
    const card=document.createElement('div');card.id='driveBackupCard';card.className='goal-card';card.style.marginTop='10px';
    const when=s.lastBackup?new Date(s.lastBackup).toLocaleString('it-IT',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'mai';
    card.innerHTML=`<div class="row"><div><div class="goal-icon">☁</div><b>Backup Google Drive</b></div><span class="badge">${s.connected?'collegato':s.configured?'non collegato':'da configurare'}</span></div><div class="notice" style="margin-top:10px">${s.connected?`Ultimo backup: <b>${when}</b> · ${s.count||0} copie giornaliere.`:s.configured?'Collega Google Drive una volta. Poi Super Me salva automaticamente una copia al giorno alla prima apertura.':'Prima va configurato Google OAuth su Vercel.'}</div><div class="grid2" style="margin-top:10px">${s.connected?`<button class="btn btn-secondary" id="driveBackupNow">Backup ora</button><button class="btn btn-secondary" id="driveRestore">Ripristina</button>`:`<button class="btn btn-secondary" id="driveConnect" ${s.configured?'':'disabled'}>Collega Drive</button><button class="btn btn-secondary" disabled>Ripristina</button>`}</div>${s.connected?`<button class="chip" id="driveDisconnect" style="margin-top:10px">Disconnetti Drive</button>`:''}`;
    const saveBtn=sheet.querySelector('#v2save'); saveBtn.parentNode.insertBefore(card,saveBtn);
    $('#driveConnect')?.addEventListener('click',()=>location.href='/api/drive-auth-start');
    $('#driveBackupNow')?.addEventListener('click',async()=>{try{await backup(true);card.remove();inject()}catch(e){alert(e.message)}});
    $('#driveRestore')?.addEventListener('click',async()=>{if(!confirm('Ripristinare l’ultimo backup da Google Drive? I dati correnti verranno sostituiti.'))return;try{const r=await fetch('/api/drive-restore');const j=await r.json();if(!r.ok)throw new Error(j.error||'Ripristino fallito');localStorage.setItem(KEY,JSON.stringify(j.data));location.reload()}catch(e){alert(e.message)}});
    $('#driveDisconnect')?.addEventListener('click',async()=>{await fetch('/api/drive-disconnect',{method:'POST'});localStorage.removeItem(LAST);card.remove();inject()});
  }
  new MutationObserver(inject).observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>{inject();backup(false).catch(e=>console.warn('Drive daily backup',e))},500);
})();
