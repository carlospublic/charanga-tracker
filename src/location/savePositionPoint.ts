/**
 * savePositionPoint.ts
 *
 * Lógica compartida entre locationTask.ts (BG) y useEmitter.ts (FG).
 * Actualiza lastLocation siempre, y guarda en el historial de posiciones
 * aplicando los mismos filtros en ambos contextos:
 *   - Precisión > 50m → descarta del historial (lastLocation se actualiza siempre)
 *   - Salto imposible (>200m en <5s) → descarta del historial
 *   - Cadencia mínima (8s o 10m) → evita puntos redundantes
 */

import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { geohashForLocation, distanceBetween } from "geofire-common";
import { db } from "../firebase";

// ─── Constantes ───────────────────────────────────────────────────────────────
export const MAX_ACCURACY_M = 50;   // precisión mínima aceptable para el historial
export const MIN_MS        = 15_000; // cadencia mínima entre puntos del historial (15s)
export const MIN_KM        = 0.01;  // o 10m de desplazamiento mínimo
export const JUMP_MS       = 5_000; // umbral de tiempo para filtro anti-salto
export const JUMP_KM       = 0.2;   // umbral de distancia para filtro anti-salto (200m)

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface SavedPoint {
  lat: number;
  lng: number;
  ts: number;
}

export interface PositionInput {
  lat: number;
  lng: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
}

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * @param eventId    ID del evento en Firestore
 * @param pos        Coordenadas y metadatos del punto
 * @param lastSaved  Último punto guardado en el historial (null si es el primero)
 * @returns          El nuevo lastSaved si se guardó punto en historial, o el anterior si no
 */
export async function savePositionPoint(
  eventId: string,
  pos: PositionInput,
  lastSaved: SavedPoint | null
): Promise<SavedPoint | null> {
  const { lat, lng, accuracy, heading, speed } = pos;
  const now = Date.now();

  // Pre-calcular distancia y tiempo una sola vez para reutilizar en ambos filtros
  const distKm = lastSaved
    ? distanceBetween([lastSaved.lat, lastSaved.lng], [lat, lng])
    : 0;
  const dtMs = lastSaved ? now - lastSaved.ts : Infinity;

  // 1) Actualizar lastLocation con el mismo throttle que el historial (MIN_MS / MIN_KM)
  //    para evitar ~12 writes/min innecesarios al doc principal.
  //    Excepción: si es el primer punto (lastSaved === null) actualizamos siempre
  //    para que el mapa aparezca de inmediato.
  const shouldUpdateDoc = !lastSaved || dtMs >= MIN_MS || distKm >= MIN_KM;

  if (shouldUpdateDoc) {
    const geohash = geohashForLocation([lat, lng]);
    await updateDoc(doc(db, "events", eventId), {
      status: "live",
      updatedAt: serverTimestamp(),
      geohash,
      lastLocation: { lat, lng, accuracy, heading, speed, ts: now },
    });
  }

  // 2) Filtro de precisión: no guardar en historial si accuracy es mala
  if (accuracy !== null && accuracy > MAX_ACCURACY_M) {
    console.log(`[GPS] Descartado del historial: accuracy ${accuracy.toFixed(0)}m > ${MAX_ACCURACY_M}m`);
    return lastSaved;
  }

  // 3) Filtros de historial
  if (lastSaved) {
    // Anti-salto: ignorar desplazamientos imposibles
    if (dtMs < JUMP_MS && distKm > JUMP_KM) {
      console.log(`[GPS] Salto ignorado: ${(distKm * 1000).toFixed(0)}m en ${dtMs}ms`);
      return lastSaved;
    }

    // Cadencia: no guardar si no ha pasado suficiente tiempo o distancia
    if (dtMs < MIN_MS && distKm < MIN_KM) return lastSaved;
  }

  // 4) Guardar punto en historial
  await addDoc(collection(db, "events", eventId, "positions"), {
    lat, lng, accuracy, heading, speed, ts: now,
  });

  return { lat, lng, ts: now };
}
