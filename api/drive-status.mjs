import {configured,refreshTokenFromReq,accessToken,listBackups} from '../_lib/drive-backup.mjs';

export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
  if(!configured()) return res.status(200).json({configured:false,connected:false});
  const refresh=refreshTokenFromReq(req);
  if(!refresh) return res.status(200).json({configured:true,connected:false});
  try{
    const token=await accessToken(refresh);
    const files=await listBackups(token);
    const daily=files.filter(f=>/^super-me-\d{4}-\d{2}-\d{2}\.json$/.test(f.name));
    const latest=files.find(f=>f.name==='super-me-latest.json') || daily[0] || null;
    return res.status(200).json({configured:true,connected:true,count:daily.length,lastBackup:latest?.modifiedTime||latest?.createdTime||null});
  }catch(e){
    console.error('Drive status error',e);
    return res.status(200).json({configured:true,connected:false,error:'Connessione Google Drive da rinnovare'});
  }
}
