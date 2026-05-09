const clearLegacyCaches = async () => {
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
};

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    clearLegacyCaches()
      .catch(() => undefined)
      .then(() => self.clients.claim())
      .then(() => self.registration.unregister())
      .then(async () => {
        const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        clients.forEach((client) => client.navigate(client.url));
      }),
  );
});
