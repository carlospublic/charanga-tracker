import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEY_EVENT_ID, STORAGE_KEY_LAST_SAVED, STORAGE_KEY_SESSION_ID, STORAGE_KEY_SESSION_STARTED_AT } from "./constants";

export async function clearLastSaved(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_LAST_SAVED);
  } catch {
    // ignorar
  }
}

export async function setEmittingEventId(eventId: string) {
  // Limpiar lastSaved al cambiar de evento para que el filtro de cadencia
  // no use coordenadas de un evento anterior
  await clearLastSaved();
  await AsyncStorage.setItem(STORAGE_KEY_EVENT_ID, eventId);
}

export async function clearEmittingEventId() {
  await AsyncStorage.removeItem(STORAGE_KEY_EVENT_ID);
}

export async function getEmittingEventId(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEY_EVENT_ID);
}

// ─── Session ID ───────────────────────────────────────────────────────────────
// Identifica de forma única cada sesión de emisión. El BG task compara el
// sessionId en AsyncStorage con el que recibió al arrancar — si no coinciden,
// descarta la escritura (la sesión ya fue cancelada).

export async function setEmitSessionId(sessionId: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_SESSION_ID, sessionId);
  // Guardar el timestamp de inicio de sesión para descartar localizaciones
  // antiguas que el SO pueda entregar tras un Start nuevo
  await AsyncStorage.setItem(STORAGE_KEY_SESSION_STARTED_AT, String(Date.now()));
}

export async function clearEmitSessionId(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_SESSION_ID);
    await AsyncStorage.removeItem(STORAGE_KEY_SESSION_STARTED_AT);
  } catch {
    // ignorar
  }
}

export async function getEmitSessionId(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEY_SESSION_ID);
}

export async function getSessionStartedAt(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY_SESSION_STARTED_AT);
  return raw ? parseInt(raw, 10) : null;
}

// ─── Cleanup al arrancar ──────────────────────────────────────────────────────
// Limpia todo el estado de emisión en AsyncStorage. Se llama al arrancar la app
// para evitar que un estado sucio de una sesión anterior bloquee la creación
// de nuevos eventos (por ejemplo, si la app se cerró durante una operación pendiente).
export async function clearAllEmissionState(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEY_EVENT_ID,
      STORAGE_KEY_LAST_SAVED,
      STORAGE_KEY_SESSION_ID,
      STORAGE_KEY_SESSION_STARTED_AT,
    ]);
  } catch {
    // ignorar
  }
}
