import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
const base=process.env.APP_URL || 'http://localhost:3000';
async function json(path,options={}){const r=await fetch(base+path,{...options,headers:{'Content-Type':'application/json',...options.headers}});return {status:r.status,data:await r.json()};}
const bytes=await sharp({create:{width:80,height:60,channels:3,background:'#327a94'}}).jpeg().toBuffer();
const details={filename:'prueba-integracion.jpg',contentType:'image/jpeg',sizeBytes:bytes.length,checksum:createHash('sha256').update(bytes).digest('base64')};
const ticket=await json('/api/upload-url',{method:'POST',body:JSON.stringify(details)});assert.equal(ticket.status,200);assert.equal(ticket.data.expiresIn,300);
const signed=new URL(ticket.data.uploadUrl);assert.equal(signed.searchParams.get('X-Amz-Expires'),'300');
const preflight=await fetch(ticket.data.uploadUrl,{method:'OPTIONS',headers:{Origin:base,'Access-Control-Request-Method':'PUT','Access-Control-Request-Headers':Object.keys(ticket.data.headers).join(',')}});assert.ok(preflight.ok,'CORS preflight');
assert.equal(preflight.headers.get('access-control-allow-origin'),base);
const put=await fetch(ticket.data.uploadUrl,{method:'PUT',headers:ticket.data.headers,body:bytes});assert.ok(put.ok,`PUT: ${put.status} ${await put.text()}`);
const completed=await json(`/api/uploads/${ticket.data.uploadId}/complete`,{method:'POST',body:'{}'});assert.equal(completed.status,201,JSON.stringify(completed.data));
const list=await json('/api/images');assert.equal(list.status,200);const item=list.data.items.find(i=>i.key===ticket.data.key);assert.ok(item);assert.equal(new URL(item.url).searchParams.get('X-Amz-Expires'),'900');
const downloaded=Buffer.from(await(await fetch(item.downloadUrl)).arrayBuffer());assert.deepEqual(downloaded,bytes);
const oversized=await json('/api/upload-url',{method:'POST',body:JSON.stringify({...details,sizeBytes:10*1024*1024})});assert.equal(oversized.status,400);
const invalid=await json('/api/upload-url',{method:'POST',body:JSON.stringify({...details,contentType:'application/pdf'})});assert.equal(invalid.status,400);
const removed=await json('/api/images/'+item.key.split('/').map(encodeURIComponent).join('/'),{method:'DELETE'});assert.equal(removed.status,200);
assert.ok(!(await json('/api/images')).data.items.some(i=>i.key===item.key));
console.log('PASS: CORS, PUT directo 300s, validación, galería GET 900s, descarga idéntica, rechazo 10MB/PDF y eliminación.');
console.log('La expiración real a los 16 minutos requiere la prueba manual de docs/EJERCICIO_4.md.');

