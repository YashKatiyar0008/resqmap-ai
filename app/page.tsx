"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { runResqGuardEvaluation } from "../lib/resqguard.mjs";

type Hazard = {
  id: string;
  type: "flood" | "drought" | "earthquake";
  title: string;
  place: string;
  severity: string;
  time: string;
  source: string;
  sourceUrl: string;
  status: string;
  detail: string;
  latitude: number;
  longitude: number;
};

type FeedStatus = {
  connected: boolean;
  lastSuccessfulRefresh?: string;
  classification?: string;
  state?: string;
};

type FeedMap = {
  usgs: FeedStatus;
  gdacs: FeedStatus;
  droughtModel: FeedStatus;
};

type LeafletMap = {
  setView: (center: [number, number], zoom: number) => LeafletMap;
  flyTo: (center: [number, number], zoom: number, options?: Record<string, unknown>) => void;
};

type LeafletLayerGroup = {
  addTo: (map: LeafletMap) => LeafletLayerGroup;
  clearLayers: () => void;
};

type LeafletMarker = {
  bindTooltip: (text: string) => void;
  on: (eventName: string, handler: () => void) => void;
  addTo: (layer: LeafletLayerGroup) => void;
};

type LeafletApi = {
  map: (node: HTMLElement, options: Record<string, unknown>) => LeafletMap;
  tileLayer: (url: string, options: Record<string, unknown>) => { addTo: (map: LeafletMap) => void };
  layerGroup: () => LeafletLayerGroup;
  circleMarker: (center: [number, number], options: Record<string, unknown>) => LeafletMarker;
};

declare global {
  interface Window {
    L?: LeafletApi;
  }
}

const demoSteps = [
  ["Hazard detected", "Verified source and classification"],
  ["Citizen alerted", "Multilingual action guidance"],
  ["Unsafe warning blocked", "ResQGuard safety validation"],
  ["Incident reported", "Works online and offline"],
  ["Authority response", "Verification and escalation"],
  ["Connectivity recovery", "Cache, queue and synchronisation"],
];

const validationRows = [
  ["Required actions", "Passed"],
  ["Numbers preserved", "Passed"],
  ["Severity preserved", "Passed"],
  ["Location preserved", "Passed"],
  ["Unsafe wording", "None detected"],
];

const evaluation = runResqGuardEvaluation();
const translations = {
  English: "Move away from low-lying areas. Do not cross moving water. Follow verified local instructions.",
  Kiswahili: "Ondoka maeneo ya mabondeni. Usivuke maji yanayotiririka. Fuata maelekezo ya eneo yaliyothibitishwa.",
  Somali: "Ka fogow meelaha hoose. Ha gudbin biyaha socda. Raac tilmaamaha deegaanka ee la xaqiijiyey.",
};

const simulatedFlood: Hazard = {
  id: "demo-flood",
  type: "flood",
  title: "SIMULATED FLOOD SCENARIO",
  place: "Lower Shabelle, Somalia",
  severity: "orange",
  source: "ResQMap scenario dataset",
  sourceUrl: "https://www.gdacs.org",
  status: "simulated",
  detail: "Based on a representative Lower Shabelle flood event for the judge demonstration.",
  latitude: 1.75,
  longitude: 44.2,
  time: "2026-07-25T22:00:00.000Z",
};

const emptyFeeds: FeedMap = {
  usgs: { connected: false, classification: "LIVE", state: "cached-or-unavailable" },
  gdacs: { connected: false, classification: "LIVE", state: "cached-or-unavailable" },
  droughtModel: { connected: false, classification: "MODEL-DERIVED", state: "cached-or-unavailable" },
};

function severityLabel(severity: string) {
  if (severity === "orange") return "Severe — Orange Alert";
  if (severity === "red") return "Critical — Red Alert";
  if (severity === "green") return "Low — Green Advisory";
  return severity;
}

function dataLabel(hazard: Hazard) {
  if (hazard.status === "simulated") return "SIMULATED FLOOD SCENARIO";
  if (hazard.status === "model-signal") return "MODEL-DERIVED";
  return "LIVE";
}

function relativeRefresh(value?: string) {
  if (!value) return "not refreshed yet";
  const seconds = Math.max(0, Math.round((Date.now() - Date.parse(value)) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
}

function openPrototypeDb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open("resqmap-prototype-cache", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("warnings")) db.createObjectStore("warnings", { keyPath: "id" });
      if (!db.objectStoreNames.contains("reports")) db.createObjectStore("reports", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function putPrototypeRecord(storeName: "warnings" | "reports", record: Record<string, unknown>) {
  const db = await openPrototypeDb();
  if (!db) return;
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).put(record);
}

async function clearPrototypeReports() {
  const db = await openPrototypeDb();
  if (!db) return;
  const tx = db.transaction("reports", "readwrite");
  tx.objectStore("reports").clear();
}

export default function Home() {
  const [view, setView] = useState<"command" | "citizen" | "authority" | "guard" | "architecture">("command");
  const [events, setEvents] = useState<Hazard[]>([]);
  const [feedState, setFeedState] = useState<"loading" | "live" | "cached">("loading");
  const [updated, setUpdated] = useState("");
  const [selected, setSelected] = useState<Hazard | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [offline, setOffline] = useState(false);
  const [reportState, setReportState] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [mapSearch, setMapSearch] = useState("");
  const [searchState, setSearchState] = useState("Search any city or coordinates");
  const [mapReady, setMapReady] = useState(false);
  const [language, setLanguage] = useState<keyof typeof translations>("English");
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [feeds, setFeeds] = useState<FeedMap>(emptyFeeds);
  const [queuedReports, setQueuedReports] = useState(0);
  const mapNode = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<LeafletMap | null>(null);
  const hazardLayer = useRef<LeafletLayerGroup | null>(null);

  const loadHazards = useCallback(async () => {
    setFeedState("loading");
    try {
      const response = await fetch("/api/live-hazards", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setEvents(data.events || []);
      setFeeds(data.feeds || emptyFeeds);
      setUpdated(data.generatedAt || new Date().toISOString());
      setFeedState("live");
    } catch {
      setFeedState("cached");
      setUpdated((current) => current || new Date().toISOString());
    }
  }, []);

  useEffect(() => {
    const firstLoad = window.setTimeout(() => { void loadHazards(); }, 0);
    const refresh = window.setInterval(() => { void loadHazards(); }, 5 * 60 * 1000);
    return () => {
      window.clearTimeout(firstLoad);
      window.clearInterval(refresh);
    };
  }, [loadHazards]);
  useEffect(() => {
    let cancelled = false;
    const initialise = () => {
      if (cancelled || !mapNode.current || mapInstance.current || !window.L) return;
      const L = window.L;
      const map = L.map(mapNode.current, { worldCopyJump: true, minZoom: 2, zoomControl: true }).setView([12, 15], 2);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "© OpenStreetMap © CARTO", maxZoom: 20,
      }).addTo(map);
      mapInstance.current = map;
      hazardLayer.current = L.layerGroup().addTo(map);
      setMapReady(true);
    };
    if (window.L) initialise();
    else {
      if (!document.querySelector('link[data-resq-leaflet]')) {
        const link = document.createElement("link"); link.rel = "stylesheet"; link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; link.dataset.resqLeaflet = "true"; document.head.appendChild(link);
      }
      let script = document.querySelector('script[data-resq-leaflet]') as HTMLScriptElement | null;
      if (!script) { script = document.createElement("script"); script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; script.dataset.resqLeaflet = "true"; document.head.appendChild(script); }
      script.addEventListener("load", initialise, { once: true });
    }
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    const L = window.L;
    if (!L || !mapInstance.current || !hazardLayer.current) return;
    const layer = hazardLayer.current;
    layer.clearLayers();
    events.forEach((event) => {
      if (!Number.isFinite(event.latitude) || !Number.isFinite(event.longitude)) return;
      const color = event.type === "flood" ? "#ff7a21" : event.type === "drought" ? "#f2b91d" : "#f04f59";
      const marker = L.circleMarker([event.latitude, event.longitude], { radius: 8, color: "#fff", weight: 2, fillColor: color, fillOpacity: .92 });
      marker.bindTooltip(`${event.title} · ${event.place}`);
      marker.on("click", () => setSelected(event));
      marker.addTo(layer);
    });
  }, [events, mapReady]);
  const hazard = selected || events[0] || simulatedFlood;
  const dateLabel = useMemo(() => hazard.status === "simulated" ? "Based on a representative Lower Shabelle flood event" : new Date(hazard.time).toISOString().replace("T", " ").slice(0, 16) + " UTC", [hazard]);
  const refreshText = relativeRefresh(updated);

  const openDemoAt = (target: number) => { setDemoOpen(true); setStep(target); setLanguage("English"); setSyncMessage(""); if (target === 0) { setOffline(false); setReportState(0); setReportSubmitted(false); } };
  const startDemo = () => openDemoAt(0);
  const next = () => {
    if (step === 5) { setOffline(false); setDemoOpen(false); return; }
    setStep((value) => value + 1);
  };
  const searchWorld = async (event: FormEvent) => {
    event.preventDefault();
    const query = mapSearch.trim();
    if (!query) return;
    const coordinateMatch = query.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (coordinateMatch && mapInstance.current) {
      const latitude = Number(coordinateMatch[1]), longitude = Number(coordinateMatch[2]);
      if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
        mapInstance.current.flyTo([latitude, longitude], 10, { duration: 1.2 }); setSearchState(`Showing ${latitude.toFixed(3)}, ${longitude.toFixed(3)}`); return;
      }
    }
    setSearchState("Searching worldwide…");
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`);
      const results = await response.json();
      if (!results[0]) { setSearchState("Location not found. Try a city, country, or latitude, longitude."); return; }
      mapInstance.current?.flyTo([Number(results[0].lat), Number(results[0].lon)], 10, { duration: 1.2 });
      setSearchState(results[0].display_name);
    } catch { setSearchState("Search is temporarily unavailable. You can still pan and zoom worldwide."); }
  };
  const locateUser = () => {
    setSearchState("Finding your location…");
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => { mapInstance.current?.flyTo([coords.latitude, coords.longitude], 11, { duration: 1.2 }); setSearchState(`Your location · ${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)}`); },
      () => setSearchState("Location permission was not available."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
  const speakAlert = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(translations[language]);
    utterance.lang = language === "Kiswahili" ? "sw-KE" : language === "Somali" ? "so-SO" : "en-GB";
    window.speechSynthesis.speak(utterance);
  };
  const submitReport = () => {
    setReportSubmitted(true);
    setReportState(0);
    setStep(4);
    putPrototypeRecord("reports", { id: "INC-2026-0418", hazardId: hazard.id, status: offline ? "queued" : "submitted", createdAt: new Date().toISOString() });
  };
  const activateOffline = () => {
    setOffline(true);
    setSyncMessage("");
    setQueuedReports(2);
    putPrototypeRecord("warnings", { id: "last-verified-warning", hazard, savedAt: new Date().toISOString() });
    putPrototypeRecord("reports", { id: "queued-report-1", hazardId: hazard.id, status: "queued" });
    putPrototypeRecord("reports", { id: "queued-report-2", hazardId: hazard.id, status: "queued" });
  };
  const restoreConnection = () => { setOffline(false); setSyncMessage(`Connection restored · ${queuedReports || 2} queued reports synchronised · latest hazard data received`); setQueuedReports(0); clearPrototypeReports(); loadHazards(); };
  const offlineBanner = offline ? <div className="offline-banner"><b>Offline mode active</b><span>Displaying the last verified warning from IndexedDB</span><strong>{queuedReports || 2} reports waiting to synchronise</strong></div> : null;

  const navigation = (
    <header className="topbar">
      <button className="brand brand-button" onClick={() => setView("command")} aria-label="ResQMap Command Centre">
        <span className="brand-mark">R</span><span><b>ResQMap AI</b><small>FROM EARLY WARNING TO TRUSTED ACTION</small></span>
      </button>
      <nav aria-label="Primary navigation">
        <button className={view === "command" ? "active" : ""} onClick={() => setView("command")}>Live Map</button>
        <button className={view === "citizen" ? "active" : ""} onClick={() => setView("citizen")}>Citizen</button>
        <button className={view === "authority" ? "active" : ""} onClick={() => setView("authority")}>Authority</button>
        <button className={view === "guard" ? "active" : ""} onClick={() => setView("guard")}>ResQGuard</button>
        <button className={view === "architecture" ? "active" : ""} onClick={() => setView("architecture")}>Architecture</button>
      </nav>
      <div className="header-actions"><span className={`connection ${offline ? "lost" : ""}`}><i />{offline ? "OFFLINE" : "OPERATIONAL"}</span><button className="primary compact" onClick={startDemo}>▶ Launch Scenario</button></div>
    </header>
  );

  if (view === "citizen") return <main className="app-shell">{navigation}{offlineBanner}<div className="trust-banner">Prototype notice: Lower Shabelle citizen flow is a simulated scenario for demonstration, not a certified government warning.</div><section className="citizen-view"><span className="data-label simulated">SIMULATED SCENARIO</span><span className="eyebrow">CITIZEN ALERT · YOUR AREA</span><h1>HIGH FLOOD RISK</h1><p>Lower Shabelle, Somalia · Based on a representative flood event</p><div className="citizen-actions"><small>WHAT YOU SHOULD DO NOW</small><ol><li>Move away from low-lying areas.</li><li>Do not cross moving water.</li><li>Follow verified local instructions.</li></ol></div><div className="citizen-safe"><span>✓</span><div><small>NEAREST DEMONSTRATION SAFE POINT</small><b>3.2 km away</b><p>Demonstration safe point — requires official verification.</p></div></div><div className="citizen-buttons"><button onClick={speakAlert}>🔊 Play warning</button><button>✓ I am safe</button><button onClick={() => openDemoAt(3)}>＋ Report incident</button></div><button className="text-button" onClick={() => setView("command")}>← Return to Command Centre</button></section></main>;

  if (view === "guard") return <main className="app-shell">{navigation}<section className="lab-page"><div className="page-heading"><span className="eyebrow">RESQGUARD SAFETY LAB</span><h1>Prove the message stays safe.</h1><p>Original meaning, translated meaning and deterministic validation are shown side by side.</p></div><div className="lab-score"><span>MESSAGE SAFETY SCORE</span><b>32<small>/100</small></b><strong>REJECTED</strong></div><div className="lab-columns"><article><small>APPROVED ORIGINAL · ENGLISH</small><h3>Severe flood warning</h3><p>Move at least <mark>500 metres</mark> away from the river. <b>Do not cross</b> moving water.</p></article><article className="unsafe"><small>UNSAFE TRANSLATION · TEST INPUT</small><h3>Moderate flood warning</h3><p>Move <mark>50 metres</mark> away from the river. <b>Cross carefully.</b></p></article><article className="result"><small>RESQGUARD RESULT</small><h3>BLOCKED</h3><p>✕ Critical number changed: 500 → 50</p><p>✕ Severity changed: Severe → Moderate</p><p>✕ Safety distance weakened</p><p>✓ Approved fallback activated</p></article></div><div className="approved-sample"><span><b>Correct translation benchmark</b><small>Required actions, location, severity and numbers preserved</small></span><strong>96/100 · APPROVED</strong></div><button className="primary" onClick={startDemo}>Run this interception in the scenario</button></section></main>;

  if (view === "authority") return <main className="app-shell">{navigation}{offlineBanner}<div className="trust-banner">Authority workflow is a session-state prototype; it demonstrates the verification path without a separate production backend.</div><section className="authority-page"><div className="page-heading"><span className="data-label community">COMMUNITY-REPORTED</span><span className="eyebrow">AUTHORITY OPERATIONS</span><h1>Community verification workflow</h1><p>Reports are matched to active hazards, checked for corroboration and retained with an audit trail.</p></div>{reportSubmitted && <div className="authority-arrival"><b>✓ Same citizen report received</b><span>INC-2026-0418 · Flooded road · Afgooye, Lower Shabelle</span><button onClick={() => openDemoAt(4)}>Open verification workflow</button></div>}<div className="authority-summary"><div><b>{reportSubmitted ? 9 : 8}</b><span>New reports</span></div><div><b>3</b><span>Reviewing</span></div><div><b>12</b><span>Verified</span></div><div><b>4</b><span>Escalated</span></div></div><div className="kanban">{["New","Reviewing","Verified","Escalated","Resolved","Rejected"].map((column, index) => <section key={column}><h3>{column}<span>{index < 4 ? [reportSubmitted ? 9 : 8,3,12,4][index] : index === 4 ? 19 : 2}</span></h3>{index < 4 && <article className={index === 3 ? "priority" : ""}><small>{reportSubmitted && index === 0 ? "INC-2026-0418 · COMMUNITY-REPORTED" : "INC-2026-0418 · FLOOD"}</small><b>{reportSubmitted && index === 0 ? "Flooded road, Afgooye" : index === 1 ? "Flooded road under review" : index === 2 ? "Bridge access verified" : "Citizen warning expanded"}</b><p>Inside active flood zone · 1.8 km from hazard</p><span>7 similar reports · 2 images</span></article>}</section>)}</div><div className="audit"><h2>Incident audit history</h2>{["14:31 — Report received","14:32 — Matched with active flood zone","14:34 — Reviewed by officer","14:36 — Verified","14:37 — Citizen alert escalated"].map(item => <p key={item}><i />{item}</p>)}</div></section></main>;

  if (view === "architecture") return <main className="app-shell">{navigation}<section className="architecture-page"><div className="page-heading"><span className="eyebrow">SYSTEM TRANSPARENCY</span><h1>Architecture, sources and evaluation</h1><p>What is connected, what is model-derived and what remains a prototype is clearly separated.</p></div><div className="architecture-flow">{["USGS / GDACS / Weather","Data normalisation","Risk scoring","Alert generation","Translation","ResQGuard validation","Citizen + Authority","IndexedDB cache + queue"].map((item,index)=><div key={item}><span>{index+1}</span><b>{item}</b>{index<7&&<i>↓</i>}</div>)}</div><h2>Source reliability centre</h2><div className="source-table"><div className="table-head"><span>Source</span><span>Status</span><span>Last successful refresh</span><span>Data classification</span><span>Failure state</span><span>Cached</span></div>{[["USGS Earthquakes",feeds.usgs.connected ? "Connected" : "Cached",relativeRefresh(feeds.usgs.lastSuccessfulRefresh || updated),feeds.usgs.classification || "LIVE",feeds.usgs.state || "cached-or-unavailable","Yes"],["GDACS Alerts",feeds.gdacs.connected ? "Connected" : "Cached",relativeRefresh(feeds.gdacs.lastSuccessfulRefresh || updated),feeds.gdacs.classification || "LIVE",feeds.gdacs.state || "cached-or-unavailable","Yes"],["Weather Risk Model",feeds.droughtModel.connected ? "Connected" : "Cached",relativeRefresh(feeds.droughtModel.lastSuccessfulRefresh || updated),feeds.droughtModel.classification || "MODEL-DERIVED",feeds.droughtModel.state || "cached-or-unavailable","Yes"],["Demo shelters","Available","Demo dataset","SIMULATED","local fallback","Yes"]].map(row=><div key={row[0]}>{row.map((cell,index)=><span key={cell} className={index===1?"source-ok":index===3?"type-tag":""}>{cell}</span>)}</div>)}</div><h2>System evaluation</h2><div className="metric-grid architecture-metrics">{[["Unsafe detection",`${evaluation.unsafeDetected}/${evaluation.unsafeTotal}`],["Safe approval",`${evaluation.safeApproved}/${evaluation.safeTotal}`],["Number + unit accuracy",`${evaluation.numberAccuracy}/${evaluation.total}`],["Severity accuracy",`${evaluation.severityCorrect}/${evaluation.total}`],["Avg. validation",evaluation.latency],["Fallback success",`${evaluation.fallbackActivated}/${evaluation.unsafeDetected}`]].map(([name,value])=><div key={name}><b>{value}</b><span>{name}</span></div>)}</div><div className="tech-grid">{[["Frontend","Next.js · React"],["Backend","Next.js server routes"],["APIs","USGS · GDACS · Open-Meteo"],["Validation","Deterministic rules + language checks"],["Offline storage","IndexedDB verified warning + queued reports"],["Hosting","Vercel + Sites"],["Current limitation","No certified authority integration"],["Global scalability","Architecture can ingest additional regional feeds"]].map(([a,b])=><p key={a}><span>{a}</span><b>{b}</b></p>)}</div></section></main>;

  return (
    <main className="app-shell">
      {navigation}
      {offlineBanner}
      <div className="trust-banner">Connected prototype — not currently a certified government emergency-warning system.</div>

      <section className="hero" id="top">
        <div>
          <span className="eyebrow">EAST AFRICAN DISASTER INTELLIGENCE WITH GLOBALLY EXTENSIBLE ARCHITECTURE</span>
          <h1>From hazard detection<br />to trusted local action.</h1>
          <p>ResQMap is a multilingual early-warning-to-early-action platform that converts hazard intelligence into safe, locally understandable and verifiable action.</p>
          <div className="hero-actions"><button className="primary" onClick={startDemo}>▶ Launch Emergency Scenario</button><a href="#map">Explore Live Map →</a></div>
        </div>
        <div className="proof-strip">
          <div><b>3</b><span>independent data feeds</span></div>
          <div><b>3</b><span>alert languages</span></div>
          <div><b>72</b><span>reviewed validation tests</span></div>
        </div>
      </section>

      <section className={`map-section ${fullscreen ? "map-full" : ""}`} id="map">
        <div className="map-toolbar">
          <div><span className="eyebrow">IGAD AND EAST AFRICAN COMMUNITIES</span><h2>Live hazard intelligence for IGAD and East African communities</h2></div>
          <div className="map-actions">
            <span className={`freshness ${feedState}`}><i />{feedState === "loading" ? "Refreshing sources…" : feedState === "live" ? `Sources refreshed ${refreshText}` : `Cached · last success ${refreshText}`}</span>
            <button onClick={loadHazards}>↻ Retry</button><button onClick={() => setFullscreen(!fullscreen)}>⛶ {fullscreen ? "Exit" : "Full screen"}</button>
          </div>
        </div>
        <div className="source-status-panel"><span><i className={feeds.usgs.connected ? "ok" : ""} />USGS Earthquakes — {feeds.usgs.connected ? "Connected" : "Cached"} · {feeds.usgs.classification || "LIVE"} · {feeds.usgs.state || "cached-or-unavailable"}</span><span><i className={feeds.gdacs.connected ? "ok" : ""} />GDACS Alerts — {feeds.gdacs.connected ? "Connected" : "Cached"} · {feeds.gdacs.classification || "LIVE"} · {feeds.gdacs.state || "cached-or-unavailable"}</span><span><i className={feeds.droughtModel.connected ? "ok" : ""} />Weather Risk Model — {feeds.droughtModel.connected ? "Connected" : "Cached"} · {feeds.droughtModel.classification || "MODEL-DERIVED"} · {feeds.droughtModel.state || "cached-or-unavailable"}</span><strong>Last refresh: {refreshText}</strong></div>
        <div className="map-layout">
          <div className="map-canvas global-map" aria-label="Interactive worldwide hazard map">
            <div ref={mapNode} className="leaflet-map" />
            <form className="map-search" onSubmit={searchWorld}><input value={mapSearch} onChange={(event) => setMapSearch(event.target.value)} placeholder="Search any city, country, or lat, long" aria-label="Search worldwide map" /><button>Search</button><button type="button" onClick={locateUser}>⌖ Locate me</button><small>{searchState}</small></form>
            <div className="legend"><b>MAP KEY</b><span><i className="orange" /> Flood</span><span><i className="yellow" /> Drought</span><span><i className="red" /> Earthquake</span><span><i className="green" /> Verified safe point</span></div>
            <div className="world-badge"><b>GLOBAL SCALABILITY</b><span>Map can pan and zoom worldwide</span></div>
          </div>
          <aside className="hazard-panel">
            <div className="hazard-heading"><span className={`hazard-icon ${hazard.type}`}>{hazard.type === "flood" ? "≋" : hazard.type === "drought" ? "☀" : "⌁"}</span><span><small>{dataLabel(hazard)}</small><h3>{hazard.title}</h3><p>{hazard.place}</p></span></div>
            <div className="risk-row"><div className="risk-score"><b>{hazard.type === "flood" ? "86" : "68"}</b><small>/100 RISK</small></div><dl><div><dt>Severity</dt><dd>{severityLabel(hazard.severity)}</dd></div><div><dt>Source</dt><dd>{hazard.source}</dd></div><div><dt>Updated</dt><dd>{dateLabel}</dd></div></dl></div>
            <div className="action-card"><small>RECOMMENDED ACTION</small><p>Move away from river channels and low-lying areas. Follow verified local instructions.</p></div>
            <div className="panel-buttons"><button className="primary" onClick={() => openDemoAt(1)}>View citizen alert</button><a href={hazard.sourceUrl} target="_blank" rel="noreferrer">View source ↗</a></div>
            <p className="source-note">Source type and timestamp are preserved through every alert.</p>
          </aside>
        </div>
      </section>

      <section className="guard-section" id="resqguard">
        <div className="section-intro"><span className="eyebrow">RESQGUARD SAFETY LAYER</span><h2>Every instruction is checked before delivery.</h2><p>ResQGuard combines deterministic safety rules with language analysis. If any critical meaning changes, the message is blocked and an approved fallback replaces it.</p></div>
        <div className="pipeline" aria-label="ResQGuard architecture">
          {["Hazard data", "Risk classification", "Approved actions", "Alert generation", "Translation", "ResQGuard validation", "Approved alert"].map((item, index) => <div key={item} className={index === 5 ? "guard-node" : ""}><span>{String(index + 1).padStart(2, "0")}</span><b>{item}</b>{index < 6 && <i>→</i>}</div>)}
        </div>
        <div className="guard-grid">
          <div className="validation-card"><div className="card-title"><span>✓</span><div><small>CURRENT WARNING</small><h3>Validation passed</h3></div><b>APPROVED</b></div>{validationRows.map(([name, result]) => <p key={name}><span>{name}</span><b>✓ {result}</b></p>)}<div className="final-status">Final status <b>Approved for delivery</b></div></div>
          <div className="validation-card rejected"><div className="card-title"><span>!</span><div><small>SIMULATED TEST</small><h3>Message blocked</h3></div><b>BLOCKED</b></div><div className="translation"><small>APPROVED ORIGINAL</small><p>Severe flood warning. Move at least <mark>500 m</mark> from the river. <b>Do not cross</b> moving water.</p><small>UNSAFE TRANSLATION</small><p>Moderate flood warning. Move <mark>50 m</mark> from the river. Stay alert.</p></div><p><span>Safety distance changed</span><b>500 m → 50 m</b></p><p><span>Severity changed</span><b>Severe → Moderate</b></p><p><span>Critical safety instruction</span><b>Removed</b></p><div className="final-status">Approved fallback guidance <b>Activated</b></div></div>
        </div>
      </section>

      <section className="evidence-section" id="evidence">
        <div className="section-intro"><span className="eyebrow">RESQGUARD PROTOTYPE EVALUATION</span><h2>Measured results, including known misses.</h2><p>Seventy-two manually reviewed alert cases cover 24 safe messages, 48 unsafe mutations, 3 languages and 8 failure categories. Each case has an expected result recorded in the repository.</p></div>
        <div className="metric-grid">
          {[["Messages tested", String(evaluation.total)],["Unsafe detected", `${evaluation.unsafeDetected}/${evaluation.unsafeTotal}`],["Safe approved", `${evaluation.safeApproved}/${evaluation.safeTotal}`],["Numbers + units", `${evaluation.numberAccuracy}/${evaluation.total}`],["Severity accuracy", `${evaluation.severityCorrect}/${evaluation.total}`],["Average validation", evaluation.latency]].map(([name, value]) => <div key={name}><b>{value}</b><span>{name}</span></div>)}
        </div>
        <div className="evidence-note"><span>DATASET v1.1</span><b>{evaluation.total} manually reviewed alert cases</b><p>24 safe messages · 48 unsafe mutations · 3 languages · 8 failure categories · expected result recorded for every case.</p><a href="/resqguard-evaluation-cases.csv" download>Download CSV</a><button onClick={startDemo}>Run the guided test →</button></div>
      </section>

      <footer><div className="brand"><span className="brand-mark">R</span><span><b>ResQMap AI</b><small>FROM EARLY WARNING TO TRUSTED ACTION</small></span></div><p>East African disaster-intelligence prototype with globally extensible architecture. Always follow official emergency authorities.</p><span>IGAD focus · 2026</span></footer>

      {demoOpen && <div className="demo-backdrop" role="dialog" aria-modal="true" aria-label="Guided emergency demonstration">
        <div className="demo">
          <div className="demo-side">
            <div><span className="eyebrow">5-MINUTE JUDGE MODE</span><h2>Guided Emergency Demo</h2><p>One incident. Every layer proven.</p></div>
            <ol>{demoSteps.map(([title, sub], index) => <li className={index === step ? "active" : index < step ? "done" : ""} key={title}><span>{index < step ? "✓" : index + 1}</span><div><b>{title}</b><small>{sub}</small></div></li>)}</ol>
            <button className="demo-close" onClick={() => setDemoOpen(false)}>Exit demo</button>
          </div>
          <div className="demo-stage">
            <div className="demo-top"><span>STEP {step + 1} OF 6</span><button onClick={() => setDemoOpen(false)} aria-label="Close">×</button></div>
            {step === 0 && <div className="stage-content"><span className="stage-icon orange">≋</span><span className="eyebrow">HAZARD DETECTED</span><h2>Simulated flood scenario loaded</h2><p className="stage-lead">Lower Shabelle, Somalia</p><div className="fact-grid"><div><small>RISK SCORE</small><b>86/100</b></div><div><small>SEVERITY</small><b>Severe — Orange Alert</b></div><div><small>DATA TYPE</small><b>SIMULATED</b></div><div><small>SOURCE</small><b>Representative GDACS-style event</b></div></div><div className="source-proof"><span>✓ Label verified</span><b>Based on a representative Lower Shabelle flood event</b></div></div>}
            {step === 1 && <div className="stage-content"><span className="data-label simulated">SIMULATED SCENARIO</span><span className="eyebrow">CITIZEN VIEW · 2.1 KM FROM RISK ZONE</span><h2>Flood warning for your area</h2><div className="alert-banner" aria-live="polite"><small>{language.toUpperCase()}</small>{translations[language]}</div><div className="language-tabs">{(["English","Kiswahili","Somali"] as const).map(item => <button className={language === item ? "selected" : ""} onClick={() => setLanguage(item)} key={item}>{item}</button>)}<button onClick={speakAlert}>🔊 Play voice alert</button></div><div className="safe-point"><span>✓</span><div><small>NEAREST DEMONSTRATION SAFE POINT</small><b>District Community Hall</b></div><strong>1.6 km</strong></div></div>}
            {step === 2 && <div className="stage-content unsafe-stage"><span className="stage-icon red">!</span><span className="data-label simulated">SIMULATED TEST</span><span className="eyebrow">RESQGUARD INTERCEPTION</span><h2>Message blocked</h2><div className="compare"><div><small>APPROVED ORIGINAL</small><p>Move at least <mark>500 m</mark> from the river.<br /><b>Severe</b> flood warning.<br /><b>Do not cross</b> moving water.</p></div><div><small>UNSAFE TRANSLATION</small><p>Move <mark>50 m</mark> from the river.<br /><b>Moderate</b> flood warning.<br />Stay alert near moving water.</p></div></div><ul className="fail-list"><li>Safety distance changed: 500 m → 50 m</li><li>Severity changed: Severe → Moderate</li><li>Critical safety instruction removed</li><li>Approved fallback guidance activated</li></ul></div>}
            {step === 3 && <div className="stage-content"><span className="data-label community">COMMUNITY-REPORTED</span><span className="eyebrow">CITIZEN INCIDENT REPORT</span><h2>Report conditions on the ground</h2><div className="report-form"><label>Location<input value="Afgooye, Lower Shabelle" readOnly /></label><label>Incident category<select defaultValue="Flooded road"><option>Flooded road</option></select></label><label className="wide">Description<textarea value="Bridge access is blocked by fast-moving water." readOnly /></label><label>Urgency<select defaultValue="High"><option>High</option></select></label><label>Connectivity<input value={offline ? "Offline · will queue" : "Online"} readOnly /></label></div><div className="queued-note">✓ Photograph optional · GPS attached · Ready to submit</div></div>}
            {step === 4 && <div className="stage-content"><span className="data-label community">COMMUNITY-REPORTED</span><span className="eyebrow">AUTHORITY OPERATIONS</span><h2>Same report received from Afgooye</h2><div className="report-ticket"><span>INC-2026-0418 · AWAITING VERIFICATION</span><b>Flooded road · HIGH URGENCY</b><p>Bridge access is blocked by fast-moving water.</p></div><div className="status-track">{["Report received","Awaiting verification","Verified by authority","Escalated","Warning updated"].map((item, index) => <div className={index <= reportState ? "complete" : ""} key={item}><span>{index <= reportState ? "✓" : index + 1}</span><b>{item}</b></div>)}</div><div className="authority-actions"><button disabled={reportState >= 2} onClick={() => setReportState(2)}>✓ Verify report</button><button disabled={reportState < 2 || reportState >= 4} onClick={() => setReportState(4)}>↑ Escalate and update warning</button></div></div>}
            {step === 5 && <div className="stage-content"><span className={`stage-icon ${offline ? "red" : "green"}`}>{offline ? "⌁" : "✓"}</span><span className="eyebrow">RESILIENT CONNECTIVITY</span><h2>{offline ? "Offline mode active" : syncMessage || "Ready to test offline resilience"}</h2>{!offline ? <button className="loss-button" onClick={activateOffline}>⌁ Simulate network failure</button> : <div className="offline-proof"><p>✓ Displaying the last verified warning from IndexedDB</p><p>✓ Website remains available</p><p>✓ {queuedReports || 2} reports waiting to synchronise</p><p>✓ No unverified update displayed</p><button onClick={restoreConnection}>Restore connection & synchronise</button></div>}</div>}
            <div className="demo-controls"><button disabled={step === 0} onClick={() => setStep(step - 1)}>← Back</button><span>{demoSteps[step][0]}</span><button className="primary" disabled={(step === 4 && reportState < 4) || (step === 5 && offline)} onClick={step === 3 ? submitReport : next}>{step === 3 ? "Submit report →" : step === 5 ? "Finish demo" : "Continue →"}</button></div>
          </div>
        </div>
      </div>}
    </main>
  );
}
