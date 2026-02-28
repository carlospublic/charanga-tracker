import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import * as Location from "expo-location";

export function useLocationPermission() {
  const fgGrantedRef = useRef<boolean | null>(null);
  const bgGrantedRef = useRef<boolean | null>(null);

  // Si el usuario va a Ajustes y revoca permisos, limpiamos el caché
  // cuando la app vuelve a primer plano para re-comprobar en la próxima llamada
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        fgGrantedRef.current = null;
        bgGrantedRef.current = null;
      }
    });
    return () => sub.remove();
  }, []);

  const ensureForegroundPermission = useCallback(async () => {
    if (fgGrantedRef.current === true) return true;
    const { status } = await Location.requestForegroundPermissionsAsync();
    const ok = status === "granted";
    if (ok) fgGrantedRef.current = true; // cachear solo si se concede
    return ok;
  }, []);

  const ensureBackgroundPermission = useCallback(async () => {
    if (bgGrantedRef.current === true) return true;
    const { status } = await Location.requestBackgroundPermissionsAsync();
    const ok = status === "granted";
    if (ok) bgGrantedRef.current = true; // cachear solo si se concede
    return ok;
  }, []);

  return { ensureForegroundPermission, ensureBackgroundPermission };
}
