(() => {
  const KEY = "super_me_v1";
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const num = v => Number.isFinite(+v) ? +v : 0;
  const uid = () => Math.random().toString(36).slice(2)+Date.now().toString(36);

  function load(){ try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
  function save(d){ localStorage.setItem(KEY, JSON.stringify