self.addEventListener("push", (event) => {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = {
        title: "New notification",
        message: event.data.text(),
      };
    }
  }

  const title = payload.title || "Cafe notification";
  const options = {
    body: payload.message || "You have a new update.",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    data: {
      link: payload.link || "/",
      notificationId: payload.notificationId || "",
      type: payload.type || "",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const link = event.notification.data?.link || "/";
  const targetUrl = new URL(link, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }

        return self.clients.openWindow(targetUrl);
      })
  );
});
