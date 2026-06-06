# MECHGUARD AI V10 — Multi-Page Build

Smart Machine Health Monitoring dashboard with ESP8266 current-sensor
integration. Split from the monolithic single-file build into a
production-ready static project structure.

## Structure
```
MECHGUARD/
├── index.html        Landing page
├── login.html        Login page (admin / engineer / operator demo creds)
├── dashboard.html    Live dashboard, AI panel, reports, ESP8266 controls
├── css/
│   ├── landing.css   Landing-only styles
│   ├── app.css       Shared login + dashboard styles
│   ├── login.css     @import app.css
│   ├── dashboard.css @import app.css
│   ├── ai.css        AI panel hooks
│   └── report.css    Report center hooks
├── js/
│   ├── landing.js    Theme toggle, scroll reveal, cursor glow
│   ├── login.js      Auth flow + loading animation
│   ├── dashboard.js  Gauges, charts, sidebar, AI, reports, ESP polling
│   ├── ai.js         Reserved (logic currently inside dashboard.js)
│   ├── report.js     Reserved (logic currently inside dashboard.js)
│   ├── esp8266.js    Reserved (polling currently inside dashboard.js)
│   ├── api.js        HTTP helper (window.MG_API)
│   └── websocket.js  Optional realtime channel (window.MG_WS)
└── assets/
    ├── images/
    └── icons/
```

## Demo Login
| Role     | User     | Password   |
|----------|----------|------------|
| Admin    | admin    | admin123   |
| Engineer | engineer | eng123     |
| Operator | operator | op123      |

## Local preview
Any static server works:
```
python3 -m http.server 8000
# open http://localhost:8000/
```

## GitHub Pages
Push to `main` and enable Pages → root. The site serves `index.html`
as the landing page.
