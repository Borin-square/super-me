(() => {
  const KEY='super_me_v1';
  const MET={
    Bici:{bassa:5.5,media:7.5,alta:10},
    Corsa:{bassa:7,media:9.8,alta:12},
    Calisthenics:{bassa:3.8,media:6,alta:8},
    Camminata:{bassa:2.8,media:3.8,alta:5},
    Calcio:{bassa:5.5,media:8,alta:10},
    Nuoto:{bassa:5.8,media:8,alta:10}
  };
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{}}catch{return{}}};
  const save=d=>localStorage.setItem(KEY,JSON.stringify(d));
  function weight(d){
    const latest=[...(d.weight||[])].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))[0];
    return +(latest?.value||d.profile?.weight||80);
  }
  function run(){
    const d=load();let changed=false;const kg=weight(d);
    for(const x of d.sport||[]){
      const minutes=+x.minutes||0,type=String(x.type||'').trim(),intensity=x.intensity||'media';
      if((+x.kcal||0)>0||minutes<=0||!MET[type])continue;
      const met=MET[type][intensity]||MET[type].media;
      x.kcal=Math.max(1,Math.round(met*kg*minutes/60));
      x.kcalEstimated=true;x.weightUsed=kg;x.kcalUpdatedAt=new Date().toISOString();changed=true;
    }
    if(changed){save(d);return true;}return false;
  }
  if(run()) setTimeout(()=>location.reload(),50);
})();
