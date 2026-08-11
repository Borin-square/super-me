import {configured,redirectUri,origin,parseCookies,cookie,clearCookie,STATE_COOKIE,TOKEN_COOKIE,exchangeCode,encrypt} from '../_lib/drive-backup.mjs';

export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
  if(!configured()) return res.status(503).send('Google Drive non configurato.');
  try{
    const cookies=parseCookies(req);
    const state=String(req.query?.state||'');
    const code=String(req.query?.code||'');
    if(!state||state!==cookies[STATE_COOKIE]||!code) throw new Error('Autorizzazione Google non valida o scaduta');
    const tokens=await exchangeCode(code,redirectUri(req));
    if(!tokens.refresh_token) throw new Error('Google non ha restituito il refresh token. Riprova la connessione.');
    res.setHeader('Set-Cookie',[
      cookie(TOKEN_COOKIE,encrypt(tokens.refresh_token),{maxAge:60*60*24*365}),
      clearCookie(STATE_COOKIE)
    ]);
    res.redirect(302,`${origin(req)}/?drive=connected`);
  }catch(e){
    console.error('Drive callback error',e);
    res.redirect(302,`${origin(req)}/?drive=error`);
  }
}
