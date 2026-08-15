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
// Photos handed over by the OS share sheet (manifest share_target) wait here between
// the POST landing below and the app pulling them out after the redirect. A separate
// cache so the activate cleanup and shell-version bumps can never eat a shared photo.
const SHARE_CACHE = "caption-shared-v1";
const SHELL = ["./", "./manifest.webmanifest"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE && k !== SHARE_CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Android share sheet → "Captions". The OS POSTs the photo(s) here; stash them and
  // bounce to the app with a flag it checks on load. 303 so the redirect is a GET.
  // iOS Safari ignores share_target entirely — there, photos come in via the picker.
  if (req.method === "POST" && url.origin === self.location.origin && url.pathname.endsWith("/share-target")) {
    event.respondWith(
      (async () => {
        try {
          const form = await req.formData();
          const files = form.getAll("photos").filter((f) => f && typeof f.arrayBuffer === "function");
          const cache = await caches.open(SHARE_CACHE);
          // A new share replaces any photos a previous share left unclaimed.
          for (const k of await cache.keys()) await cache.delete(k);
          let i = 0;
          for (const f of files.slice(0, 6)) {
            await cache.put(
              "./shared-photo-" + i++,
              new Response(f, { headers: { "Content-Type": f.type || "image/jpeg" } })
            );
          }
        } catch (e) { /* fall through — the app just opens with no photos */ }
        return Response.redirect("./?shared=1", 303);
      })()
    );
    return;
  }

  if (req.method !== "GET") return;
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
