/**
 * Locality enrichment — compute distance from a property to key landmarks
 * (international airport + central business district) for the major metros
 * we cover. Used by the memo PDF "Locality" block.
 *
 * No external API — Haversine formula over a curated landmark dataset.
 * Trade-off: accuracy is great-circle distance, not driving distance, but
 * for memo-grade "X km away" framing this is fine.
 */

type LatLng = { lat: number; lng: number; name: string };

type CityAnchors = {
  airport: LatLng;
  cbd: LatLng;
  itHub?: LatLng;
};

// Curated landmarks. lat/lng from Google Maps centroids.
const CITY_ANCHORS: Record<string, CityAnchors> = {
  Delhi: {
    airport: { lat: 28.5562, lng: 77.1, name: "IGI Airport" },
    cbd: { lat: 28.6315, lng: 77.2167, name: "Connaught Place" },
  },
  Gurgaon: {
    airport: { lat: 28.5562, lng: 77.1, name: "IGI Airport" },
    cbd: { lat: 28.4946, lng: 77.0888, name: "Cyber City" },
  },
  Noida: {
    airport: { lat: 28.1602, lng: 77.5689, name: "Jewar (Noida Intl, upcoming)" },
    cbd: { lat: 28.5697, lng: 77.3253, name: "Sector 18 / Atta Market" },
    itHub: { lat: 28.5697, lng: 77.3853, name: "Sector 62/63 IT corridor" },
  },
  "Greater Noida": {
    airport: { lat: 28.1602, lng: 77.5689, name: "Jewar (Noida Intl, upcoming)" },
    cbd: { lat: 28.4744, lng: 77.504, name: "Pari Chowk" },
  },
  Faridabad: {
    airport: { lat: 28.5562, lng: 77.1, name: "IGI Airport" },
    cbd: { lat: 28.408, lng: 77.3185, name: "Sector 15A NIT" },
  },
  Ghaziabad: {
    airport: { lat: 28.5562, lng: 77.1, name: "IGI Airport" },
    cbd: { lat: 28.6692, lng: 77.4538, name: "Indirapuram / Vaishali" },
  },
  Mumbai: {
    airport: { lat: 19.0896, lng: 72.8656, name: "CSMI Airport" },
    cbd: { lat: 18.9322, lng: 72.8264, name: "Nariman Point" },
    itHub: { lat: 19.0682, lng: 72.8693, name: "BKC" },
  },
  Thane: {
    airport: { lat: 19.0896, lng: 72.8656, name: "CSMI Airport" },
    cbd: { lat: 19.2183, lng: 72.9781, name: "Thane Station" },
  },
  "Navi Mumbai": {
    airport: { lat: 19.0896, lng: 72.8656, name: "CSMI Airport" },
    cbd: { lat: 19.0218, lng: 73.0413, name: "Belapur CBD" },
  },
  "Mira Road": {
    airport: { lat: 19.0896, lng: 72.8656, name: "CSMI Airport" },
    cbd: { lat: 19.2842, lng: 72.8714, name: "Mira Road East" },
  },
  Bhiwandi: {
    airport: { lat: 19.0896, lng: 72.8656, name: "CSMI Airport" },
    cbd: { lat: 19.2956, lng: 73.0508, name: "Bhiwandi Town" },
  },
  Vasai: {
    airport: { lat: 19.0896, lng: 72.8656, name: "CSMI Airport" },
    cbd: { lat: 19.3919, lng: 72.8397, name: "Vasai Station" },
  },
  Bangalore: {
    airport: { lat: 13.1986, lng: 77.7066, name: "Kempegowda Airport" },
    cbd: { lat: 12.9716, lng: 77.5946, name: "MG Road / Brigade" },
    itHub: { lat: 12.9698, lng: 77.75, name: "Whitefield ITPL" },
  },
  Hyderabad: {
    airport: { lat: 17.2403, lng: 78.4294, name: "Rajiv Gandhi Airport" },
    cbd: { lat: 17.4156, lng: 78.4357, name: "Banjara Hills" },
    itHub: { lat: 17.4485, lng: 78.3908, name: "Hitec City" },
  },
  Chennai: {
    airport: { lat: 12.99, lng: 80.1693, name: "Chennai Airport" },
    cbd: { lat: 13.0606, lng: 80.2497, name: "Anna Salai / Egmore" },
  },
  Pune: {
    airport: { lat: 18.5821, lng: 73.9197, name: "Pune Airport" },
    cbd: { lat: 18.5204, lng: 73.8567, name: "MG Road / Camp" },
    itHub: { lat: 18.5527, lng: 73.9526, name: "Hinjewadi" },
  },
  Kolkata: {
    airport: { lat: 22.6547, lng: 88.4467, name: "NSC Bose Airport" },
    cbd: { lat: 22.5726, lng: 88.3639, name: "Park Street / Esplanade" },
  },
};

export type Locality = {
  airportKm: number | null;
  airportName: string | null;
  cbdKm: number | null;
  cbdName: string | null;
  itHubKm: number | null;
  itHubName: string | null;
};

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversine(a: LatLng, b: LatLng): number {
  // Great-circle distance in km
  const R = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function computeLocality(
  lat: number | null | undefined,
  lng: number | null | undefined,
  city: string
): Locality {
  const empty: Locality = {
    airportKm: null,
    airportName: null,
    cbdKm: null,
    cbdName: null,
    itHubKm: null,
    itHubName: null,
  };
  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
    return empty;
  }
  const anchors = CITY_ANCHORS[city];
  if (!anchors) return empty;

  const here: LatLng = { lat, lng, name: city };
  return {
    airportKm: Math.round(haversine(here, anchors.airport) * 10) / 10,
    airportName: anchors.airport.name,
    cbdKm: Math.round(haversine(here, anchors.cbd) * 10) / 10,
    cbdName: anchors.cbd.name,
    itHubKm: anchors.itHub ? Math.round(haversine(here, anchors.itHub) * 10) / 10 : null,
    itHubName: anchors.itHub?.name ?? null,
  };
}
