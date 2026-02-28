import { useCallback, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { Alert } from "react-native";
import * as Location from "expo-location";
import * as Device from "expo-device";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db, auth } from "../firebase";

import { BG_LOCATION_TASK } from "../background/constants";
import { clearEmittingEventId, setEmittingEventId, setEmitSessionId, clearEmitSessionId } from "../background/emissionStore";
import { APP_VERSION } from "../version";
import { savePositionPoint, type SavedPoint } from "../location/savePositionPoint";

export function useEmitter(opts: {
  ensureForegroundPermission: () => Promise<boolean>;
  ensureBackgroundPermission: () => Promise<boolean>;
}) {
  const { ensureForegroundPermission, ensureBackgroundPermission } = opts;

  const [eventId, setEventId] = useState<string | null>(null);
  const [eventName, setEventName] = useState<string>("Charanga");
  const [isEmitting, setIsEmitting] = useState(false);

  const fgWatchRef = useRef<Location.LocationSubscription | null>(null);
  // En FG guardamos lastSaved en un ref (no necesita persistencia en AsyncStorage)
  const lastSavedRef = useRef<SavedPoint | null>(null);
  // Cola de escrituras para evitar condición de carrera entre callbacks FG
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());

  const locationOptions = useMemo<Location.LocationTaskOptions>(
    () => ({
      accuracy: Location.Accuracy.High,
      timeInterval: 10000,
      distanceInterval: 10,
      deferredUpdatesInterval: 15000,
      deferredUpdatesDistance: 15,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "Charanga Tracker",
        notificationBody: "Emitiendo ubicación en segundo plano",
      },
    }),
    []
  );

  const startEmitting = useCallback(
    async (forEventId: string) => {
      const fgOk = await ensureForegroundPermission();
      if (!fgOk) return false;

      const bgOk = await ensureBackgroundPermission();

      await setEmittingEventId(forEventId);
      // Generar un nuevo sessionId único para esta sesión de emisión.
      // El BG task lo comparará antes de escribir para detectar writes tardíos.
      const sessionId = `${forEventId}-${Date.now()}`;
      await setEmitSessionId(sessionId);
      setEventId(forEventId);

      if (bgOk) {
        // Limpiar watcher FG si estaba activo de un intento anterior
        if (fgWatchRef.current) {
          fgWatchRef.current.remove();
          fgWatchRef.current = null;
        }

        // Siempre stop + start para asegurar config actualizada
        try {
          const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(BG_LOCATION_TASK);
          if (alreadyStarted) await Location.stopLocationUpdatesAsync(BG_LOCATION_TASK);
        } catch (_e) {
          // ignorar si no estaba iniciado
        }

        try {
          await Location.startLocationUpdatesAsync(BG_LOCATION_TASK, locationOptions);
          setIsEmitting(true);
          return true;
        } catch (e) {
          console.error("Error iniciando BG location updates:", e);
          await clearEmittingEventId();
          setIsEmitting(false);
          Alert.alert(
            "Error de emisión",
            "No se pudo iniciar la emisión en segundo plano. Inténtalo de nuevo."
          );
          return false;
        }
      } else {
        // Fallback FG: misma lógica que BG gracias al helper compartido
        Alert.alert(
          "Permiso de segundo plano denegado",
          "La ubicación solo se emitirá mientras la app esté abierta. Para emitir en segundo plano, activa 'Ubicación siempre' en los ajustes del dispositivo."
        );

        lastSavedRef.current = null;
        writeQueueRef.current = Promise.resolve();

        try {
          fgWatchRef.current = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 10000,
              distanceInterval: 10,
            },
            (pos) => {
              // Encolar escrituras para evitar ejecuciones paralelas
              writeQueueRef.current = writeQueueRef.current
                .then(async () => {
                  const newLastSaved = await savePositionPoint(
                    forEventId,
                    {
                      lat: pos.coords.latitude,
                      lng: pos.coords.longitude,
                      accuracy: pos.coords.accuracy ?? null,
                      heading: pos.coords.heading ?? null,
                      speed: pos.coords.speed ?? null,
                    },
                    lastSavedRef.current
                  );
                  lastSavedRef.current = newLastSaved;
                })
                .catch((err) => console.error("[FG] Error enviando ubicación:", err));
            }
          );
          setIsEmitting(true);
          return true;
        } catch (e) {
          console.error("Error iniciando FG watch:", e);
          await clearEmittingEventId();
          setIsEmitting(false);
          return false;
        }
      }
    },
    [ensureForegroundPermission, ensureBackgroundPermission, locationOptions]
  );

  const stopEmitting = useCallback(async (updateFirestoreId?: string) => {
    // Primero invalidar eventId Y sessionId para que cualquier tarea BG en vuelo
    // se autoinvalide y no escriba status:"live" tras parar
    await clearEmittingEventId();
    await clearEmitSessionId();

    try {
      const started = await Location.hasStartedLocationUpdatesAsync(BG_LOCATION_TASK);
      if (started) await Location.stopLocationUpdatesAsync(BG_LOCATION_TASK);
    } catch (e) {
      console.error("Error deteniendo BG updates:", e);
    }

    if (fgWatchRef.current) {
      fgWatchRef.current.remove();
      fgWatchRef.current = null;
    }

    lastSavedRef.current = null;
    writeQueueRef.current = Promise.resolve();
    setIsEmitting(false);

    if (updateFirestoreId) {
      try {
        await updateDoc(doc(db, "events", updateFirestoreId), {
          status: "paused",
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.error("Error actualizando status a paused:", e);
      }
    }
  }, []);

  const createEventAndStart = useCallback(async () => {
    try {
      const fgOk = await ensureForegroundPermission();
      if (!fgOk) return null;

      // Garantizar que hay usuario autenticado antes de escribir en Firestore.
      // useAuthAnonymous puede estar aún resolviendo el login anónimo.
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.error("[createEventAndStart] auth.currentUser es null, abortando");
        return null;
      }

      const name = (eventName || "Charanga").trim();

      const ref = await addDoc(collection(db, "events"), {
        name,
        ownerUid: currentUser.uid,
        visibility: "public",
        status: "paused",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        emitterDevice: {
          platform: Device.osName ?? "unknown",
          osVersion: Device.osVersion ?? "unknown",
          model: Device.modelName ?? "unknown",
          appVersion: APP_VERSION,
        },
      });

      setEventId(ref.id);

      // Capturamos una primera posición con Balanced (acepta red/WiFi) para
      // que el mapa aparezca de inmediato sin esperar al GPS de alta precisión.
      // El task BG seguirá usando High y irá refinando la posición.
      try {
        const quickPos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        await savePositionPoint(
          ref.id,
          {
            lat: quickPos.coords.latitude,
            lng: quickPos.coords.longitude,
            accuracy: quickPos.coords.accuracy ?? null,
            heading: quickPos.coords.heading ?? null,
            speed: quickPos.coords.speed ?? null,
          },
          null
        );
      } catch {
        // Si falla no bloqueamos el arranque, el task BG enviará la primera
        // posición en cuanto tenga señal
      }

      const ok = await startEmitting(ref.id);
      return ok ? ref.id : null;
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [ensureForegroundPermission, eventName, startEmitting]);

  const finishEventAndReset = useCallback(async () => {
    if (!eventId) return;

    try {
      await stopEmitting();
    } catch (e) {
      console.error("Error deteniendo emisión:", e);
    }

    try {
      await updateDoc(doc(db, "events", eventId), {
        status: "ended",
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Error finalizando evento en Firestore:", e);
      throw e;
    }

    setEventId(null);
  }, [eventId, stopEmitting]);

  return {
    eventId,
    eventName,
    isEmitting,
    setEventId,
    setEventName,
    startEmitting,
    stopEmitting,
    createEventAndStart,
    finishEventAndReset,
  };
}
