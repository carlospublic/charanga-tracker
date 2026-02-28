import { useCallback, useState } from "react";
import * as Location from "expo-location";
import { collection, endAt, getDocs, limit, orderBy, query, startAt, where } from "firebase/firestore";
import { db } from "../firebase";
import { distanceBetween, geohashQueryBounds } from "geofire-common";
import type { EventDoc } from "./useEventSubscription";

export function useNearbyEvents(opts: { ensureForegroundPermission: () => Promise<boolean> }) {
  const { ensureForegroundPermission } = opts;

  const [nearby, setNearby] = useState<EventDoc[]>([]);
  const [nearbyMsg, setNearbyMsg] = useState<string>("");

  const loadNearbyEvents = useCallback(async () => {
    try {
      setNearbyMsg("Buscando eventos cercanos…");
      setNearby([]);

      const ok = await ensureForegroundPermission();
      if (!ok) {
        setNearbyMsg("Permiso de ubicación denegado.");
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        mayShowUserSettingsDialog: true,
      });
      const center: [number, number] = [pos.coords.latitude, pos.coords.longitude];

      const radiusKm = 3;
      const radiusM = radiusKm * 1000;
      const bounds = geohashQueryBounds(center, radiusM);

      const snaps = await Promise.all(
        bounds.map(([start, end]) =>
          getDocs(
            query(
              collection(db, "events"),
              where("visibility", "==", "public"),
              where("status", "in", ["live", "paused"]),
              orderBy("geohash"),
              startAt(start),
              endAt(end),
              limit(50)
            )
          )
        )
      );

      const seen = new Set<string>();
      const res: EventDoc[] = [];

      for (const s of snaps) {
        for (const d of s.docs) {
          if (seen.has(d.id)) continue;
          seen.add(d.id);

          const data = d.data() as Omit<EventDoc, "id">;
          const loc = data?.lastLocation;
          if (loc?.lat == null || loc?.lng == null) continue;

          const km = distanceBetween([loc.lat, loc.lng], center);
          if (km <= radiusKm) res.push({ id: d.id, ...data, distanceKm: km });
        }
      }

      res.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
      setNearby(res);
      setNearbyMsg(res.length ? "" : "No hay eventos cercanos (o aún no han emitido ubicación).");
    } catch (e) {
      console.error("Error nearby:", e);
      setNearbyMsg("Error buscando cercanos. Mira consola (puede pedir índice en Firestore).");
    }
  }, [ensureForegroundPermission]);

  return { nearby, nearbyMsg, setNearby, setNearbyMsg, loadNearbyEvents };
}
