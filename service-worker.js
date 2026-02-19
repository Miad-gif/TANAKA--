const CACHE_NAME = 'tanaka-cache-v1';
const CACHE_URLS = [
  './',
  './index.html',
  './game.js',
  './style.css',
  './manifest.json',
  './assets/icon.svg'
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => { if(k !== CACHE_NAME) return caches.delete(k); })))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evt) => {
  const req = evt.request;
  // simple cache-first strategy for app shell
  evt.respondWith(caches.match(req).then(cached => cached || fetch(req).then(resp => {
    try{ if(req.method === 'GET') caches.open(CACHE_NAME).then(c => c.put(req, resp.clone())); }catch(e){}
    return resp;
  }).catch(()=>caches.match('/index.html'))));
});
