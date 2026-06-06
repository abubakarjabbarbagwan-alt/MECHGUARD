/* MECHGUARD — Shared page utilities and theme toggle */
window.MG = window.MG || {};

MG.initThemeToggle = function () {
  var KEY = 'mechguard-theme';
  if (document.getElementById('themeToggle')) return;
  var btn = document.createElement('button');
  btn.id = 'themeToggle';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Toggle dark and light mode');
  btn.title = 'Toggle theme';
  function apply(theme) {
    if (theme === 'light') {
      document.documentElement.classList.add('light-mode');
      btn.textContent = '☀️';
    } else {
      document.documentElement.classList.remove('light-mode');
      btn.textContent = '🌙';
    }
  }
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { }
  apply(saved === 'light' ? 'light' : 'dark');
  btn.addEventListener('click', function () {
    var next = document.documentElement.classList.contains('light-mode') ? 'dark' : 'light';
    apply(next);
    try { localStorage.setItem(KEY, next); } catch (e) { }
  });
  document.body.appendChild(btn);
};

MG.bindClick = function (selector, handler) {
  var button = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (button) button.addEventListener('click', handler);
};

MG.goTo = function (path) {
  window.location.href = path;
};

MG.getSession = function () {
  try { return JSON.parse(localStorage.getItem('mechguard_session') || 'null'); } catch (e) { return null; }
};

MG.saveSession = function (session) {
  try { localStorage.setItem('mechguard_session', JSON.stringify(session)); } catch (e) { }
};

MG.clearSession = function () {
  localStorage.removeItem('mechguard_session');
};

MG.isLoggedIn = function () {
  var s = MG.getSession();
  return !!(s && s.loggedIn);
};

MG.requireLogin = function () {
  if (!MG.isLoggedIn()) {
    window.location.href = 'login.html';
  }
};

MG.setText = function (id, text) {
  var el = document.getElementById(id);
  if (el) el.textContent = text;
};

MG.setBadge = function (id, cls, text) {
  var el = document.getElementById(id);
  if (!el) return;
  el.className = 'kpi-badge ' + cls;
  el.textContent = text;
};

document.addEventListener('DOMContentLoaded', function () {
  if (document.body) MG.initThemeToggle();
});
