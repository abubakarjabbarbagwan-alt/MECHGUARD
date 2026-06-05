/* MECHGUARD — WebSocket helper (optional realtime channel)
 * Current build uses HTTP polling via js/dashboard.js. This module is
 * reserved for upgrading to ws:// streaming from the ESP8266.
 */
window.MG_WS = {
  connect: (ip, onMessage) => {
    try {
      const ws = new WebSocket(`ws://${ip}:81/`);
      ws.onmessage = (e)=> onMessage && onMessage(e.data);
      return ws;
    } catch(e){ console.warn('WS connect failed', e); return null; }
  }
};
