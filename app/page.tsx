"use client";

import { useState } from "react";

const hazards = [
  { city: "Beledweyne", type: "Flood", level: "Orange", score: 71, action: "Move toward higher ground. Do not cross moving water." },
  { city: "Marsabit", type: "Drought", level: "Yellow", score: 48, action: "Review nearby water points and livestock movement plans." },
  { city: "Hawassa", type: "Earthquake", level: "Orange", score: 66, action: "Stay clear of damaged structures and expect aftershocks." },
  { city: "Nairobi", type: "No active hazard", level: "Green", score: 12, action: "No active hazard matches this location. Monitoring continues." },
];

const translations = {
  English: "Severe flood risk near your location. Move toward higher ground and avoid crossing moving water.",
  Kiswahili: "Hatari kubwa ya mafuriko iko karibu nawe. Elekea sehemu ya juu na usivuke maji yanayotiririka.",
  Soomaali: "Khatar daadad oo daran ayaa kuu dhow. U dhaqaaq dhul sare kana fogow biyaha socda.",
};

export default function Home() {
  const [mode, setMode] = useState<"citizen" | "authority">("citizen");
  const [selected, setSelected] = useState(0);
  const [language, setLanguage] = useState<keyof typeof translations>("English");
  const [reported, setReported] = useState(false);

  const hazard = hazards[selected];

  return (
    <main>
      <div className="ticker">
        <div><b>SIMULATED</b> — Shabelle basin flood warning · <b>LIVE</b> — East Africa earthquake feed · <b>COMMUNITY</b> — Blocked-road report awaiting review</div>
      </div>

      <header>
        <a className="brand" href="#overview" aria-label="ResQMap AI home">
          <span className="brandMark">⌾</span><span><strong>ResQMap <i>AI</i></strong><small>WATCHED BY RESQGUARD</small></span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#overview">Overview</a><a href="#map">Live Map</a><a href="#capabilities">Capabilities</a><a href="#sources">Data Sources</a>
        </nav>
        <div className="headerActions">
          <div className="modeSwitch">
            <button className={mode === "citizen" ? "active" : ""} onClick={() => setMode("citizen")}>Citizen</button>
            <button className={mode === "authority" ? "active" : ""} onClick={() => setMode("authority")}>Authority</button>
          </div>
          <span className="online">● Online</span>
        </div>
      </header>

      <section className="hero" id="overview">
        <img src="https://images.pexels.com/photos/35015627/pexels-photo-35015627/free-photo-of-red-rescue-helicopter-over-ocean-waters.jpeg?auto=compress&cs=tinysrgb&w=1600" alt="Rescue helicopter responding over floodwaters" />
        <div className="heroShade" />
        <div className="heroCopy">
          <span className="eyebrow">◉ Disaster intelligence for East Africa</span>
          <h1>Know what is happening.<br/><em>Know whether it affects you.</em></h1>
          <p>ResQMap combines trusted hazard feeds, geospatial exposure matching and community intelligence to turn complex disaster information into personal, multilingual, actionable guidance.</p>
          <div className="ctaRow"><a className="button primary" href="#map">▣ Open Live Risk Map</a><a className="button" href="#demo">▷ Run Flood Scenario</a></div>
          <div className="trust"><span>✓ ResQGuard reliability layer</span><span>⌖ Exposure matching</span><span>◎ English · Kiswahili · Somali</span></div>
        </div>
      </section>

      <section className="stats" aria-label="System status">
        <div><small>System status</small><strong><i/>Operational</strong></div>
        <div><strong>3</strong><small>Active hazards</small></div>
        <div><strong>98%</strong><small>Delivery rate</small></div>
        <div><strong>3</strong><small>Languages</small></div>
      </section>

      <section className="workspace" id="map">
        <div className="sectionIntro"><span>LIVE DECISION SUPPORT</span><h2>{mode === "citizen" ? "Does this hazard affect you?" : "Regional operations dashboard"}</h2><p>{mode === "citizen" ? "Choose a location to match it against active hazard zones." : "Monitor hazards, delivery and community intelligence across the region."}</p></div>
        {mode === "citizen" ? (
          <div className="dashboard">
            <div className="mapPanel">
              <div className="locationTabs">{hazards.map((item, index) => <button key={item.city} className={selected === index ? "active" : ""} onClick={() => setSelected(index)}>⌖ {item.city}</button>)}</div>
              <div className="mapCanvas">
                <div className="mapGrid"/><div className="land"/>
                <div className="hazardZone flood"><span>FLOOD</span></div>
                <div className="hazardZone drought"><span>DROUGHT</span></div>
                <div className={`person p${selected}`} aria-label={`Selected location ${hazard.city}`}><b>●</b><span>{hazard.city}</span></div>
                <div className="mapLegend"><span><i className="teal"/>Flood</span><span><i className="amber"/>Drought</span><span><i className="white"/>Your location</span></div>
              </div>
            </div>
            <div className={`alertPanel ${hazard.level.toLowerCase()}`}>
              <div className="alertTop"><span>{hazard.level} alert</span><strong>{hazard.score}<small>/100</small></strong></div>
              <h3>{hazard.type} — {hazard.city}</h3>
              <div className="languageTabs">{Object.keys(translations).map((lang) => <button key={lang} className={language === lang ? "active" : ""} onClick={() => setLanguage(lang as keyof typeof translations)}>{lang}</button>)}</div>
              <p className="guidance">{selected === 0 ? translations[language] : hazard.action}</p>
              <ul><li>Follow official guidance and verified evacuation routes.</li><li>Nearest safe point: Community School Shelter · 2.4 km</li><li>This warning has passed ResQGuard safety checks.</li></ul>
              <button className="button primary full">Acknowledge alert</button>
              <div className="guardCard"><b>✓ ResQGuard verified</b><span>Actions present · numbers preserved · source current</span></div>
            </div>
          </div>
        ) : (
          <div className="authority">
            <div className="authorityStats"><article><strong>12,480</strong><span>People in warning zones</span></article><article><strong>3</strong><span>Active hazards</span></article><article><strong>98%</strong><span>Delivery rate</span></article><article><strong>2</strong><span>Reports pending</span></article></div>
            <div className="operations"><div><h3>Active hazard events</h3>{hazards.slice(0,3).map((h) => <article key={h.city}><i className={h.level.toLowerCase()}/><span><b>{h.type}</b><small>{h.city} · Score {h.score}</small></span><button>Review</button></article>)}</div><div><h3>ResQGuard reliability centre</h3><div className="guardLarge"><b>All delivery checks operational</b><p>Unsafe translations are blocked automatically and replaced with approved fallback guidance.</p><button className="button">Run safety demo</button></div></div></div>
          </div>
        )}
      </section>

      <section className="how" id="capabilities">
        <div className="sectionIntro"><span>HOW IT WORKS</span><h2>From hazard detection to personal guidance.</h2><p>Every alert is checked before it reaches a community.</p></div>
        <div className="steps">{[
          ["01","Hazard detected","Trusted flood, drought and earthquake feeds enter ResQMap with clear source labels."],
          ["02","Exposure matched","Geospatial checks determine whether a person is inside or near a hazard zone."],
          ["03","ResQGuard checks it","Missing actions, unsafe translations and stale information are blocked."],
          ["04","Guidance delivered","People receive clear actions in English, Kiswahili or Somali."],
        ].map(([n,t,p]) => <article key={n}><span>{n}</span><h3>{t}</h3><p>{p}</p></article>)}</div>
      </section>

      <section className="region">
        <div><span className="eyebrow">Built for the IGAD region</span><h2>One platform.<br/>Millions of lives protected.</h2><p>Early warning designed for Somalia, Kenya, Ethiopia, Djibouti, Eritrea, South Sudan, Sudan and Uganda.</p><div className="countries">Somalia · Kenya · Ethiopia · Djibouti · Eritrea · South Sudan · Sudan · Uganda</div></div>
        <img src="https://images.pexels.com/photos/34799620/pexels-photo-34799620/free-photo-of-stunning-landscape-of-namib-desert-dunes.jpeg?auto=compress&cs=tinysrgb&w=1000" alt="Arid African landscape where early action saves lives"/>
      </section>

      <section className="sources" id="sources">
        <div className="sectionIntro"><span>TRANSPARENT BY DESIGN</span><h2>Every source is labelled.</h2><p>Simulated data is never shown as live.</p></div>
        <div className="sourceCards"><article><i className="amber"/><h3>ResQMap Simulation</h3><small>SIMULATED · OPERATIONAL</small><p>Flood, drought and earthquake demo events for regional response exercises.</p></article><article><i className="teal"/><h3>USGS Earthquakes</h3><small>LIVE · OPERATIONAL</small><p>Reported East Africa events only — never predictions.</p></article><article><i className="yellow"/><h3>Community reports</h3><small>COMMUNITY · ACCEPTING</small><p>Citizen submissions remain unverified until authority review.</p></article></div>
      </section>

      <section className="report" id="demo">
        <div><span className="eyebrow">Community intelligence</span><h2>See something important?</h2><p>Send an observation to the regional dashboard. Reports remain clearly marked as unverified until reviewed.</p></div>
        <form onSubmit={(e) => { e.preventDefault(); setReported(true); }}>
          <label>Report type<select><option>Blocked road</option><option>Floodwater</option><option>Water shortage</option><option>Damaged building</option></select></label>
          <label>What are you seeing?<textarea placeholder="Describe what is happening and where…"/></label>
          <button className="button primary" type="submit">{reported ? "✓ Report queued for review" : "Submit community report"}</button>
        </form>
      </section>

      <footer><div className="brand"><span className="brandMark">⌾</span><span><strong>ResQMap AI</strong><small>WATCHED BY RESQGUARD</small></span></div><p>ResQMap watches hazards. ResQGuard watches ResQMap.</p><small>Built for disaster resilience across East Africa · Demonstration data is clearly labelled</small></footer>
    </main>
  );
}
