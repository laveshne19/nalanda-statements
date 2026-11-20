const SHELL='ne-shell-v1', DATA='ne-data-v1';
const ASSETS=['./','./index.html','../app.js','../style.css','../icons/icon-192.png','../icons/icon-512.png','./manifest.webmanifest'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(SHELL).then(c=>c.addAll(ASSETS).catch(()=>{})).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==SHELL&&k!==DATA).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url); if(e.request.method!=='GET') return;
  if(u.pathname.endsWith('data.enc')){ // network first, fall back to last copy (works offline)
    e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(DATA).then(c=>c.put(u.pathname,cp));return r;}).catch(()=>caches.open(DATA).then(c=>c.match(u.pathname))));return;}
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(m=>{const f=fetch(e.request).then(r=>{if(r&&r.ok){const cp=r.clone();caches.open(SHELL).then(c=>c.put(e.request,cp));}return r;}).catch(()=>m);return m||f;}));
});
