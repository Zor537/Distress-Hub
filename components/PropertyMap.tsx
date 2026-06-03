"use client";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { LatLngTuple } from "leaflet";
import { formatINR } from "@/lib/utils";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then((m) => m.CircleMarker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });

export type MapPin = {
  id: string;
  title: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  dhScore: number | null;
  reservePrice: number;
  bank: string;
};

type Props = {
  pins: MapPin[];
  center?: LatLngTuple;
  zoom?: number;
  height?: string;
  showCount?: boolean;
};

export function PropertyMap({
  pins,
  center = [28.5355, 77.391], // Noida ~ NCR centroid
  zoom = 10,
  height = "440px",
  showCount = true,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const validPins = useMemo(
    () => pins.filter((p) => p.latitude != null && p.longitude != null),
    [pins]
  );

  if (!mounted) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-lg border border-divider bg-bg-alt text-text-dim text-sm"
      >
        Loading map…
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-divider" style={{ height }}>
      {showCount && (
        <div className="pointer-events-none absolute left-3 top-3 z-[400] rounded-md bg-bg/80 px-3 py-1.5 text-xs backdrop-blur">
          <span className="text-text-dim uppercase tracking-wider">Pins:</span>{" "}
          <span className="text-gold-light font-medium tabular-nums">{validPins.length}</span>
        </div>
      )}
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: "100%", width: "100%", zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validPins.map((p) => {
          const tier = (p.dhScore ?? 0) >= 80 ? "gold" : (p.dhScore ?? 0) >= 60 ? "cream" : "muted";
          const color = tier === "gold" ? "#C9A961" : tier === "cream" ? "#F7F4ED" : "#B8B5AE";
          const radius = tier === "gold" ? 10 : tier === "cream" ? 8 : 6;
          return (
            <CircleMarker
              key={p.id}
              center={[p.latitude!, p.longitude!]}
              radius={radius}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: tier === "gold" ? 0.9 : 0.6,
                weight: 2,
              }}
            >
              <Popup>
                <div className="space-y-1 text-xs">
                  <Link href={`/deals/${p.id}`} className="font-medium text-gold-light underline">
                    {p.title}
                  </Link>
                  <div>{p.city}</div>
                  <div className="tabular-nums">{formatINR(p.reservePrice)}</div>
                  <div className="uppercase tracking-wider text-text-dim">
                    {p.bank} · DH {p.dhScore ?? "—"}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
