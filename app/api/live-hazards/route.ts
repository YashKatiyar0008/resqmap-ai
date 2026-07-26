import { NextResponse } from "next/server";

export const runtime = "edge";

type LiveEvent = {
  id: string;
  type: "earthquake" | "flood" | "drought";
  title: string;
  place: string;
  severity: string;
  time: string;
  latitude: number;
  longitude: number;
  source: string;
  sourceUrl: string;
  status: "reported" | "model-signal" | "simulated";
  detail?: string;
};

function timeoutSignal(ms = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
}

async function fetchJson<T>(input: string | URL, ms = 5000): Promise<T> {
  const timeout = timeoutSignal(ms);
  try {
    const response = await fetch(input, { signal: timeout.signal });
    if (!response.ok) throw new Error(`${String(input)} ${response.status}`);
    return await response.json() as T;
  } finally {
    timeout.clear();
  }
}

const demoLocations = [
  { name: "Beledweyne, Somalia", latitude: 4.7358, longitude: 45.2036 },
  { name: "Marsabit, Kenya", latitude: 2.3347, longitude: 37.9909 },
  { name: "Hawassa, Ethiopia", latitude: 7.0504, longitude: 38.4955 },
  { name: "Nairobi, Kenya", latitude: -1.2921, longitude: 36.8219 },
];

async function getEarthquakes(): Promise<LiveEvent[]> {
  const data = await fetchJson<{
    features?: Array<{
      id: string;
      geometry?: { coordinates?: number[] };
      properties?: { mag?: number; place?: string; time?: number; url?: string; status?: string };
    }>;
  }>("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson");
  return (data.features ?? []).flatMap((feature) => {
    const [longitude, latitude] = feature.geometry?.coordinates ?? [];
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
    const magnitude = Number(feature.properties?.mag ?? 0);
    return [{
      id: `usgs-${feature.id}`,
      type: "earthquake" as const,
      title: `M${magnitude.toFixed(1)} earthquake`,
      place: feature.properties?.place ?? "Reported event",
      severity: magnitude >= 6 ? "red" : magnitude >= 4.5 ? "orange" : "green",
      time: new Date(feature.properties?.time ?? Date.now()).toISOString(),
      latitude,
      longitude,
      source: "USGS",
      sourceUrl: feature.properties?.url ?? "https://earthquake.usgs.gov/earthquakes/feed/",
      status: "reported" as const,
      detail: `${feature.properties?.status ?? "reviewed"} event · ${magnitude.toFixed(1)} magnitude`,
    }];
  }).slice(0, 20);
}

async function getGdacsEvents(): Promise<LiveEvent[]> {
  const data = await fetchJson<{
    features?: Array<{
      id?: string | number;
      geometry?: { type?: string; coordinates?: unknown };
      properties?: Record<string, unknown>;
    }>;
  }>("https://www.gdacs.org/contentdata/xml/gdacsAPP_Home.geojson");
  return (data.features ?? []).flatMap((feature, index) => {
    const p = feature.properties ?? {};
    const eventType = String(p.eventtype ?? p.eventType ?? p.type ?? "").toUpperCase();
    if (!["FL", "DR"].includes(eventType)) return [];
    const coords = feature.geometry?.coordinates;
    let longitude = Number(p.longitude ?? p.lon ?? p.lng);
    let latitude = Number(p.latitude ?? p.lat);
    if (feature.geometry?.type === "Point" && Array.isArray(coords)) {
      longitude = Number(coords[0]);
      latitude = Number(coords[1]);
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
    const isFlood = eventType === "FL";
    const alert = String(p.alertlevel ?? p.alertLevel ?? p.alert ?? "green").toLowerCase();
    const dateValue = String(p.fromdate ?? p.fromDate ?? p.pubdate ?? p.date ?? new Date().toISOString());
    const eventId = String(p.eventid ?? p.eventId ?? feature.id ?? index);
    return [{
      id: `gdacs-${eventType}-${eventId}`,
      type: isFlood ? "flood" as const : "drought" as const,
      title: String(p.name ?? p.eventname ?? p.title ?? (isFlood ? "Flood alert" : "Drought alert")),
      place: String(p.country ?? p.countryname ?? p.location ?? "Reported event"),
      severity: ["red", "orange", "green"].includes(alert) ? alert : "green",
      time: new Date(dateValue).toString() === "Invalid Date" ? new Date().toISOString() : new Date(dateValue).toISOString(),
      latitude,
      longitude,
      source: "GDACS",
      sourceUrl: String(p.url ?? `https://www.gdacs.org/report.aspx?eventtype=${eventType}&eventid=${eventId}`),
      status: "reported" as const,
      detail: `${isFlood ? "International flood alert" : "International drought alert"} · ${alert} level`,
    }];
  }).slice(0, 30);
}

async function getDroughtSignals(): Promise<LiveEvent[]> {
  const signals = await Promise.all(demoLocations.map(async (location) => {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(location.latitude));
    url.searchParams.set("longitude", String(location.longitude));
    url.searchParams.set("hourly", "soil_moisture_0_to_7cm");
    url.searchParams.set("daily", "precipitation_sum");
    url.searchParams.set("forecast_days", "7");
    url.searchParams.set("timezone", "auto");
    const data = await fetchJson<{
      hourly?: { soil_moisture_0_to_7cm?: Array<number | null> };
      daily?: { precipitation_sum?: Array<number | null> };
    }>(url, 4500);
    const moistureValues = (data.hourly?.soil_moisture_0_to_7cm ?? []).filter((v): v is number => typeof v === "number");
    const rainValues = (data.daily?.precipitation_sum ?? []).filter((v): v is number => typeof v === "number");
    const soilMoisture = moistureValues.length ? moistureValues.reduce((a, b) => a + b, 0) / moistureValues.length : 1;
    const rain7d = rainValues.reduce((a, b) => a + b, 0);
    if (soilMoisture >= 0.18 || rain7d >= 10) return null;
    return {
      id: `meteo-drought-${location.name}`,
      type: "drought" as const,
      title: "Dry-condition signal",
      place: location.name,
      severity: soilMoisture < 0.1 ? "orange" : "green",
      time: new Date().toISOString(),
      latitude: location.latitude,
      longitude: location.longitude,
      source: "Open-Meteo forecast models",
      sourceUrl: "https://open-meteo.com/en/docs",
      status: "model-signal" as const,
      detail: `7-day rain ${rain7d.toFixed(1)} mm · surface soil moisture ${soilMoisture.toFixed(2)} m³/m³`,
    };
  }));
  return signals.filter((event): event is NonNullable<typeof event> => event !== null);
}

export async function GET() {
  const results = await Promise.allSettled([getEarthquakes(), getGdacsEvents(), getDroughtSignals()]);
  const events = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  const generatedAt = new Date().toISOString();
  return NextResponse.json({
    generatedAt,
    refreshIntervalSeconds: 300,
    region: "IGAD and East Africa, globally extensible",
    live: true,
    feeds: {
      usgs: { connected: results[0].status === "fulfilled", lastSuccessfulRefresh: generatedAt, classification: "LIVE", state: results[0].status === "fulfilled" ? "fresh" : "cached-or-unavailable" },
      gdacs: { connected: results[1].status === "fulfilled", lastSuccessfulRefresh: generatedAt, classification: "LIVE", state: results[1].status === "fulfilled" ? "fresh" : "cached-or-unavailable" },
      droughtModel: { connected: results[2].status === "fulfilled", lastSuccessfulRefresh: generatedAt, classification: "MODEL-DERIVED", state: results[2].status === "fulfilled" ? "fresh" : "cached-or-unavailable" },
    },
    events: events.sort((a, b) => Date.parse(b.time) - Date.parse(a.time)),
    disclaimer: "Reported events and model signals only. Confirm emergency instructions with local authorities.",
  }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=300" } });
}
