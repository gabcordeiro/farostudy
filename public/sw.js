/* Service worker do Faro Study: recebe push e mostra a notificação de estudo. */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Faro Study", body: event.data ? event.data.text() : "Hora de estudar!" };
  }
  const title = data.title || "Faro Study";
  const options = {
    body: data.body || "Você tem cards para revisar hoje.",
    icon: "/favicon-32.png",
    badge: "/favicon-32.png",
    data: { url: data.url || "/estudar" },
    tag: data.tag || "faro-reminder",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/estudar";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
