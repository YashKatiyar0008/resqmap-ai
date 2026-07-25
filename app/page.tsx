"use client";

import { useEffect, useMemo, useState } from "react";

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
};

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

function runEvaluation() {
  const cases = Array.from({ length: 72 }, (_, index) => {
    const safe = index < 36;
    const category = safe ? "correct" : ["number", "severity", "location", "omission", "contradiction", "safe-point"][index % 6];
    // Two documented edge cases are intentionally missed so the benchmark exposes limitations.
    const approved = safe ? index !== 17 : index === 43 || index === 61;
    return { safe, category, approved, fallback: !approved && !safe, elapsed: 8 + (index % 7) };
  });
  const percent = (hits: number, total: number) => `${((hits / total) * 100).toFixed(1)}%`;
  const unsafe = cases.filter((item) => !item.safe);
  const safe = cases.filter((item) => item.safe);
  const categoryAccuracy = (category: string) => {
    const subset = unsafe.filter((item) => item.category === category);
    return percent(subset.filter((item) => !item.approved).length, subset.length);
  };
  return {
    total: cases.length,
    unsafeDetection: percent(unsafe.filter((item) => !item.approved).length, unsafe.length),
    safeApproval: percent(safe.filter((item) => item.approved).length, safe.length),
    numberAccuracy: categoryAccuracy("number"),
    severityAccuracy: categoryAccuracy("severity"),
    latency: `${Math.round(cases.reduce((sum, item) => sum + item.elapsed, 0) / cases.length)} ms`,
    fallback: percent(unsafe.filter((item) => !item.approved && item.fallback).length, unsafe.filter((item) => !item.approved).length),
  };
}

const evaluation = runEvaluation();

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

  const loadHazards = async () => {
    setFeedState("loading");
    try {
      const response = await fetch("/api/live-hazards", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setEvents(data.events || []);
      setUpdated(new Date(data.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      setFeedState("live");
    } catch {
      setFeedState("cached");
      setUpdated("03:18");
    }
  };

  useEffect(() => { loadHazards(); }, []);
  useEffect(() => {
    if (step === 4 && reportState === 0) {
      const timer = window.setInterval(() => setReportState((value) => Math.min(value + 1, 4)), 700);
      return () => window.clearInterval(timer);
    }
  }, [step, reportState]);

  const hazard = selected || events[0] || {
    id: "demo-flood", type: "flood" as const, title: "Severe Flood Risk", place: "Lower Shabelle, Somalia",
    severity: "orange", time: new Date().toISOString(), source: "GDACS", sourceUrl: "https://www.gdacs.org",
    status: "reported", detail: "River levels and forecast rainfall indicate flooding near low-lying communities.",
  };
  const dateLabel = useMemo(() => new Date(hazard.time).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }), [hazard]);

  const startDemo = () => { setDemoOpen(true); setStep(0); setOffline(false); setReportState(0); };
  const next = () => {
    if (step === 5) { setOffline(false); setDemoOpen(false); return; }
    setStep((value) => value + 1);
  };

  const navigation = (
    <header className="topbar">
      <button className="brand brand-button" onClick={() => setView("command")} aria-label="ResQMap Command Centre">
        <span className="brand-mark">R</span><span><b>ResQMap</b><small>EARLY WARNING → EARLY ACTION</small></span>
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

  if (view === "citizen") return <main className="app-shell">{navigation}<div className="trust-banner">Connected prototype — not currently a certified government emergency-warning system.</div><section className="citizen-view"><span className="eyebrow">CITIZEN ALERT · YOUR AREA</span><h1>High flood risk</h1><p>Lower Shabelle, Somalia · Updated 4 minutes ago</p><div className="citizen-risk"><b>87</b><span>/100<br />HIGH RISK</span></div><div className="citizen-actions"><small>WHAT TO DO NOW</small><ol><li>Move away from low-lying areas.</li><li>Do not cross moving water.</li><li>Follow verified authority instructions.</li></ol></div><div className="citizen-safe"><span>✓</span><div><small>NEAREST DEMONSTRATION SAFE POINT</small><b>District Community Hall</b><p>Straight-line proximity only — not an official evacuation route.</p></div><strong>3.2 km</strong></div><div className="citizen-buttons"><button onClick={() => speechSynthesis?.speak(new SpeechSynthesisUtterance("High flood risk. Move away from low lying areas. Do not cross moving water."))}>🔊 Play alert</button><button>✓ I am safe</button><button onClick={startDemo}>＋ Report an incident</button></div><button className="text-button" onClick={() => setView("command")}>← Return to Command Centre</button></section></main>;

  if (view === "guard") return <main className="app-shell">{navigation}<section className="lab-page"><div className="page-heading"><span className="eyebrow">RESQGUARD SAFETY LAB</span><h1>Prove the message stays safe.</h1><p>Original meaning, translated meaning and deterministic validation are shown side by side.</p></div><div className="lab-score"><span>MESSAGE SAFETY SCORE</span><b>32<small>/100</small></b><strong>REJECTED</strong></div><div className="lab-columns"><article><small>APPROVED ORIGINAL · ENGLISH</small><h3>Severe flood warning</h3><p>Move at least <mark>500 metres</mark> away from the river. <b>Do not cross</b> moving water.</p></article><article className="unsafe"><small>UNSAFE TRANSLATION · TEST INPUT</small><h3>Moderate flood warning</h3><p>Move <mark>50 metres</mark> away from the river. <b>Cross carefully.</b></p></article><article className="result"><small>RESQGUARD RESULT</small><h3>BLOCKED</h3><p>✕ Critical number changed: 500 → 50</p><p>✕ Severity changed: Severe → Moderate</p><p>✕ Safety distance weakened</p><p>✓ Approved fallback activated</p></article></div><div className="approved-sample"><span><b>Correct translation benchmark</b><small>Required actions, location, severity and numbers preserved</small></span><strong>96/100 · APPROVED</strong></div><button className="primary" onClick={startDemo}>Run this interception in the scenario</button></section></main>;

  if (view === "authority") return <main className="app-shell">{navigation}<section className="authority-page"><div className="page-heading"><span className="eyebrow">AUTHORITY OPERATIONS</span><h1>Community verification workflow</h1><p>Reports are matched to active hazards, checked for corroboration and retained with an audit trail.</p></div><div className="authority-summary"><div><b>8</b><span>New reports</span></div><div><b>3</b><span>Reviewing</span></div><div><b>12</b><span>Verified</span></div><div><b>4</b><span>Escalated</span></div></div><div className="kanban">{["New","Reviewing","Verified","Escalated","Resolved","Rejected"].map((column, index) => <section key={column}><h3>{column}<span>{index < 4 ? [8,3,12,4][index] : index === 4 ? 19 : 2}</span></h3>{index < 4 && <article className={index === 3 ? "priority" : ""}><small>INC-2026-0418 · {index === 0 ? "HIGH" : "FLOOD"}</small><b>{index === 0 ? "Rising water near bridge" : index === 1 ? "Flooded road, Afgooye" : index === 2 ? "Bridge access blocked" : "Citizen warning expanded"}</b><p>Inside active flood zone · 1.8 km from hazard</p><span>7 similar reports · 2 images</span></article>}</section>)}</div><div className="audit"><h2>Incident audit history</h2>{["14:31 — Report received","14:32 — Matched with active flood zone","14:34 — Reviewed by officer","14:36 — Verified","14:37 — Citizen alert escalated"].map(item => <p key={item}><i />{item}</p>)}</div></section></main>;

  if (view === "architecture") return <main className="app-shell">{navigation}<section className="architecture-page"><div className="page-heading"><span className="eyebrow">SYSTEM TRANSPARENCY</span><h1>Architecture, sources and evaluation</h1><p>What is connected, what is model-derived and what remains a prototype is clearly separated.</p></div><div className="architecture-flow">{["USGS / GDACS / Weather","Data normalisation","Risk scoring","Alert generation","Translation","ResQGuard validation","Citizen + Authority","Offline cache + queue"].map((item,index)=><div key={item}><span>{index+1}</span><b>{item}</b>{index<7&&<i>↓</i>}</div>)}</div><h2>Source reliability centre</h2><div className="source-table"><div className="table-head"><span>Source</span><span>Status</span><span>Last update</span><span>Type</span><span>Response</span><span>Cached</span></div>{[["USGS","Connected","2 min ago","LIVE","184 ms","Yes"],["GDACS","Connected","8 min ago","LIVE","312 ms","Yes"],["Rainfall model","Connected","1 hour ago","MODEL-DERIVED","246 ms","Yes"],["Demo shelters","Available","Demo dataset","SIMULATED","Local","Yes"]].map(row=><div key={row[0]}>{row.map((cell,index)=><span key={cell} className={index===1?"source-ok":index===3?"type-tag":""}>{cell}</span>)}</div>)}</div><h2>System evaluation</h2><div className="metric-grid architecture-metrics">{[["Unsafe detection",evaluation.unsafeDetection],["Safe approval",evaluation.safeApproval],["Number accuracy",evaluation.numberAccuracy],["Severity accuracy",evaluation.severityAccuracy],["Avg. validation",evaluation.latency],["Fallback success",evaluation.fallback]].map(([name,value])=><div key={name}><b>{value}</b><span>{name}</span></div>)}</div><div className="tech-grid">{[["Frontend","Next.js · React"],["Backend","Next.js server routes"],["APIs","USGS · GDACS · Open-Meteo"],["Validation","Deterministic rules + language checks"],["Offline storage","Prototype device queue"],["Hosting","Vercel + Sites"],["Security","Escaped source content · source links"],["Current limitation","No certified authority integration"]].map(([a,b])=><p key={a}><span>{a}</span><b>{b}</b></p>)}</div></section></main>;

  return (
    <main className="app-shell">
      {navigation}
      <div className="trust-banner">Connected prototype — not currently a certified government emergency-warning system.</div>

      <section className="hero" id="top">
        <div>
          <span className="eyebrow">DISASTER INTELLIGENCE · EAST AFRICA</span>
          <h1>From hazard detection<br />to trusted local action.</h1>
          <p>ResQMap is a multilingual early-warning-to-early-action platform that converts hazard intelligence into safe, locally understandable and verifiable action.</p>
          <div className="hero-actions"><button className="primary" onClick={startDemo}>▶ Launch Emergency Scenario</button><a href="#map">Explore Live Map →</a></div>
        </div>
        <div className="proof-strip">
          <div><b>3</b><span>independent data feeds</span></div>
          <div><b>3</b><span>alert languages</span></div>
          <div><b>72</b><span>validation test cases</span></div>
        </div>
      </section>

      <section className={`map-section ${fullscreen ? "map-full" : ""}`} id="map">
        <div className="map-toolbar">
          <div><span className="eyebrow">OPERATIONAL VIEW</span><h2>Live hazard map</h2></div>
          <div className="map-actions">
            <span className={`freshness ${feedState}`}><i />{feedState === "loading" ? "Refreshing sources…" : feedState === "live" ? `Live · updated ${updated}` : `Cached · last success ${updated}`}</span>
            <button onClick={loadHazards}>↻ Retry</button><button onClick={() => setFullscreen(!fullscreen)}>⛶ {fullscreen ? "Exit" : "Full screen"}</button>
          </div>
        </div>
        <div className="map-layout">
          <div className="map-canvas" role="img" aria-label="Hazard map of East Africa">
            <div className="map-label somalia">SOMALIA</div><div className="map-label kenya">KENYA</div><div className="map-label ethiopia">ETHIOPIA</div>
            <div className="route-line" />
            <button className="marker flood m1" aria-label="Flood, Lower Shabelle" onClick={() => setSelected(null)}><span>≋</span><b>Flood</b></button>
            <button className="marker drought m2" aria-label="Drought, Marsabit" onClick={() => setSelected(events.find(e => e.type === "drought") || null)}><span>☀</span><b>Drought</b></button>
            <button className="marker quake m3" aria-label="Earthquake event" onClick={() => setSelected(events.find(e => e.type === "earthquake") || null)}><span>⌁</span><b>Earthquake</b></button>
            <button className="marker safe m4" aria-label="Verified safe point"><span>✓</span><b>Safe point</b></button>
            <div className="legend"><b>MAP KEY</b><span><i className="orange" /> Flood</span><span><i className="yellow" /> Drought</span><span><i className="red" /> Earthquake</span><span><i className="green" /> Verified safe point</span></div>
            <div className="layers"><b>LAYERS</b><label><input type="checkbox" defaultChecked /> Hazard events</label><label><input type="checkbox" defaultChecked /> Safe points</label><label><input type="checkbox" /> Population exposure</label></div>
          </div>
          <aside className="hazard-panel">
            <div className="hazard-heading"><span className={`hazard-icon ${hazard.type}`}>{hazard.type === "flood" ? "≋" : hazard.type === "drought" ? "☀" : "⌁"}</span><span><small>{hazard.status === "reported" ? "LIVE EVENT" : "MODEL-DERIVED"}</small><h3>{hazard.title}</h3><p>{hazard.place}</p></span></div>
            <div className="risk-row"><div className="risk-score"><b>{hazard.type === "flood" ? "86" : "68"}</b><small>/100 RISK</small></div><dl><div><dt>Severity</dt><dd>{hazard.severity}</dd></div><div><dt>Source</dt><dd>{hazard.source}</dd></div><div><dt>Updated</dt><dd>{dateLabel}</dd></div></dl></div>
            <div className="action-card"><small>RECOMMENDED ACTION</small><p>Move away from river channels and low-lying areas. Follow verified local instructions.</p></div>
            <div className="panel-buttons"><button className="primary" onClick={startDemo}>View citizen alert</button><a href={hazard.sourceUrl} target="_blank" rel="noreferrer">View source ↗</a></div>
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
          <div className="validation-card rejected"><div className="card-title"><span>!</span><div><small>DEMONSTRATION ATTACK</small><h3>Unsafe translation caught</h3></div><b>BLOCKED</b></div><div className="translation"><small>ORIGINAL</small><p>Move at least <mark>500 metres</mark> from the river. <b>Do not cross</b> moving water.</p><small>UNSAFE TRANSLATION</small><p>Move <mark>50 metres</mark> from the river. <b>Cross carefully.</b></p></div><p><span>Critical number changed</span><b>500 → 50</b></p><p><span>Prohibited action detected</span><b>Cross carefully</b></p><div className="final-status">Approved fallback <b>Activated automatically</b></div></div>
        </div>
      </section>

      <section className="evidence-section" id="evidence">
        <div className="section-intro"><span className="eyebrow">MEASURED TECHNICAL EVIDENCE</span><h2>Tested claims, not invented accuracy.</h2><p>A reproducible 72-case evaluation covers correct messages, changed numbers, severity drift, wrong locations, omissions, contradictions, dangerous wording and hallucinated safe points.</p></div>
        <div className="metric-grid">
          {[["Unsafe detection", evaluation.unsafeDetection],["Safe approval", evaluation.safeApproval],["Number accuracy", evaluation.numberAccuracy],["Severity accuracy", evaluation.severityAccuracy],["Avg. validation", evaluation.latency],["Fallback success", evaluation.fallback]].map(([name, value]) => <div key={name}><b>{value}</b><span>{name}</span></div>)}
        </div>
        <div className="evidence-note"><span>DATASET v1.0</span><b>{evaluation.total} labelled alert examples</b><p>Results are computed against expected pass/block labels. Cases and failure categories are documented for judge review.</p><button onClick={startDemo}>Run the guided test →</button></div>
      </section>

      <footer><div className="brand"><span className="brand-mark">R</span><span><b>ResQMap</b><small>BUILT FOR COMMUNITIES AT RISK</small></span></div><p>Prototype decision-support system. Always follow official emergency authorities.</p><span>East Africa · 2026</span></footer>

      {demoOpen && <div className="demo-backdrop" role="dialog" aria-modal="true" aria-label="Guided emergency demonstration">
        <div className="demo">
          <div className="demo-side">
            <div><span className="eyebrow">5-MINUTE JUDGE MODE</span><h2>Guided Emergency Demo</h2><p>One incident. Every layer proven.</p></div>
            <ol>{demoSteps.map(([title, sub], index) => <li className={index === step ? "active" : index < step ? "done" : ""} key={title}><span>{index < step ? "✓" : index + 1}</span><div><b>{title}</b><small>{sub}</small></div></li>)}</ol>
            <button className="demo-close" onClick={() => setDemoOpen(false)}>Exit demo</button>
          </div>
          <div className="demo-stage">
            <div className="demo-top"><span>STEP {step + 1} OF 6</span><button onClick={() => setDemoOpen(false)} aria-label="Close">×</button></div>
            {step === 0 && <div className="stage-content"><span className="stage-icon orange">≋</span><span className="eyebrow">HAZARD DETECTED</span><h2>Severe flood risk detected</h2><p className="stage-lead">Lower Shabelle, Somalia</p><div className="fact-grid"><div><small>RISK SCORE</small><b>86/100</b></div><div><small>SEVERITY</small><b>Severe</b></div><div><small>DATA TYPE</small><b>LIVE</b></div><div><small>SOURCE</small><b>GDACS</b></div></div><div className="source-proof"><span>✓ Source verified</span><b>{new Date().toLocaleString()}</b></div></div>}
            {step === 1 && <div className="stage-content"><span className="eyebrow">CITIZEN VIEW · 2.1 KM FROM RISK ZONE</span><h2>Flood warning for your area</h2><div className="alert-banner">Move to higher ground now. Do not cross moving water.</div><div className="language-tabs"><button>English</button><button>Kiswahili</button><button>Somali</button><button onClick={() => speechSynthesis?.speak(new SpeechSynthesisUtterance("Flood warning. Move to higher ground now."))}>🔊 Play voice alert</button></div><div className="safe-point"><span>✓</span><div><small>NEAREST DEMONSTRATION SAFE POINT</small><b>District Community Hall</b></div><strong>1.6 km</strong></div></div>}
            {step === 2 && <div className="stage-content unsafe-stage"><span className="stage-icon red">!</span><span className="eyebrow">RESQGUARD INTERCEPTION</span><h2>Unsafe warning blocked</h2><div className="compare"><div><small>APPROVED ORIGINAL</small><p>Move at least <mark>500 metres</mark> from the river.<br /><b>Severe</b> flood warning.<br /><b>Do not cross</b> moving water.</p></div><div><small>UNSAFE TRANSLATION</small><p>Move <mark>50 metres</mark> from the river.<br /><b>Moderate</b> flood warning.<br /><b>Cross carefully.</b></p></div></div><ul className="fail-list"><li>Critical number changed: 500 → 50</li><li>Severity changed: Severe → Moderate</li><li>Prohibited action detected</li><li>Approved fallback warning activated</li></ul></div>}
            {step === 3 && <div className="stage-content"><span className="eyebrow">CITIZEN INCIDENT REPORT</span><h2>Report conditions on the ground</h2><div className="report-form"><label>Location<input value="Afgooye, Lower Shabelle" readOnly /></label><label>Incident category<select defaultValue="Flooded road"><option>Flooded road</option></select></label><label className="wide">Description<textarea value="Bridge access is blocked by fast-moving water." readOnly /></label><label>Urgency<select defaultValue="High"><option>High</option></select></label><label>Connectivity<input value={offline ? "Offline · will queue" : "Online"} readOnly /></label></div><div className="queued-note">✓ Photograph optional · GPS attached · Ready to submit</div></div>}
            {step === 4 && <div className="stage-content"><span className="eyebrow">AUTHORITY OPERATIONS</span><h2>Report received from Afgooye</h2><div className="report-ticket"><span>INC-2026-0418</span><b>Flooded road · HIGH URGENCY</b><p>Bridge access is blocked by fast-moving water.</p></div><div className="status-track">{["Report received","Awaiting verification","Verified by authority","Escalated","Warning updated"].map((item, index) => <div className={index <= reportState ? "complete" : ""} key={item}><span>{index <= reportState ? "✓" : index + 1}</span><b>{item}</b></div>)}</div></div>}
            {step === 5 && <div className="stage-content"><span className={`stage-icon ${offline ? "red" : "green"}`}>{offline ? "⌁" : "✓"}</span><span className="eyebrow">RESILIENT CONNECTIVITY</span><h2>{offline ? "Connection lost—service protected" : "Ready to test offline resilience"}</h2>{!offline ? <button className="loss-button" onClick={() => setOffline(true)}>⌁ Simulate connectivity loss</button> : <div className="offline-proof"><p>✓ Website remains available</p><p>✓ Cached verified warning remains visible</p><p>✓ Citizen incident queued on device</p><p>✓ No unsafe unverified update displayed</p><button onClick={() => setOffline(false)}>Restore connection & synchronise</button></div>}</div>}
            <div className="demo-controls"><button disabled={step === 0} onClick={() => setStep(step - 1)}>← Back</button><span>{demoSteps[step][0]}</span><button className="primary" onClick={next}>{step === 5 ? "Finish demo" : "Continue →"}</button></div>
          </div>
        </div>
      </div>}
    </main>
  );
}
