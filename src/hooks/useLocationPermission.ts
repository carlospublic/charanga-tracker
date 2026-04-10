import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import * as Location from "expo-location";

/**
 * Hook de gestión de permisos de ubicación.
 *
 * Incluye soporte para el "aviso destacado" (prominent disclosure) que exige
 * Google Play antes de solicitar ACCESS_BACKGROUND_LOCATION.
 *
 * Flujo requerido por Google:
 *   1. Mostrar modal de aviso al usuario (gestionado externamente con
 *      `showingDisclosure` + `onDisclosureAccept` / `onDisclosureCancel`)
 *   2. Solo si el usuario acepta → llamar a requestBackgroundPermissionsAsync()
 *
 * Ref: https://support.google.com/googleplay/android-developer/answer/9799150
 */
export function useLocationPermission() {
  const fgGrantedRef = useRef<boolean | null>(null);
  const bgGrantedRef = useRef<boolean | null>(null);

  // Controla la visibilidad del modal de aviso destacado
  const [showingDisclosure, setShowingDisclosure] = useState(false);

  // Resolver/rechazar pendiente mientras esperamos la respuesta del usuario
  const disclosureResolveRef = useRef<((accepted: boolean) => void) | null>(null);

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
    if (ok) fgGrantedRef.current = true;
    return ok;
  }, []);

  /**
   * Muestra el modal de aviso destacado y espera la respuesta del usuario.
   * Devuelve true si el usuario acepta, false si cancela.
   *
   * Debe llamarse ANTES de ensureBackgroundPermission().
   */
  const requestDisclosureAcceptance = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      disclosureResolveRef.current = resolve;
      setShowingDisclosure(true);
    });
  }, []);

  /** Llamar desde el botón "Entendido, continuar" del modal */
  const onDisclosureAccept = useCallback(() => {
    setShowingDisclosure(false);
    disclosureResolveRef.current?.(true);
    disclosureResolveRef.current = null;
  }, []);

  /** Llamar desde el botón "Cancelar" del modal */
  const onDisclosureCancel = useCallback(() => {
    setShowingDisclosure(false);
    disclosureResolveRef.current?.(false);
    disclosureResolveRef.current = null;
  }, []);

  /**
   * Solicita el permiso de ubicación en segundo plano.
   * IMPORTANTE: llamar solo DESPUÉS de que el usuario haya aceptado el disclosure.
   */
  const ensureBackgroundPermission = useCallback(async () => {
    if (bgGrantedRef.current === true) return true;
    const { status } = await Location.requestBackgroundPermissionsAsync();
    const ok = status === "granted";
    if (ok) bgGrantedRef.current = true;
    return ok;
  }, []);

  return {
    ensureForegroundPermission,
    ensureBackgroundPermission,
    // Disclosure modal
    showingDisclosure,
    requestDisclosureAcceptance,
    onDisclosureAccept,
    onDisclosureCancel,
  };
}
