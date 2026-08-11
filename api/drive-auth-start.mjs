import crypto from 'node:crypto';
import {configured,redirectUri,cookie,STATE_COOKIE,DRIVE_SCOPE} from '../_lib/drive-backup.mjs';

export default function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
  if(!configured()) return res.status(503).send('Google Drive non configurato: imposta GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e BACKUP_COOKIE_SECRET su Vercel.');
  const state=crypto.randomBytes(24).toString('base64url');
  res.setHeader('Set-Cookie',cookie(STATE_COOKIE,state,{maxAge:600}));
  const qs=new URLSearchParams({
    client_id:process.env.GOOGLE_CLIENT_ID,
    redirect_uri:redirectUri(req),
    response_type:'code',
    scope:DRIVE_SCOPE,
    access_type:'offline',
    prompt:'consent',
    include_granted_scopes:'true',
    state
  });
  res.redirect(302,`https://accounts.google.com/o/oauth2/v2/auth?${qs}`);
}
