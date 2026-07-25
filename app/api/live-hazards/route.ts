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
  status: "reported" | "model-signal";
  detail?: string;
};

const demoLocations = [
  { name: "Beledweyne, Somalia", latitude: 4.7358, longitude: 45.2036 },
  { name: "Marsabit, Kenya", latitude: 2.3347, longitude: 37.9909 },
  { name: "Hawassa, Ethiopia", latitude: 7.0504, longitude: 38.4955 },
  { name: "Nairobi, Kenya", latitude: -1.2921, longitude: 36.8219 },
];

async function getEarthquakes(): Promise<LiveEvent[]> {
  const response = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson");
  if (!response.ok) throw new Error(`USGS ${response.status}`);
  const data = await response.json() as {
    features?: Array<{
      id: string;
      geometry?: { coordinates?: number[] };
      properties?: { mag?: number; place?: string; time?: number; url?: string; status?: string };
    }>;
  };
  return (data.features ?? []).flatMap((feature) => {
    const [longitude, latitude] = feature.geometry?.coordinates ?? [];
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
    const magnitude = Number(feature.properties?.mag ?? 0);
    return [{
      id: `usgs-${feature.id}`,
      type: "earthquake" as const,
      title: `M${magnitude.toFixed(1)} earthquake`,
      place: feature.properties?.place ?? "Worldwide event",
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
  const response = await fetch("https://www.gdacs.org/contentdata/xml/gdacsAPP_Home.geojson");
  if (!response.ok) throw new Error(`GDACS ${response.status}`);
  const data = await response.json() as {
    features?: Array<{
      id?: string | number;
      geometry?: { type?: string; coordinates?: unknown };
      properties?: Record<string, unknown>;
    }>;
  };
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
      place: String(p.country ?? p.countryname ?? p.location ?? "Worldwide event"),
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
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Open-Meteo ${response.status}`);
    const data = await response.json() as {
      hourly?: { soil_moisture_0_to_7cm?: Array<number | null> };
      daily?: { precipitation_sum?: Array<number | null> };
    };
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
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    region: "Worldwide",
    live: true,
    feeds: {
      usgs: results[0].status === "fulfilled",
      gdacs: results[1].status === "fulfilled",
      droughtModel: results[2].status === "fulfilled",
    },
    events: events.sort((a, b) => Date.parse(b.time) - Date.parse(a.time)),
    disclaimer: "Reported events and model signals only. Confirm emergency instructions with local authorities.",
  }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=300" } });
}
