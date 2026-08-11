(() => {
  const KEY = "super_me_v1";
  const originalSetItem = Storage.prototype.setItem;

  Storage.prototype.setItem = function(key, value) {
    if (key !== KEY || this !== localStorage) {
      return originalSetItem.call(this, key, value);
    }

    try {
      const stack = new Error().stack || "";
      const fromCoreApp = stack.includes("app.js");
      if (fromCoreApp) {
        const current = JSON.parse(localStorage.getItem(KEY) || "{}") || {};
        const incoming = JSON.parse(value || "{}") || {};
        const merged = {
          ...current,
          ...incoming,
          profile: { ...(current.profile || {}), ...(incoming.profile || {}) },
          goals: { ...(current.goals || {}), ...(incoming.goals || {}) }
        };

        // These collections/settings are maintained by modules loaded after app.js.
        // A stale in-memory core save must never erase them.
        ["books", "weight", "smoking", "meditation"].forEach(k => {
          if (Object.prototype.hasOwnProperty.call(current, k)) merged[k] = current[k];
        });

        value = JSON.stringify(merged);
      }
    } catch (e) {
      console.warn("Super Me storage safety fallback", e);
    }

    return originalSetItem.call(this, key, value);
  };
})();
