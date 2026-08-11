import {configured,refreshTokenFromReq,accessToken,writeBackup} from '../_lib/drive-backup.mjs';

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  if(!configured()) return res.status(503).json({error:'Google Drive non configurato'});
  const refresh=refreshTokenFromReq(req);
  if(!refresh) return res.status(401).json({error:'Google Drive non collegato'});
  try{
    const payload=req.body||{};
    if(!payload.data||typeof payload.data!=='object') return res.status(400).json({error:'Backup non valido'});
    const token=await accessToken(refresh);
    const result=await writeBackup(token,{version:1,backupDay:payload.backupDay||new Date().toISOString().slice(0,10),createdAt:new Date().toISOString(),data:payload.data});
    return res.status(200).json({ok:true,...result,createdAt:new Date().toISOString()});
  }catch(e){
    console.error('Drive backup error',e);
    return res.status(500).json({error:e?.message||'Backup Google Drive non riuscito'});
  }
}
