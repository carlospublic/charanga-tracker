import { useCallback, useRef, useState } from "react";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "../firebase";

export type Mode = "emitter" | "receiver";
export type EventStatus = "live" | "paused" | "ended";
export type Visibility = "public" | "private";

export interface LastLocation {
  lat: number;
  lng: number;
  ts: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export interface EventDoc {
  id: string;
  name: string;
  status: EventStatus;
  visibility: Visibility;
  geohash?: string;
  lastLocation?: LastLocation;
  updatedAt?: Timestamp;
  createdAt?: Timestamp;
  distanceKm?: number;
}

export function useEventSubscription() {
  const [eventData, setEventData] = useState<EventDoc | null>(null);
  const unsubRef = useRef<null | (() => void)>(null);

  const unsubscribe = useCallback(() => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
  }, []);

  const subscribe = useCallback(
    (id: string) => {
      unsubscribe();
      unsubRef.current = onSnapshot(
        doc(db, "events", id),
        (snap) => {
          if (!snap.exists()) {
            setEventData(null);
            return;
          }
          setEventData({ id: snap.id, ...(snap.data() as Omit<EventDoc, "id">) });
        },
        (err) => {
          console.error("[useEventSubscription] onSnapshot error:", err);
          setEventData(null);
        }
      );
    },
    [unsubscribe]
  );

  return { eventData, setEventData, subscribe, unsubscribe };
}
