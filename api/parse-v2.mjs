const json = (res, status, data) => res.status(status).json(data);

function extractOutputText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  for (const item of data.output || []) for (const part of item.content || []) if (part.type === "output_text" && typeof part.text === "string") return part.text;
  return "";
}

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["kind","meal","title","author","kcal","kcalExplicit","p","c","f","estimated","sodiumMg","sodiumExplicit","type","minutes","distance","elevation","intensity","sys","dia","pulse","context","weight","smokingAction"],
  properties: {
    kind: { type: "string", enum: ["food","sport","pressure","weight","meditation","book","smoking"] },
    meal: { type: "string", enum: ["Colazione","Pranzo","Cena","Snack",""] },
    title: { type: "string" }, author: { type: "string" },
    kcal: { type: "number" }, kcalExplicit: { type: "boolean" },
    p: { type: "number" }, c: { type: "number" }, f: { type: "number" }, estimated: { type: "boolean" },
    sodiumMg: { type: "number" }, sodiumExplicit: { type: "boolean" },
    type: { type: "string", enum: ["Bici","Corsa","Calisthenics","Camminata","Calcio",""] },
    minutes: { type: "number" }, distance: { type: "number" }, elevation: { type: "number" },
    intensity: { type: "string", enum: ["bassa","media","alta",""] },
    sys: { type: "number" }, dia: { type: "number" }, pulse: { type: "number" },
    context: { type: "string", enum: ["riposo","mattina","sera","post-caffè","post-sport","altro",""] },
    weight: { type: "number" }, smokingAction: { type: "string", enum: ["smoked","quit_start",""] }
  }
};

function validate(parsed) {
  if (!parsed || !schema.properties.kind.enum.includes(parsed.kind)) throw new Error("Categoria non riconosciuta");
  const base={kind:parsed.kind};
  if(parsed.kind==="food"){
    if(!parsed.title||parsed.kcal<0||parsed.p<0||parsed.c<0||parsed.f<0||parsed.sodiumMg<0)throw new Error("Dati cibo non validi");
    return {...base,meal:parsed.meal||"Snack",title:parsed.title,kcal:Math.round(parsed.kcal),p:Math.round(parsed.p*10)/10,c:Math.round(parsed.c*10)/10,f:Math.round(parsed.f*10)/10,sodiumMg:Math.round(parsed.sodiumMg),sodiumExplicit:parsed.sodiumExplicit===true,estimated:true};
  }
  if(parsed.kind==="sport"){
    if(!parsed.type||parsed.minutes<=0)throw new Error("Dati sport non validi");
    return {...base,type:parsed.type,minutes:Math.round(parsed.minutes),distance:parsed.distance>0?parsed.distance:null,elevation:parsed.elevation>0?Math.round(parsed.elevation):null,intensity:parsed.intensity||"media",kcal:parsed.kcal>0?Math.round(parsed.kcal):0,kcalExplicit:parsed.kcalExplicit===true};
  }
  if(parsed.kind==="pressure"){
    if(parsed.sys<=0||parsed.dia<=0)throw new Error("Dati pressione non validi");
    return {...base,sys:Math.round(parsed.sys),dia:Math.round(parsed.dia),pulse:parsed.pulse>0?Math.round(parsed.pulse):null,context:parsed.context||"riposo"};
  }
  if(parsed.kind==="weight"){
    if(parsed.weight<30||parsed.weight>300)throw new Error("Peso non valido");
    return {...base,weight:Math.round(parsed.weight*10)/10};
  }
  if(parsed.kind==="meditation"){
    if(parsed.minutes<=0||parsed.minutes>300)throw new Error("Minuti meditazione non validi");
    return {...base,minutes:Math.round(parsed.minutes)};
  }
  if(parsed.kind==="book"){
    if(!parsed.title)throw new Error("Titolo libro mancante");
    return {...base,title:parsed.title,author:parsed.author||""};
  }
  if(!parsed.smokingAction)throw new Error("Azione sigarette non riconosciuta");
  return {...base,smokingAction:parsed.smokingAction};
}

async function callParser(key,content,attempt=1){
  const response=await fetch("https://api.openai.com/v1/responses",{
    method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},
    body:JSON.stringify({model:"gpt-5-mini",input:[{role:"user",content}],text:{format:{type:"json_schema",name:"super_me_universal_entry_v2",description:"Dato universale strutturato per Super Me.",strict:true,schema}},max_output_tokens:attempt===1?1300:1900,store:false})
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data?.error?.message||"Errore OpenAI");
  const raw=extractOutputText(data);if(!raw)throw new Error("OpenAI non ha restituito dati interpretabili");
  try{return validate(JSON.parse(raw));}
  catch(error){if(attempt===1)return callParser(key,content,2);throw new Error("Non sono riuscito a interpretare correttamente il dato. Riprova una volta.");}
}

export default async function handler(req,res){
  if(req.method!=="POST")return json(res,405,{error:"Method not allowed"});
  const key=process.env.OPENAI_API_KEY;if(!key)return json(res,503,{error:"OPENAI_API_KEY non configurata su Vercel"});
  try{
    const {text="",imageDataUrl=""}=req.body||{};if(!text&&!imageDataUrl)return json(res,400,{error:"Manca testo o immagine"});
    const instructions=`Sei il parser universale di Super Me. Trasforma un singolo input in UNA SOLA categoria tra: food, sport, pressure, weight, meditation, book, smoking.\n\nREGOLE:\n1. Compila SEMPRE tutti i campi dello schema. Per campi non pertinenti usa stringa vuota, false o 0.\n2. Non aggiungere diagnosi, consigli o testo fuori dallo schema.\n3. FOOD: cibo/bevande o foto di un pasto. Stima titolo, kcal, macro e sodio totale del pasto. sodiumMg è il sodio totale in mg. Considera naturalmente il sodio tipico di pane, formaggi, salumi, salse, prodotti confezionati e sale di cottura quando ragionevolmente deducibile. Se l'utente dichiara sodio o sale, mantieni il valore e sodiumExplicit=true; se dichiara sale in grammi converti in sodio con sodio_mg = sale_g * 400. Altrimenti sodiumExplicit=false. meal=Colazione/Pranzo/Cena/Snack.\n4. SPORT: Bici, Corsa, Calisthenics, Camminata, Calcio. MTB/ciclismo=Bici. minutes obbligatorio. Se dichiara calorie, mantienile e kcalExplicit=true; altrimenti kcalExplicit=false e kcal può essere 0.\n5. PRESSURE: 'X su Y' => sys=X dia=Y. pulse se presente.\n6. WEIGHT: peso corporeo in kg; non confondere con peso alimenti.\n7. MEDITATION: pratica già svolta, minutes durata effettiva.\n8. BOOK: libro letto/finito/da registrare o copertina nitida.\n9. SMOKING: 'ho fumato'=>smoked; 'ho smesso oggi'/'riparto da oggi'=>quit_start.\n10. FOTO: piatto=>food; bilancia=>weight; sfigmomanometro=>pressure; copertina=>book. Non inventare valori illeggibili per peso/pressione.\n11. Mantieni fedelmente i numeri esplicitati.\n\nInput utente:\n${text||"Analizza la foto e identifica quale dato personale l'utente sta registrando."}`;
    const content=[{type:"input_text",text:instructions}];if(imageDataUrl)content.push({type:"input_image",image_url:imageDataUrl,detail:"auto"});
    return json(res,200,await callParser(key,content,1));
  }catch(error){console.error("Parser v2 internal error",{message:error?.message});return json(res,500,{error:error?.message||"Errore interno nell'analisi AI"});}
}
