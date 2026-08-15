const json=(res,status,data)=>res.status(status).json(data);
function extractOutputText(data){if(typeof data.output_text==='string')return data.output_text;for(const item of data.output||[])for(const part of item.content||[])if(part.type==='output_text'&&typeof part.text==='string')return part.text;return''}

const entrySchema={type:'object',additionalProperties:false,required:['kind','confidence','needsReview','note','meal','title','author','kcal','p','c','f','sodiumMg','sodiumExplicit','type','minutes','distance','elevation','intensity','sys','dia','pulse','context','weight','smokingAction','coffeeCount'],properties:{
 kind:{type:'string',enum:['food','sport','pressure','weight','meditation','book','smoking','coffee']},confidence:{type:'number'},needsReview:{type:'boolean'},note:{type:'string'},meal:{type:'string',enum:['Colazione','Pranzo','Cena','Snack','']},title:{type:'string'},author:{type:'string'},kcal:{type:'number'},p:{type:'number'},c:{type:'number'},f:{type:'number'},sodiumMg:{type:'number'},sodiumExplicit:{type:'boolean'},type:{type:'string'},minutes:{type:'number'},distance:{type:'number'},elevation:{type:'number'},intensity:{type:'string',enum:['bassa','media','alta','']},sys:{type:'number'},dia:{type:'number'},pulse:{type:'number'},context:{type:'string',enum:['riposo','mattina','sera','post-caffè','post-sport','altro','']},weight:{type:'number'},smokingAction:{type:'string',enum:['smoked','quit_start','']},coffeeCount:{type:'number'}
}};
const schema={type:'object',additionalProperties:false,required:['entries'],properties:{entries:{type:'array',minItems:1,maxItems:12,items:entrySchema}}};

function sanitize(e){
 const out={...e,confidence:Math.max(0,Math.min(1,+e.confidence||0)),needsReview:!!e.needsReview,note:String(e.note||''),title:String(e.title||'')};
 if(e.kind==='pressure'&&!(e.sys>=70&&e.sys<=260&&e.dia>=40&&e.dia<=180)){out.needsReview=true;out.note=out.note||'Valori pressione mancanti o poco plausibili.';}
 if(e.kind==='weight'&&!(e.weight>=30&&e.weight<=300)){out.needsReview=true;out.note=out.note||'Peso mancante o poco leggibile.';}
 if(e.kind==='meditation'&&!(e.minutes>0&&e.minutes<=300)){out.needsReview=true;out.note=out.note||'Durata meditazione mancante.';}
 if(e.kind==='sport'){
   out.type=String(e.type||'').trim();
   out.minutes=Math.max(0,Math.round(+e.minutes||0));
   out.distance=Math.max(0,+e.distance||0);
   out.elevation=Math.max(0,Math.round(+e.elevation||0));
   if(!out.type){out.needsReview=true;out.note=out.note||'Attività non identificata.';}
 }
 if(e.kind==='book'&&!e.title){out.needsReview=true;out.note=out.note||'Titolo libro non leggibile.';}
 if(e.kind==='coffee')out.coffeeCount=Math.max(1,Math.min(12,Math.round(+e.coffeeCount||1)));
 if(e.kind==='food'){out.kcal=Math.max(0,Math.round(+e.kcal||0));out.p=Math.max(0,+e.p||0);out.c=Math.max(0,+e.c||0);out.f=Math.max(0,+e.f||0);out.sodiumMg=Math.max(0,Math.round(+e.sodiumMg||0));if(!e.title){out.needsReview=true;out.note=out.note||'Pasto non identificato con sufficiente sicurezza.';}}
 return out;
}

async function callParser(key,content,attempt=1){
 const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-5-mini',input:[{role:'user',content}],text:{format:{type:'json_schema',name:'super_me_multi_entry_v3',strict:true,schema}},max_output_tokens:attempt===1?2200:3200,store:false})});
 const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data?.error?.message||'Errore OpenAI');const raw=extractOutputText(data);if(!raw)throw new Error('Nessun dato interpretabile');
 try{const parsed=JSON.parse(raw);if(!Array.isArray(parsed.entries)||!parsed.entries.length)throw new Error('Nessuna voce');return {entries:parsed.entries.map(sanitize)}}catch(err){if(attempt===1)return callParser(key,content,2);throw new Error('Non sono riuscito a interpretare correttamente il dato. Riprova.')}
}

export default async function handler(req,res){
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});const key=process.env.OPENAI_API_KEY;if(!key)return json(res,503,{error:'OPENAI_API_KEY non configurata su Vercel'});
 try{const{text='',imageDataUrl=''}=req.body||{};if(!text&&!imageDataUrl)return json(res,400,{error:'Manca testo o immagine'});
 const instructions=`Sei il parser robusto di Super Me. Un singolo input può contenere PIÙ voci: restituiscile tutte in entries, senza perderne nessuna. Categorie: food, sport, pressure, weight, meditation, book, smoking, coffee.\n\nREGOLE DI AFFIDABILITÀ:\n- Non inventare mai numeri illeggibili da una foto. In quel caso imposta needsReview=true, confidence bassa e lascia il valore numerico a 0.\n- confidence va da 0 a 1.\n- Se un dato davvero essenziale manca, needsReview=true e note spiega in poche parole cosa manca.\n- Mantieni fedelmente numeri espliciti detti dall'utente.\n\nREGOLE CATEGORIE:\nFOOD: stima titolo, pasto, kcal, macro e sodio totale. sodiumMg in mg. Se l'utente dichiara sale in grammi: sodiumMg=sale_g*400 e sodiumExplicit=true. Le stime da piatto sono ammesse e non richiedono review solo perché sono stime.\nSPORT/MOVIMENTO: la categoria è APERTA. Non limitarti a Bici, Corsa, Calisthenics, Camminata o Calcio. Registra fedelmente attività come Nuoto, Padel, Sci, Kayak, Tennis, Trekking, Arrampicata, Canottaggio ecc. type è il nome naturale dell'attività. La durata NON è obbligatoria: se manca, minutes=0 e non segnalarla come errore. distance è sempre in chilometri: 350 metri => 0.35. elevation in metri. Usa title per dettagli utili come 'stile libero · lago'. Non inventare calorie.\nPRESSURE: '137 su 89' => sys 137, dia 89. Non inventare numeri da display sfocato.\nWEIGHT: peso corporeo in kg.\nMEDITATION: minuti svolti.\nBOOK: titolo e autore se riconoscibili.\nSMOKING: 'ho fumato' => smoked; 'ho smesso oggi' => quit_start.\nCOFFEE: conta gli espresso/caffè dichiarati; 'un caffè' => coffeeCount 1, 'due caffè' => 2.\nFOTO: piatto=>food; bilancia=>weight; misuratore pressione=>pressure; copertina=>book.\n\nCompila SEMPRE tutti i campi di ogni entry; per quelli non pertinenti usa 0, false o stringa vuota.\n\nInput:\n${text||'Analizza la foto e identifica tutte le voci registrabili.'}`;
 const content=[{type:'input_text',text:instructions}];if(imageDataUrl)content.push({type:'input_image',image_url:imageDataUrl,detail:'auto'});return json(res,200,await callParser(key,content));
 }catch(error){console.error('Parser v3 error',{message:error?.message});return json(res,500,{error:error?.message||'Errore interno'})}
}
