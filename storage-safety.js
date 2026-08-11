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
        if (Object.prototype.hasOwnProperty.call(current, "books")) merged.books = current.books;
        value = JSON.stringify(merged);
      }
    } catch (e) {
      console.warn("Super Me storage safety fallback", e);
    }

    return originalSetItem.call(this, key, value);
  };
})();
