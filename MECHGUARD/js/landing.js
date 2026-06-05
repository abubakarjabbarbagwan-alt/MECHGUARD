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

/* Cross-page navigation (replaces SPA panel swapping) */
function showApp(){ window.location.href = 'login.html'; }
function showLanding(){ window.location.href = 'index.html'; }

/* Scroll reveal + cursor glow */
document.addEventListener('DOMContentLoaded',()=>{
  const reveals=document.querySelectorAll('.reveal');
  const io=new IntersectionObserver((entries)=>{ entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); } }); },{threshold:0.15});
  reveals.forEach(el=>io.observe(el));
  const glow=document.createElement('div');
  Object.assign(glow.style,{position:'fixed',pointerEvents:'none',zIndex:'9999',width:'320px',height:'320px',borderRadius:'50%',background:'radial-gradient(circle, rgba(0,245,255,0.07) 0%, transparent 70%)',transform:'translate(-50%,-50%)',transition:'left 0.12s ease, top 0.12s ease',left:'-999px',top:'-999px'});
  document.body.appendChild(glow);
  document.addEventListener('mousemove',e=>{ glow.style.left=e.clientX+'px'; glow.style.top=e.clientY+'px'; });
});
