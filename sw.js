/*
 * Offline support. Network first, so a new push always shows up right away;
 * the cache is only used when there's no connection (handy in a kitchen with bad wifi).
 * Bump VERSION to drop old caches.
 */
const VERSION = "cm-v1";
const CORE = [
    "./",
    "index.html",
    "css/styles.css",
    "data/site.js",
    "data/glossary.js",
    "data/recipes.js",
    "data/manifesting.js",
    "data/notebook.js",
    "js/quantity.js",
    "js/core.js",
    "js/timers.js",
    "js/views/home.js",
    "js/views/cookbook.js",
    "js/views/recipe.js",
    "js/views/manifesting.js",
    "js/views/notebook.js",
    "js/views/tools.js",
    "js/app.js",
    "assets/favicon.svg",
];

self.addEventListener("install", (e) => {
    e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (e) => {
    const req = e.request;
    if (req.method !== "GET") return;
    const url = new URL(req.url);
    const sameOrigin = url.origin === self.location.origin;
    const fonts = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
    if (!sameOrigin && !fonts) return;
    e.respondWith(
        fetch(req)
            .then((res) => {
                if (res && (res.ok || res.type === "opaque")) {
                    const copy = res.clone();
                    caches.open(VERSION).then((c) => c.put(req, copy));
                }
                return res;
            })
            .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match("index.html")))
    );
});
