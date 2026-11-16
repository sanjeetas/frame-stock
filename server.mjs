import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,existsSync,statSync} from 'node:fs';
import {dirname,resolve,extname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url)), publicRoot=join(root,'public');
export function createApp(options={}){
 const data=options.dataDir||process.env.DATA_DIR||join(root,'data');mkdirSync(data,{recursive:true});mkdirSync(join(data,'files'),{recursive:true});mkdirSync(join(data,'previews'),{recursive:true});
 const db=new DatabaseSync(join(data,'phulo.sqlite'));db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY, data TEXT NOT NULL, file TEXT); CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY, data TEXT NOT NULL, status TEXT NOT NULL, token_hash TEXT); CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY, expires INTEGER NOT NULL);');
 if(!db.prepare('SELECT id FROM products LIMIT 1').get()){for(const p of JSON.parse(readFileSync(join(publicRoot,'catalog.json'),'utf8')))db.prepare('INSERT INTO products VALUES(?,?,NULL)').run(p.id,JSON.stringify(p));}
 const password=options.password||process.env.ADMIN_PASSWORD||'',salt=randomBytes(16),passwordHash=scryptSync(password,salt,32),limits=new Map();
 const sha=t=>createHash('sha256').update(t).digest('hex');
 const clean=p=>{const {file,...rest}=JSON.parse(p.data);return {...rest,hasFile:!!p.file}};
 const json=(res,status,payload)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(payload))};
 const body=async req=>{let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>28*1024*1024)throw Object.assign(new Error('Upload too large; maximum file size 20 MB.'),{status:413});chunks.push(chunk)}try{return JSON.parse(Buffer.concat(chunks).toString()||'{}')}catch{throw Object.assign(new Error('Invalid JSON'),{status:400})}};
 const str=(s,max=500)=>String(s??'').trim().slice(0,max);
 const auth=req=>{const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('phulo_session='))?.slice(14);return token&&db.prepare('SELECT hash FROM sessions WHERE hash=? AND expires>?').get(sha(token),Date.now())};
 function validateProduct(p,id){if(!str(p.title,150)||!str(p.category,100)||!['Printing Products','Gifting Items','Customised Products','Image Library'].includes(p.group))throw Object.assign(new Error('Title, category and valid group required'),{status:400});if(p.price!==null&&p.price!==''&&(!Number.isFinite(Number(p.price))||Number(p.price)<0))throw Object.assign(new Error('Invalid price'),{status:400});if(p.image&&!/^https:\/\//.test(p.image)&&!/^assets\/[a-zA-Z0-9_.-]+$/.test(p.image)&&!/^previews\/[a-zA-Z0-9_-]+\.(png|jpg|webp)$/.test(p.image))throw Object.assign(new Error('Preview image must be an HTTPS URL or an assets path'),{status:400});return {id,title:str(p.title,150),category:str(p.category,100),group:p.group,price:p.price===null||p.price===''?null:Number(p.price),unit:str(p.unit,30)||'item',description:str(p.description,2000),kind:p.group==='Image Library'?'image':'product',image:str(p.image,2000),editable:!!p.editable,published:p.published!==false,bg:/^#[0-9a-f]{6}$/i.test(p.bg)?p.bg:'#e7ecd9',fg:/^#[0-9a-f]{6}$/i.test(p.fg)?p.fg:'#365044',variant:Number(p.variant)||0}}
 const server=http.createServer(async(req,res)=>{try{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
  const url=new URL(req.url,'http://local'),path=url.pathname,method=req.method;
  if(!['GET','HEAD'].includes(method)&&req.headers.origin){if(!['http:','https:'].includes(new URL(req.headers.origin).protocol)||new URL(req.headers.origin).host!==req.headers.host)return json(res,403,{error:'Cross-origin request blocked'})}
  if(path==='/api/health')return json(res,200,{ok:true,adminConfigured:!!password});
  if(path==='/api/products'&&method==='GET')return json(res,200,db.prepare('SELECT * FROM products').all().map(clean).filter(p=>p.published));
  if(path==='/api/admin/login'&&method==='POST'){
   if(!password)return json(res,503,{error:'Set ADMIN_PASSWORD on the backend host to enable admin login.'});
   const ip=req.socket.remoteAddress,now=Date.now();let limit=limits.get(ip);if(!limit||limit.until<now){limit={count:0,until:now+15*60000};limits.set(ip,limit)}
   if(limit.count>=10)return json(res,429,{error:'Too many login attempts. Try again in 15 minutes.'});const b=await body(req);limit.count++;
   if(!timingSafeEqual(scryptSync(str(b.password,300),salt,32),passwordHash))return json(res,401,{error:'Incorrect password'});
   limits.delete(ip);db.prepare('DELETE FROM sessions WHERE expires<?').run(now);const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?)').run(sha(token),now+8*3600000);
   res.setHeader('Set-Cookie',`phulo_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.NODE_ENV==='production'?'; Secure':''}`);return json(res,200,{ok:true});
  }
  if(path.startsWith('/api/admin/')){
   if(!auth(req))return json(res,401,{error:'Admin sign-in required'});
   if(path==='/api/admin/logout'&&method==='POST'){const token=(req.headers.cookie||'').match(/phulo_session=([^;]+)/)?.[1];if(token)db.prepare('DELETE FROM sessions WHERE hash=?').run(sha(token));res.setHeader('Set-Cookie','phulo_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,{ok:true})}
   if(path==='/api/admin/me')return json(res,200,{ok:true});
   if(path==='/api/admin/products'&&method==='GET')return json(res,200,db.prepare('SELECT * FROM products').all().map(clean));
   if(path==='/api/admin/products'&&method==='POST'){const b=await body(req),id=b.id||randomBytes(8).toString('hex');if(!/^[a-zA-Z0-9_-]{1,80}$/.test(id))return json(res,400,{error:'Invalid ID'});const p=validateProduct(b,id);db.prepare('INSERT INTO products(id,data) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(id,JSON.stringify(p));return json(res,200,clean(db.prepare('SELECT * FROM products WHERE id=?').get(id)))}
   const pm=path.match(/^\/api\/admin\/products\/([\w-]+)$/);if(pm&&method==='DELETE'){const p=db.prepare('SELECT * FROM products WHERE id=?').get(pm[1]);if(!p)return json(res,404,{error:'Product not found'});const v=clean(p);v.published=false;db.prepare('UPDATE products SET data=? WHERE id=?').run(JSON.stringify(v),pm[1]);return json(res,200,{ok:true})}
   const fm=path.match(/^\/api\/admin\/files\/([\w-]+)$/);if(fm&&method==='POST'){
    const p=db.prepare('SELECT * FROM products WHERE id=?').get(fm[1]);if(!p)return json(res,404,{error:'Product not found'});const b=await body(req),name=str(b.name,150).replace(/[^a-zA-Z0-9_.-]/g,'_');
    if(!/\.(png|jpg|jpeg|webp|pdf|zip|psd|ai|eps|svg)$/i.test(name))return json(res,400,{error:'Unsupported file format'});
    if(typeof b.base64!=='string'||!b.base64||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(b.base64))return json(res,400,{error:'Invalid file data'});const bytes=Buffer.from(b.base64,'base64');if(!bytes.length||bytes.length>20*1024*1024)return json(res,413,{error:'Maximum file size is 20 MB'});
    const stored=randomBytes(16).toString('hex')+'-'+name;writeFileSync(join(data,'files',stored),bytes,{mode:0o600});db.prepare('UPDATE products SET file=? WHERE id=?').run(stored,fm[1]);return json(res,200,{ok:true,name})}
   const previewMatch=path.match(/^\/api\/admin\/previews\/([\w-]+)$/);if(previewMatch&&method==='POST'){
    const row=db.prepare('SELECT * FROM products WHERE id=?').get(previewMatch[1]);if(!row)return json(res,404,{error:'Product not found'});const b=await body(req);if(typeof b.base64!=='string')return json(res,400,{error:'Invalid image'});const bytes=Buffer.from(b.base64,'base64');if(!bytes.length||bytes.length>8*1024*1024)return json(res,400,{error:'Preview must be under 8 MB'});let ext=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'png':bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'jpg':bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'?'webp':null;if(!ext)return json(res,400,{error:'Preview must be a PNG, JPEG or WebP image'});const name=randomBytes(16).toString('hex')+'.'+ext;writeFileSync(join(data,'previews',name),bytes);const product=clean(row);product.image='previews/'+name;db.prepare('UPDATE products SET data=? WHERE id=?').run(JSON.stringify(product),row.id);return json(res,200,{image:product.image});
   }
   if(path==='/api/admin/orders'&&method==='GET')return json(res,200,db.prepare('SELECT * FROM orders ORDER BY rowid DESC').all().map(o=>({...JSON.parse(o.data),status:o.status})));
   const om=path.match(/^\/api\/admin\/orders\/([\w-]+)$/);if(om&&method==='PATCH'){
    const row=db.prepare('SELECT * FROM orders WHERE id=?').get(om[1]);if(!row)return json(res,404,{error:'Order not found'});const b=await body(req);if(!['pending','confirmed','dispatched','completed','cancelled'].includes(b.status))return json(res,400,{error:'Invalid order status'});
    const order=JSON.parse(row.data);let downloadUrl=null,tokenHash=null;
    if(b.releaseDownload){if(b.status!=='completed')return json(res,400,{error:'Mark order completed after verifying payment before releasing a download.'});if(!order.items.some(i=>i.kind==='image'&&db.prepare('SELECT file FROM products WHERE id=?').get(i.id)?.file))return json(res,400,{error:'Upload an original HD file for this order first'});const token=randomBytes(32).toString('hex');tokenHash=sha(token);downloadUrl='/api/download/'+token;order.downloadExpires=Date.now()+7*86400000}
    db.prepare('UPDATE orders SET status=?,token_hash=?,data=? WHERE id=?').run(b.status,tokenHash,JSON.stringify(order),om[1]);return json(res,200,{ok:true,downloadUrl});
   }
   return json(res,404,{error:'Admin endpoint not found'});
  }
  if(path==='/api/orders'&&method==='POST'){
   const ip='order:'+req.socket.remoteAddress,now=Date.now();let limit=limits.get(ip);if(!limit||limit.until<now){limit={count:0,until:now+3600000};limits.set(ip,limit)}if(limit.count++>=30)return json(res,429,{error:'Too many requests. Try again later.'});
   const b=await body(req);if(!str(b.name,100)||!/^\+?[\d ()-]{8,20}$/.test(str(b.phone,25))||!Array.isArray(b.items)||!b.items.length||b.items.length>30)return json(res,400,{error:'Enter your name, valid phone number and at least one item'});
   const items=b.items.map(item=>{const p=db.prepare('SELECT * FROM products WHERE id=?').get(str(item.id,80));if(!p||!clean(p).published)throw Object.assign(new Error('Product is unavailable'),{status:400});const product=clean(p),qty=Number(item.qty);if(!Number.isInteger(qty)||qty<1||qty>10000)throw Object.assign(new Error('Invalid quantity'),{status:400});const customization=JSON.stringify(item.customization||{});if(customization.length>10000)throw Object.assign(new Error('Design settings are too long'),{status:400});return {id:product.id,title:product.title,kind:product.kind,unit:product.unit,unitPrice:product.price,qty,customization:JSON.parse(customization)}});
   const id='PH-'+randomBytes(6).toString('hex').toUpperCase(),order={id,created:new Date().toISOString(),name:str(b.name,100),phone:str(b.phone,25),email:str(b.email,150),address:str(b.address,1000),notes:str(b.notes,2000),items,total:items.reduce((s,i)=>s+(i.unitPrice||0)*i.qty,0),needsQuote:items.some(i=>i.unitPrice===null)};
   db.prepare('INSERT INTO orders VALUES(?,?,?,NULL)').run(id,JSON.stringify(order),'pending');return json(res,201,{id,total:order.total,needsQuote:order.needsQuote});
  }
  const dl=path.match(/^\/api\/download\/([a-f0-9]{64})$/);if(dl&&method==='GET'){
   const row=db.prepare('SELECT * FROM orders WHERE token_hash=? AND status=?').get(sha(dl[1]),'completed');if(!row)return json(res,404,{error:'Download link not found or revoked'});const order=JSON.parse(row.data);if(!order.downloadExpires||order.downloadExpires<Date.now())return json(res,410,{error:'Download link expired. Contact PHULO.'});const item=order.items.find(i=>i.kind==='image'&&db.prepare('SELECT file FROM products WHERE id=?').get(i.id)?.file);if(!item)return json(res,404,{error:'File unavailable'});const p=db.prepare('SELECT file FROM products WHERE id=?').get(item.id),file=join(data,'files',p.file);if(!existsSync(file))return json(res,404,{error:'File unavailable'});res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="${p.file.slice(33)}"`,'Cache-Control':'no-store'});return res.end(readFileSync(file));
  }
  if(/^\/previews\/[a-f0-9]{32}\.(png|jpg|webp)$/.test(path)&&method==='GET'){const file=join(data,path.slice(1));if(!existsSync(file))return json(res,404,{error:'Preview not found'});res.writeHead(200,{'Content-Type':extname(file)==='.png'?'image/png':extname(file)==='.webp'?'image/webp':'image/jpeg'});return res.end(readFileSync(file));}
  if(path.startsWith('/api/'))return json(res,404,{error:'Endpoint not found'});
  if(!['GET','HEAD'].includes(method))return json(res,405,{error:'Method not allowed'});
  const relative=path==='/'?'index.html':path==='/admin'?'admin.html':decodeURIComponent(path.slice(1)),file=resolve(publicRoot,relative);
  if(!file.startsWith(publicRoot+'/')||!existsSync(file)||!statSync(file).isFile())return json(res,404,{error:'Page not found'});
  const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg'};
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(method==='HEAD'?undefined:readFileSync(file));
 }catch(e){json(res,e.status||500,{error:e.status?e.message:'Server error. Please try again.'});if(!e.status)console.error(e.message)}});
 server.on('close',()=>db.close());return server;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const server=createApp();server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('PHULO server ready'));}
