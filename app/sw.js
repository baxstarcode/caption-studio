/* Baxstar Caption Studio — service worker.
 *
 * Purpose: make the tool open instantly on weak lake signal, and open at all with
 * none. The app is one self-contained HTML file, so the shell cache is tiny.
 * Stale-while-revalidate: repeat opens paint from cache immediately and refresh
 * in the background. Mirrors baxstar-ember/sw.js.
 *
 * Deliberately conservative:
 *   · Only same-origin GET requests are cached. The Apps Script proxy POST (the
 *     caption call) and the Google Fonts stylesheet are passed straight through —
 *     captions are never served stale, and offline the font degrades to system.
 *   · Navigations fall back to the cached shell when offline.
 */
const CACHE = "caption-shell-v1";
const SHELL = ["./", "./manifest.webmanifest"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req, { ignoreSearch: req.mode === "navigate" });
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
          return res;
        })
        .catch(() => null);
      if (cached) { event.waitUntil(network); return cached; }
      const fresh = await network;
      if (fresh) return fresh;
      // Offline with nothing cached for this URL: a navigation still gets the shell.
      if (req.mode === "navigate") {
        const shell = await cache.match("./");
        if (shell) return shell;
      }
      return Response.error();
    })()
  );
});
