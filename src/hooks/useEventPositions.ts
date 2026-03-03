import { useCallback, useEffect, useRef, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";

export interface PositionPoint {
  lat: number;
  lng: number;
  ts: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export function useEventPositions(eventId: string | null, maxPoints: number = 500) {
  const [positions, setPositions] = useState<PositionPoint[]>([]);
  const unsubRef = useRef<null | (() => void)>(null);

  const unsubscribe = useCallback(() => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
  }, []);

  useEffect(() => {
    unsubscribe();
    setPositions([]);

    if (!eventId) return;

    // IMPORTANTE: orderBy("ts", "desc") + limit(maxPoints) para quedarnos
    // con los maxPoints puntos MÁS RECIENTES (Firestore no tiene "last N").
    // Los puntos se re-ordenan a asc en el callback para pintar la polyline
    // en orden cronológico. NO cambiar a "asc" aquí: limit cogería los más
    // antiguos y el rastro visible quedaría roto silenciosamente.
    const q = query(
      collection(db, "events", eventId, "positions"),
      orderBy("ts", "desc"),
      limit(maxPoints)
    );

    unsubRef.current = onSnapshot(
      q,
      (snap) => {
        const pts: PositionPoint[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          if (typeof data?.lat !== "number" || typeof data?.lng !== "number") return;
          pts.push({
            lat: data.lat,
            lng: data.lng,
            ts: typeof data.ts === "number" ? data.ts : Date.now(),
            accuracy: data.accuracy ?? null,
            heading: data.heading ?? null,
            speed: data.speed ?? null,
          });
        });
        pts.sort((a, b) => a.ts - b.ts);
        setPositions(pts);
      },
      (err) => {
        console.error("[useEventPositions] onSnapshot error:", err);
        setPositions([]);
      }
    );

    return () => unsubscribe();
  }, [eventId, maxPoints, unsubscribe]);

  return { positions };
}
