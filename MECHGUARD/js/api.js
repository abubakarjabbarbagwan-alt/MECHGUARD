/* MECHGUARD — REST API helper
 * HTTP fetching against the ESP8266 endpoint is handled inside
 * js/dashboard.js. Reserved for shared fetch wrappers.
 */
window.MG_API = {
  base: () => localStorage.getItem('mechguard_esp_ip') || '',
  get: async (path) => {
    const base = window.MG_API.base(); if(!base) throw new Error('No ESP IP set');
    const url = (base.startsWith('http')?base:`http://${base}`).replace(/\/$/,'') + path;
    const r = await fetch(url, { cache:'no-store' });
    if(!r.ok) throw new Error('HTTP '+r.status);
    return r.json();
  }
};
