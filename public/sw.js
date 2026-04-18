const CACHE_VERSION = "corte-nobre-pwa-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/icons/corte-nobre-icon.svg",
  "/icons/corte-nobre-maskable.svg",
  "/images/barbershop-tools.svg",
  "/images/barbershop-chair.svg",
  "/images/barbershop-detail.svg",
];

const PRIVATE_PREFIXES = [
  "/api/",
  "/admin",
  "/barbeiro",
  "/meus-agendamentos",
  "/preferencias",
  "/agendamento",
  "/login",
  "/cadastro",
  "/recuperar-senha",
  "/resetar-senha",
  "/auth",
  "/sair",
];

const STATIC_PREFIXES = [
  "/_next/static/",
  "/icons/",
  "/images/",
  "/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("corte-nobre-pwa-") && key !== STATIC_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isPrivatePath(url.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkOnlyWithOfflineFallback(request));
    return;
  }

  if (isStaticAsset(url.pathname, request.destination)) {
    event.respondWith(cacheFirst(request));
  }
});

async function networkOnlyWithOfflineFallback(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(STATIC_CACHE);
    return (await cache.match(OFFLINE_URL)) || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  if (cached) return cached;

  const response = await fetch(request);

  if (response.ok && response.type === "basic") {
    cache.put(request, response.clone());
  }

  return response;
}

function isPrivatePath(pathname) {
  return PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isStaticAsset(pathname, destination) {
  return (
    STATIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix)) ||
    destination === "script" ||
    destination === "style" ||
    destination === "font" ||
    destination === "image"
  );
}
