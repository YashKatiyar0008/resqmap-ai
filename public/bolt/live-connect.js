(() => {
  const colors = { earthquake: "#ef5156", flood: "#ff7a1a", drought: "#f5b914" };
  const labels = { earthquake: "Earthquake", flood: "Flood", drought: "Drought" };
  const trigger = document.createElement("button");
  trigger.id = "resq-live-trigger";
  trigger.innerHTML = "<span></span> LIVE FEEDS";
  trigger.setAttribute("aria-label", "Open live hazard feeds");
  const panel = document.createElement("aside");
  panel.id = "resq-live-panel";
  panel.setAttribute("aria-hidden", "true");
  panel.innerHTML = `<div class="live-head"><div><small>NON-AI DATA CONNECTION</small><h2>Live hazard feeds</h2></div><button id="resq-live-close" aria-label="Close">×</button></div>
  <div class="live-source-status" id="live-source-status">Connecting to verified sources…</div>
  <div class="live-filters"><button class="active" data-type="all">All</button><button data-type="flood">Flood</button><button data-type="drought">Drought</button><button data-type="earthquake">Earthquake</button></div>
  <div class="live-events" id="live-events"><div class="live-loading">Loading current hazard data…</div></div>
  <div class="live-footer"><span id="live-updated">Not updated yet</span><button id="live-refresh">Refresh</button></div>
  <p class="live-disclaimer">Reported events and model signals only. Confirm emergency instructions with local authorities.</p>`;
  const style = document.createElement("style");
  style.textContent = `
  #resq-live-trigger{position:fixed;right:18px;bottom:18px;z-index:9998;border:1px solid #2dd4bf;background:#0c2d2b;color:#76e4d4;border-radius:999px;padding:11px 15px;font:700 11px Inter,sans-serif;letter-spacing:.7px;cursor:pointer;box-shadow:0 10px 34px #0009}
  #resq-live-trigger span{display:inline-block;width:7px;height:7px;border-radius:50%;background:#4ade80;margin-right:7px;box-shadow:0 0 0 4px #4ade8022;animation:livePulse 1.8s infinite}@keyframes livePulse{50%{box-shadow:0 0 0 8px #4ade8000}}
  #resq-live-panel{position:fixed;z-index:9999;right:0;top:0;width:min(440px,100vw);height:100dvh;background:#08121f;border-left:1px solid #26364a;box-shadow:-20px 0 60px #000a;color:#e8eef5;transform:translateX(105%);transition:transform .25s ease;padding:22px;overflow:auto;font-family:Inter,sans-serif}#resq-live-panel.open{transform:translateX(0)}
  .live-head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #26364a;padding-bottom:18px}.live-head small{font-size:9px;color:#5eead4;letter-spacing:1.3px}.live-head h2{font-size:25px;margin:7px 0 0}.live-head>button{border:0;background:#162235;color:#9aa8ba;width:34px;height:34px;border-radius:8px;font-size:24px;cursor:pointer}
  .live-source-status{margin:15px 0;padding:11px 12px;border:1px solid #1d5a51;background:#0d2928;border-radius:9px;color:#72dfcf;font-size:11px;line-height:1.5}.live-filters{display:flex;gap:6px;flex-wrap:wrap;margin:14px 0}.live-filters button{border:1px solid #2a3a50;background:#111c2c;color:#94a3b8;border-radius:7px;padding:7px 10px;font-size:11px;cursor:pointer}.live-filters button.active{color:#08121f;background:#5eead4;border-color:#5eead4;font-weight:700}
  .live-events{display:grid;gap:9px}.live-card{border:1px solid #26364a;border-left:3px solid var(--hazard);background:#101a2a;border-radius:9px;padding:13px}.live-card-top{display:flex;justify-content:space-between;gap:10px}.live-type{color:var(--hazard);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.8px}.live-status{font-size:8px;color:#7f8da1;border:1px solid #334156;border-radius:99px;padding:3px 6px}.live-card h3{font-size:14px;margin:7px 0 4px}.live-card p{font-size:11px;color:#9ba9bb;margin:0;line-height:1.45}.live-card-meta{display:flex;justify-content:space-between;gap:8px;margin-top:10px;color:#66758a;font-size:9px}.live-card a{color:#5eead4;text-decoration:none}.live-loading,.live-empty{padding:40px 10px;text-align:center;color:#758399;font-size:12px}
  .live-footer{display:flex;justify-content:space-between;align-items:center;margin-top:15px;border-top:1px solid #26364a;padding-top:13px;color:#748297;font-size:9px}.live-footer button{border:1px solid #2a3a50;background:#111c2c;color:#dbe5ee;padding:7px 11px;border-radius:7px;cursor:pointer}.live-disclaimer{color:#657286;font-size:9px;line-height:1.5;margin-bottom:20px}@media(max-width:600px){#resq-live-trigger{right:12px;bottom:12px}#resq-live-panel{padding:17px}}`;
  document.head.appendChild(style);
  document.body.append(trigger, panel);
  const eventsNode = panel.querySelector("#live-events");
  const sourceNode = panel.querySelector("#live-source-status");
  const updatedNode = panel.querySelector("#live-updated");
  let events = [], selected = "all";
  const safe = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);
  const render = () => {
    const visible = selected === "all" ? events : events.filter((event) => event.type === selected);
    eventsNode.innerHTML = visible.length ? visible.map((event) => `<article class="live-card" style="--hazard:${colors[event.type]}"><div class="live-card-top"><span class="live-type">${labels[event.type]} · ${safe(event.severity)}</span><span class="live-status">${event.status === "reported" ? "REPORTED" : "MODEL SIGNAL"}</span></div><h3>${safe(event.title)}</h3><p>${safe(event.place)}</p><p>${safe(event.detail)}</p><div class="live-card-meta"><span>${new Date(event.time).toLocaleString()}</span><a href="${safe(event.sourceUrl)}" target="_blank" rel="noreferrer">${safe(event.source)} ↗</a></div></article>`).join("") : '<div class="live-empty">No current events of this type inside the East Africa filter.</div>';
  };
  const load = async () => {
    sourceNode.textContent = "Refreshing verified sources…";
    try {
      const response = await fetch("/api/live-hazards", { cache: "no-store" });
      if (!response.ok) throw new Error("Feed unavailable");
      const data = await response.json(); events = data.events || [];
      const feeds = Object.entries(data.feeds || {});
      sourceNode.textContent = `${feeds.filter(([, ok]) => ok).length}/${feeds.length} feeds connected · USGS · GDACS · weather-model drought signal`;
      updatedNode.textContent = `Updated ${new Date(data.generatedAt).toLocaleTimeString()}`; render();
    } catch { sourceNode.textContent = "Live feeds temporarily unavailable. Simulated demo remains separate."; eventsNode.innerHTML = '<div class="live-empty">Could not refresh live data. Try again shortly.</div>'; }
  };
  const open = () => { panel.classList.add("open"); panel.setAttribute("aria-hidden", "false"); load(); };
  const close = () => { panel.classList.remove("open"); panel.setAttribute("aria-hidden", "true"); };
  trigger.addEventListener("click", open); panel.querySelector("#resq-live-close").addEventListener("click", close); panel.querySelector("#live-refresh").addEventListener("click", load);
  panel.querySelectorAll(".live-filters button").forEach((filter) => filter.addEventListener("click", () => { panel.querySelectorAll(".live-filters button").forEach((item) => item.classList.remove("active")); filter.classList.add("active"); selected = filter.dataset.type; render(); }));
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); }); setInterval(load, 300000);
})();
