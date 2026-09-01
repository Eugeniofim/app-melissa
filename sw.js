/* Service worker — Voyages & Images
   Estratégia: rede primeiro (o app novo chega sempre que houver internet),
   cache como reserva (o app abre mesmo sem internet).
   Para publicar uma atualização: subir os arquivos novos e trocar a VERSION. */
'use strict';

const VERSION = 'vi-v1.47.0';
const CORE = [
  './', './index.html', './app.js', './fx.js', './pix.js', './qr.js', './qrcode.js', './traduz.js', './store.js', './auth.js', './logo.js', './cloud.js', './i18n.js', './tokens.css',
  './manifest.webmanifest', './capa.jpg', './home.jpg', './logo-oficial.png', './logo-oficial-escuro.png', './logo-texto-branco.png', './melissa.jpg', './p-t1-1.jpg', './p-t1-2.jpg', './p-t1-3.jpg', './p-t1-4.jpg', './p-t2-1.jpg', './p-t2-2.jpg', './p-t2-3.jpg', './p-t2-4.jpg', './p-t4-1.jpg', './p-t4-2.jpg', './p-t4-3.jpg', './p-t4-4.jpg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  /* O GitHub manda o index.html com max-age=600: o navegador guarda a pagina
     por 10 minutos e continua servindo a versao velha mesmo com recarga
     forcada. Para a pagina e para o codigo do app, furamos esse cache. */
  const ehApp = e.request.mode === 'navigate'
    || /\.(?:js|css|webmanifest)$/.test(url.pathname);
  e.respondWith(
    fetch(e.request, ehApp ? { cache: 'reload' } : undefined)
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() =>
        caches.match(e.request).then((hit) => hit ||
          (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))
      )
  );
});
