(function(){
  var KEY = 'mechguard-theme';
  var btn = document.createElement('button');
  btn.id = 'themeToggle';
  btn.type = 'button';
  btn.setAttribute('aria-label','Toggle dark and light mode');
  btn.title = 'Toggle theme';
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch(e){}
  function apply(theme){
    if (theme === 'light') {
      document.documentElement.classList.add('light-mode');
      btn.textContent = '☀️';
    } else {
      document.documentElement.classList.remove('light-mode');
      btn.textContent = '🌙';
    }
  }
  apply(saved === 'light' ? 'light' : 'dark');
  btn.addEventListener('click', function(){
    var next = document.documentElement.classList.contains('light-mode') ? 'dark' : 'light';
    apply(next);
    try { localStorage.setItem(KEY, next); } catch(e){}
  });
  function mount(){ if (!document.getElementById('themeToggle')) document.body.appendChild(btn); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();

/* Auth flow user table */
const USERS = {
  admin:    { pass:'admin123', role:'ADMIN',    initials:'AD' },
  engineer: { pass:'eng123',   role:'ENGINEER', initials:'EN' },
  operator: { pass:'op123',    role:'OPERATOR', initials:'OP' },
};
function fillCred(u,p){ document.getElementById('username').value=u; document.getElementById('password').value=p; document.getElementById('loginError').classList.remove('show'); }
function togglePwd(){ const i=document.getElementById('password'); i.type=i.type==='password'?'text':'password'; }
function doLogin(){
  const u=document.getElementById('username').value.trim().toLowerCase();
  const p=document.getElementById('password').value;
  const err=document.getElementById('loginError');
  if(!USERS[u]||USERS[u].pass!==p){ err.classList.add('show'); return; }
  err.classList.remove('show');
  localStorage.setItem('mechguard_session',JSON.stringify({user:u,role:USERS[u].role,initials:USERS[u].initials,loggedIn:true}));
  const ov=document.getElementById('loadingOverlay'); ov.classList.add('show');
  const bar=document.getElementById('loadBar'); bar.style.animation='none'; void bar.offsetWidth; bar.style.animation='loadBar 1.5s ease forwards';
  setTimeout(()=>{ window.location.href='dashboard.html'; }, 1700);
}
document.addEventListener('DOMContentLoaded',()=>{
  // auto-skip if already logged in
  try{ const s=JSON.parse(localStorage.getItem('mechguard_session')||'null'); if(s&&s.loggedIn){ window.location.href='dashboard.html'; return; } }catch(e){}
  const p=document.getElementById('password'), u=document.getElementById('username');
  if(p) p.addEventListener('keydown',e=>{ if(e.key==='Enter') doLogin(); });
  if(u) u.addEventListener('keydown',e=>{ if(e.key==='Enter') document.getElementById('password').focus(); });
});
