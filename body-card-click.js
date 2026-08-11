(() => {
  const $=s=>document.querySelector(s);
  function bind(){
    if($('#pageTitle')?.textContent!=='Corpo')return;
    const w=$('#bodyWeight')?.closest('.hub-card');
    const p=$('#bodyPressure')?.closest('.hub-card');
    if(w&&!w.dataset.detailBound){w.dataset.detailBound='1';w.style.cursor='pointer';w.addEventListener('click',e=>{if(e.target.closest('#bodyWeight'))return;$('#bodyWeight')?.click();});}
    if(p&&!p.dataset.detailBound){p.dataset.detailBound='1';p.style.cursor='pointer';p.addEventListener('click',e=>{if(e.target.closest('#bodyPressure'))return;$('#bodyPressure')?.click();});}
  }
  const view=$('#view');if(view)new MutationObserver(bind).observe(view,{childList:true,subtree:true});
  document.addEventListener('click',e=>{if(e.target.closest("[data-tab='food']"))setTimeout(bind,0)},true);
  setTimeout(bind,100);
})();