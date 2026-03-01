import { useCallback, useState } from "react";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase";
import type { EventDoc } from "./useEventSubscription";

export function useReceiver(opts: { subscribe: (id: string) => void; unsubscribe: () => void }) {
  const { subscribe, unsubscribe } = opts;

  const [joinName, setJoinName] = useState<string>("");
  const [followedEventId, setFollowedEventId] = useState<string | null>(null);
  const [joinStatusMsg, setJoinStatusMsg] = useState<string>("");
  const [nameMatches, setNameMatches] = useState<EventDoc[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const stopFollowingAndReset = useCallback(() => {
    unsubscribe();
    setFollowedEventId(null);
    setJoinName("");
    setJoinStatusMsg("");
    setNameMatches([]);
  }, [unsubscribe]);

  const followEvent = useCallback(
    async (eventDoc: EventDoc) => {
      if (eventDoc.status === "ended") {
        setJoinStatusMsg("❌ El evento ha finalizado.");
        return;
      }
      setFollowedEventId(eventDoc.id);
      subscribe(eventDoc.id);
      setJoinStatusMsg(eventDoc.status === "paused"
      ? "⏸ Evento pausado: verás la última posición hasta que se reanude."
      : "✅ Siguiendo evento.");
    },
    [subscribe]
  );

  const connectToEventByName = useCallback(
    async (nameRaw: string) => {
      const name = nameRaw.trim();
      if (!name || isSearching) return;

      try {
        setIsSearching(true);
        setJoinStatusMsg("Buscando evento por nombre…");
        setNameMatches([]);

        const q = query(
          collection(db, "events"),
          where("visibility", "==", "public"),
          where("status", "in", ["live", "paused"]),
          where("name", "==", name),
          orderBy("updatedAt", "desc"),
          limit(10)
        );

        const qs = await getDocs(q);

        if (qs.empty) {
          setJoinStatusMsg("❌ No hay ningún evento live o pausado con ese nombre.");
          return;
        }

        const matches = qs.docs.map((d) => ({ id: d.id, ...d.data() } as EventDoc));
        setNameMatches(matches);

        if (matches.length === 1) {
          await followEvent(matches[0]);
        } else {
          setJoinStatusMsg(`He encontrado ${matches.length} eventos con ese nombre. Elige uno:`);
        }
      } catch (e) {
        console.error("Error connectToEventByName:", e);
        setJoinStatusMsg("❌ Error buscando por nombre (puede pedir índice).");
      } finally {
        setIsSearching(false);
      }
    },
    [followEvent, isSearching]
  );

  return {
    joinName,
    setJoinName,
    followedEventId,
    joinStatusMsg,
    nameMatches,
    isSearching,
    setJoinStatusMsg,
    setNameMatches,
    connectToEventByName,
    followEvent,
    stopFollowingAndReset,
  };
}
