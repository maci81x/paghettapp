// Notifiche push di PaghettApp: caricato dal service worker generato da Workbox.
self.addEventListener("push", (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch {
    d = { title: "PaghettApp", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(d.title || "PaghettApp", {
      body: d.body || "",
      icon: "/paghettapp/pwa-192x192.png",
      badge: "/paghettapp/pwa-192x192.png",
      data: { url: d.url || "/paghettapp/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/paghettapp/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) return c.focus();
      return self.clients.openWindow(url);
    }),
  );
});
