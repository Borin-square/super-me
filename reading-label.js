(() => {
  const $=s=>document.querySelector(s);
  function apply(){
    const nav=$("[data-tab='pressure']");
    if(nav){
      const label=nav.querySelector('small');
      if(label) label.textContent='Lettura';
      const icon=nav.querySelector('span');
      if(icon) icon.textContent='⌑';
    }
    if($('#pageTitle')?.textContent==='Crescita'){
      $('#pageTitle').textContent='Lettura';
      if($('#todayLabel')) $('#todayLabel').textContent='LIBRI & IDEE';
    }
  }
  document.addEventListener('click',e=>{
    if(e.target.closest("[data-tab='pressure']")) setTimeout(apply,0);
  },true);
  setTimeout(apply,50);
})();
