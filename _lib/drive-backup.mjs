import crypto from 'node:crypto';

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
export const TOKEN_COOKIE = 'super_me_drive_token';
export const STATE_COOKIE = 'super_me_drive_state';

export function configured(){
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.BACKUP_COOKIE_SECRET);
}

export function redirectUri(req){
  if(process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return `${proto}://${host}/api/drive-auth-callback`;
}

export function origin(req){
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return `${proto}://${host}`;
}

export function parseCookies(req){
  const raw = req.headers.cookie || '';
  return Object.fromEntries(raw.split(';').map(x=>x.trim()).filter(Boolean).map(part=>{
    const i=part.indexOf('=');
    return i<0?[part,'']:[part.slice(0,i),decodeURIComponent(part.slice(i+1))];
  }));
}

export function cookie(name,value,{maxAge=900,httpOnly=true}={}){
  const bits=[`${name}=${encodeURIComponent(value)}`,'Path=/','SameSite=Lax','Secure'];
  if(httpOnly) bits.push('HttpOnly');
  if(Number.isFinite(maxAge)) bits.push(`Max-Age=${maxAge}`);
  return bits.join('; ');
}

export function clearCookie(name){
  return cookie(name,'',{maxAge:0});
}

function key(){
  return crypto.createHash('sha256').update(String(process.env.BACKUP_COOKIE_SECRET || '')).digest();
}

export function encrypt(text){
  const iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm',key(),iv);
  const enc=Buffer.concat([cipher.update(String(text),'utf8'),cipher.final()]);
  const tag=cipher.getAuthTag();
  return Buffer.concat([iv,tag,enc]).toString('base64url');
}

export function decrypt(payload){
  try{
    const raw=Buffer.from(String(payload||''),'base64url');
    const iv=raw.subarray(0,12),tag=raw.subarray(12,28),enc=raw.subarray(28);
    const dec=crypto.createDecipheriv('aes-256-gcm',key(),iv);dec.setAuthTag(tag);
    return Buffer.concat([dec.update(enc),dec.final()]).toString('utf8');
  }catch{return ''}
}

export function refreshTokenFromReq(req){
  const value=parseCookies(req)[TOKEN_COOKIE];
  return value?decrypt(value):'';
}

export async function accessToken(refreshToken){
  const body=new URLSearchParams({
    client_id:process.env.GOOGLE_CLIENT_ID,
    client_secret:process.env.GOOGLE_CLIENT_SECRET,
    refresh_token:refreshToken,
    grant_type:'refresh_token'
  });
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||!j.access_token) throw new Error(j?.error_description||j?.error||'Impossibile aggiornare accesso Google Drive');
  return j.access_token;
}

export async function exchangeCode(code,uri){
  const body=new URLSearchParams({
    code,
    client_id:process.env.GOOGLE_CLIENT_ID,
    client_secret:process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri:uri,
    grant_type:'authorization_code'
  });
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j?.error_description||j?.error||'Connessione Google Drive non riuscita');
  return j;
}

async function driveJson(url,token,options={}){
  const r=await fetch(url,{...options,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(options.headers||{})}});
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j?.error?.message||`Google Drive ${r.status}`);
  return j;
}

export async function listBackups(token){
  const q=encodeURIComponent("trashed = false and name contains 'super-me-'");
  const url=`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,name,createdTime,modifiedTime)&pageSize=100&orderBy=createdTime desc`;
  const j=await driveJson(url,token);
  return j.files||[];
}

async function createJsonFile(token,name,jsonText){
  const boundary=`superme_${crypto.randomBytes(12).toString('hex')}`;
  const metadata=JSON.stringify({name,parents:['appDataFolder'],mimeType:'application/json'});
  const body=`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${jsonText}\r\n--${boundary}--`;
  const r=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':`multipart/related; boundary=${boundary}`},body});
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j?.error?.message||'Errore creazione backup Drive');
  return j;
}

async function updateJsonFile(token,id,jsonText){
  const r=await fetch(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(id)}?uploadType=media&fields=id,name,modifiedTime`,{method:'PATCH',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:jsonText});
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j?.error?.message||'Errore aggiornamento backup Drive');
  return j;
}

export async function writeBackup(token,payload){
  const jsonText=JSON.stringify(payload);
  const files=await listBackups(token);
  const latest=files.find(f=>f.name==='super-me-latest.json');
  if(latest) await updateJsonFile(token,latest.id,jsonText); else await createJsonFile(token,'super-me-latest.json',jsonText);

  const day=String(payload?.backupDay||new Date().toISOString().slice(0,10));
  const dailyName=`super-me-${day}.json`;
  if(!files.some(f=>f.name===dailyName)) await createJsonFile(token,dailyName,jsonText);

  const daily=files.filter(f=>/^super-me-\d{4}-\d{2}-\d{2}\.json$/.test(f.name)).sort((a,b)=>b.name.localeCompare(a.name));
  for(const old of daily.slice(29)){
    await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(old.id)}`,{method:'DELETE',headers:{Authorization:`Bearer ${token}`}}).catch(()=>{});
  }
  return {day,dailyName};
}

export async function readLatest(token){
  const files=await listBackups(token);
  const latest=files.find(f=>f.name==='super-me-latest.json') || files.find(f=>/^super-me-\d{4}-\d{2}-\d{2}\.json$/.test(f.name));
  if(!latest) return null;
  const r=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(latest.id)}?alt=media`,{headers:{Authorization:`Bearer ${token}`}});
  if(!r.ok) throw new Error('Impossibile leggere il backup da Google Drive');
  return r.json();
}
