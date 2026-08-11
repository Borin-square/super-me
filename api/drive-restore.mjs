import {configured,refreshTokenFromReq,accessToken,readLatest} from '../_lib/drive-backup.mjs';

export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
  if(!configured()) return res.status(503).json({error:'Google Drive non configurato'});
  const refresh=refreshTokenFromReq(req);
  if(!refresh) return res.status(401).json({error:'Google Drive non collegato'});
  try{
    const token=await accessToken(refresh);
    const payload=await readLatest(token);
    if(!payload?.data) return res.status(404).json({error:'Nessun backup disponibile'});
    return res.status(200).json(payload);
  }catch(e){
    console.error('Drive restore error',e);
    return res.status(500).json({error:e?.message||'Ripristino Google Drive non riuscito'});
  }
}
