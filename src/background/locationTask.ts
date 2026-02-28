import * as TaskManager from "expo-task-manager";
import type { LocationObject } from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { BG_LOCATION_TASK, STORAGE_KEY_LAST_SAVED } from "./constants";
import { getEmittingEventId, getEmitSessionId, getSessionStartedAt, clearLastSaved } from "./emissionStore";
import { savePositionPoint, type SavedPoint } from "../location/savePositionPoint";

async function getLastSaved(): Promise<SavedPoint | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_LAST_SAVED);
    return raw ? (JSON.parse(raw) as SavedPoint) : null;
  } catch {
    return null;
  }
}

async function persistLastSaved(point: SavedPoint): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_LAST_SAVED, JSON.stringify(point));
  } catch (e) {
    console.error("[BG_TASK] Error persistiendo lastSaved:", e);
  }
}

TaskManager.defineTask(BG_LOCATION_TASK, async ({ data, error }) => {
  try {
    if (error) {
      console.error("[BG_TASK] error:", error);
      return;
    }

    const eventId = await getEmittingEventId();
    if (!eventId) {
      await clearLastSaved();
      return;
    }

    // Leer el sessionId al inicio del callback y guardarlo como referencia.
    // Si cambia durante el write (Stop+Start rápido), el callback pertenece
    // a una sesión anterior y debe descartarse.
    const sessionAtStart = await getEmitSessionId();
    if (!sessionAtStart) {
      console.log("[BG_TASK] Sesión cancelada, descartando write tardío.");
      return;
    }

    const locations = (data as any)?.locations as LocationObject[] | undefined;
    if (!locations?.length) return;

    const latest = locations[locations.length - 1];

    // Descartar localizaciones cuyo timestamp sea anterior al inicio de la sesión.
    // El SO puede entregar puntos en caché de una sesión anterior justo tras un Start nuevo,
    // y pasarían la validación del sessionId porque ya es el nuevo.
    // Se resta un margen de 30s para cubrir el retraso en arrancar el BG task
    // y evitar descartar localizaciones reales de los primeros segundos de emisión.
    const sessionStartedAt = await getSessionStartedAt();
    const MARGIN_MS = 30_000;
    if (sessionStartedAt && latest.timestamp < sessionStartedAt - MARGIN_MS) {
      console.log(`[BG_TASK] Localización antigua descartada: ts=${latest.timestamp} < sessionStart=${sessionStartedAt}`);
      return;
    }
    const lastSaved = await getLastSaved();

    const newLastSaved = await savePositionPoint(
      eventId,
      {
        lat: latest.coords.latitude,
        lng: latest.coords.longitude,
        accuracy: latest.coords.accuracy ?? null,
        heading: latest.coords.heading ?? null,
        speed: latest.coords.speed ?? null,
      },
      lastSaved
    );

    // Comparar por igualdad, no solo existencia — cubre el caso Stop+Start rápido
    // donde un callback de la sesión anterior vería el sessionId de la nueva sesión
    const sessionAfter = await getEmitSessionId();
    if (sessionAfter !== sessionAtStart) {
      console.log("[BG_TASK] SessionId cambió durante write, descartando resultado.");
      return;
    }

    // Persistir en AsyncStorage solo si se guardó un nuevo punto
    if (newLastSaved && (!lastSaved || newLastSaved.ts !== lastSaved.ts)) {
      await persistLastSaved(newLastSaved);
    }
  } catch (e) {
    console.error("[BG_TASK] exception:", e);
  }
});
