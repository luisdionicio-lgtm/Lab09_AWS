import { randomUUID } from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import sharp from 'sharp';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, CopyObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { fileURLToPath } from 'node:url';

export const MAX_BYTES = 5 * 1024 * 1024;
export const TYPES = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' };
const fail = (status, message) => Object.assign(new Error(message), { status });
const validKey = key => typeof key === 'string' && /^originales\/[a-zA-Z0-9][a-zA-Z0-9._-]{0,220}$/.test(key) && !key.includes('..');
export function validateUpload(body) {
  if (!body || typeof body.filename !== 'string' || !body.filename.trim() || body.filename.length > 180) throw fail(400, 'Indica un nombre de archivo válido.');
  if (!Object.hasOwn(TYPES, body.contentType)) throw fail(400, 'Solo se admiten imágenes JPG, PNG y WebP.');
  if (!Number.isSafeInteger(body.sizeBytes) || body.sizeBytes < 1 || body.sizeBytes >= MAX_BYTES) throw fail(400, 'La imagen debe pesar menos de 5 MB.');
  if (typeof body.checksum !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(body.checksum)) throw fail(400, 'Falta la suma SHA256 de la imagen.');
  return body;
}
export function createStore(config) {
  const common = { region: config.region, forcePathStyle: Boolean(config.endpoint), requestChecksumCalculation: 'WHEN_REQUIRED' };
  const client = new S3Client({ ...common, ...(config.endpoint && { endpoint: config.endpoint }) });
  const signer = new S3Client({ ...common, ...(config.publicEndpoint && { endpoint: config.publicEndpoint }) });
  const encryption = config.endpoint ? {} : { ServerSideEncryption: 'AES256' };
  return {
    putUrl: (key, b) => getSignedUrl(signer, new PutObjectCommand({ Bucket: config.bucket, Key: key, ContentType: b.contentType, ContentLength: b.sizeBytes, ChecksumSHA256: b.checksum, ...encryption }), { expiresIn: 300, signableHeaders: new Set(['content-type','content-length']), unhoistableHeaders: new Set(['x-amz-checksum-sha256','x-amz-server-side-encryption']) }),
    getUrl: (key, download = false) => getSignedUrl(signer, new GetObjectCommand({ Bucket: config.bucket, Key: key, ...(download && { ResponseContentDisposition: `attachment; filename="${key.split('/').pop()}"` }) }), { expiresIn: 900 }),
    head: key => client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key })),
    read: key => client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key })),
    promote: (source, key) => client.send(new CopyObjectCommand({ Bucket: config.bucket, Key: key, CopySource: `${config.bucket}/${source.split('/').map(encodeURIComponent).join('/')}`, ...encryption })),
    remove: key => client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key })),
    list: token => client.send(new ListObjectsV2Command({ Bucket: config.bucket, Prefix: 'originales/', MaxKeys: 40, ...(token && { ContinuationToken: token }) })),
    headers: b => ({ 'Content-Type': b.contentType, 'x-amz-checksum-sha256': b.checksum, ...(!config.endpoint && { 'x-amz-server-side-encryption': 'AES256' }) })
  };
}
export function createApp({ store, origin = 'http://localhost:3000', label = 'Amazon S3', now = Date.now, limited = true }) {
  const app = express();
  const pending = new Map();
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"], fontSrc: ["'self'"], imgSrc: ["'self'", 'blob:', 'https://*.amazonaws.com', 'http://localhost:9000'], connectSrc: ["'self'", 'https://*.amazonaws.com', 'http://localhost:9000'], upgradeInsecureRequests: null } }, strictTransportSecurity: false }));
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (req.headers.origin && req.headers.origin !== origin) return next(fail(403, 'Origen no autorizado.'));
    next();
  });
  app.use(express.json({ limit: '12kb' }));
  if (limited) app.use('/api', rateLimit({ windowMs: 60_000, limit: 90, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Demasiadas solicitudes. Espera un minuto.' } }));
  const uploadsLimit = limited ? rateLimit({ windowMs: 60_000, limit: 15, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Límite de cargas alcanzado. Espera un minuto.' } }) : (req,res,next) => next();
  app.get('/health', (req,res) => res.json({ status: 'ok' }));
  app.get('/api/config', (req,res) => res.json({ storage: label, maxBytes: MAX_BYTES, uploadSeconds: 300, viewSeconds: 900 }));
  app.post('/api/upload-url', uploadsLimit, async (req,res) => {
    const b = validateUpload(req.body);
    for (const [id,p] of pending) if (p.expires < now() && !p.busy) pending.delete(id);
    if (pending.size >= 200) throw fail(429, 'Hay demasiadas cargas pendientes. Inténtalo más tarde.');
    const id = randomUUID();
    const safeName = b.filename.replace(/[^a-zA-Z0-9._-]/g,'_').replace(/\.{2,}/g,'_').replace(/^\.+/,'').slice(-100) || `imagen.${TYPES[b.contentType]}`;
    const stage = `temporal/uploads/${id}`;
    const key = `originales/${id}-${safeName}`;
    const uploadUrl = await store.putUrl(stage,b);
    pending.set(id,{ ...b, stage, key, expires: now()+360_000, busy: false });
    res.json({ uploadUrl, key, uploadId: id, headers: store.headers(b), expiresIn: 300 });
  });
  app.post('/api/uploads/:id/complete', async (req,res) => {
    const p = pending.get(req.params.id);
    if (!p || p.expires < now()) throw fail(410, 'La carga ha vencido. Selecciona la imagen otra vez.');
    if (p.busy) throw fail(409, 'Esta imagen ya se está verificando.');
    p.busy = true;
    try {
      const head = await store.head(p.stage);
      if (head.ContentLength !== p.sizeBytes || head.ContentLength >= MAX_BYTES || head.ContentType !== p.contentType) throw fail(400, 'El tamaño o tipo real no coincide con lo declarado.');
      const object = await store.read(p.stage);
      const parts = []; let count = 0;
      for await (const chunk of object.Body) { count += chunk.length; if(count >= MAX_BYTES) throw fail(400,'El archivo supera el tamaño permitido.'); parts.push(chunk); }
      if(count !== p.sizeBytes) throw fail(400,'La carga está incompleta.');
      const bytes = Buffer.concat(parts);
      const decoder = sharp(bytes,{ limitInputPixels: 40_000_000, failOn: 'warning' });
      const meta = await decoder.metadata().catch(() => { throw fail(400,'El archivo no contiene una imagen válida.'); });
      if(meta.format !== TYPES[p.contentType] || (meta.pages || 1)>1) throw fail(400,'El contenido no corresponde al tipo indicado o es una imagen animada.');
      await decoder.stats().catch(() => { throw fail(400,'La imagen está dañada o no puede decodificarse.'); });
      await store.promote(p.stage,p.key);
      // Gallery publication happens only after actual image decoding.
      res.status(201).json({ key:p.key, verified:true });
    } finally {
      pending.delete(req.params.id);
      await store.remove(p.stage).catch(() => {});
    }
  });
  app.get('/api/images', async (req,res) => {
    const cursor = req.query.cursor;
    if(cursor && (typeof cursor !== 'string' || cursor.length>4096)) throw fail(400,'Cursor inválido.');
    const list = await store.list(cursor);
    const objects = (list.Contents || []).filter(o => validKey(o.Key) && o.Size>0 && o.Size<MAX_BYTES && /\.(png|jpe?g|webp)$/i.test(o.Key));
    const items = await Promise.all(objects.map(async o => ({ key:o.Key, name:o.Key.split('/').pop().replace(/^[0-9a-f-]{36}-/,''), size:o.Size, lastModified:o.LastModified, url:await store.getUrl(o.Key), downloadUrl:await store.getUrl(o.Key,true) })));
    res.json({ items, nextCursor:list.NextContinuationToken || null });
  });
  app.delete('/api/images/*key', async (req,res) => {
    const key = Array.isArray(req.params.key) ? req.params.key.join('/') : req.params.key;
    if(!validKey(key)) throw fail(400,'La clave no pertenece a la galería.');
    await store.remove(key);
    res.json({ deleted:true });
  });
  app.use(express.static(fileURLToPath(new URL('../frontend/',import.meta.url)),{ etag:true, maxAge:'1h' }));
  app.use((err,req,res,next) => {
    const status = err.status || (err.name === 'NoSuchKey' ? 404 : 503);
    const message = err.status ? err.message : 'No se pudo acceder al almacenamiento. Revisa las credenciales, el bucket y la conexión.';
    // Do not log request bodies, signed URLs or provider credential errors.
    res.status(status).json({ error:message });
  });
  return app;
}
if(process.argv[1] === fileURLToPath(import.meta.url)) {
  const config = { region:process.env.AWS_REGION || 'us-east-1', bucket:process.env.S3_BUCKET, endpoint:process.env.S3_ENDPOINT, publicEndpoint:process.env.S3_PUBLIC_ENDPOINT };
  if(!config.bucket) throw new Error('Configura S3_BUCKET antes de iniciar.');
  createApp({ store:createStore(config), origin:process.env.APP_ORIGIN || 'http://localhost:3000', label:process.env.STORAGE_LABEL || 'Amazon S3' }).listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Lumbre disponible en http://localhost:3000'));
}

