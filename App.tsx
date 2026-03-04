import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Alert, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthAnonymous } from "./src/hooks/useAuthAnonymous";
import { useLocationPermission } from "./src/hooks/useLocationPermission";
import { useEventSubscription, type Mode } from "./src/hooks/useEventSubscription";
import { useEmitter } from "./src/hooks/useEmitter";
import { useReceiver } from "./src/hooks/useReceiver";
import { useNearbyEvents } from "./src/hooks/useNearbyEvents";
import { useEventPositions } from "./src/hooks/useEventPositions";

import { AboutModal } from "./src/components/AboutModal";
import { EventMap } from "./src/components/EventMap";
import { EmitterPanel } from "./src/components/EmitterPanel";
import { ReceiverPanel } from "./src/components/ReceiverPanel";
import { UpdateRequired } from "./src/components/UpdateRequired";
import { useMinVersion } from "./src/hooks/useMinVersion";

function formatAge(tsMs?: number): string {
  if (!tsMs) return "—";
  const diff = Date.now() - tsMs;
  const s = Math.max(0, Math.floor(diff / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h`;
}

export default function App() {
  const [mode, setMode] = useState<Mode>("receiver");
  const [showAbout, setShowAbout] = useState(false);
  const [pendingAction, setPendingAction] = useState<"pausing" | "resuming" | null>(null);

  const { status: versionStatus, minVersion } = useMinVersion();
  const { authReady, authError, retryAuth } = useAuthAnonymous();
  const { ensureForegroundPermission, ensureBackgroundPermission } = useLocationPermission();
  const { eventData, setEventData, subscribe, unsubscribe } = useEventSubscription();

  const emitter = useEmitter({ ensureForegroundPermission, ensureBackgroundPermission });
  const receiver = useReceiver({ subscribe, unsubscribe });
  const nearby = useNearbyEvents({ ensureForegroundPermission });

  const activeEventId = eventData?.id ?? null;
  const { positions } = useEventPositions(activeEventId, 300);

  const polyCoords = useMemo(
    () => positions.map((p) => ({ latitude: p.lat, longitude: p.lng })),
    [positions]
  );

  const emitterRef = useRef(emitter);
  useEffect(() => { emitterRef.current = emitter; }, [emitter]);

  // Desactiva el estado de espera cuando Firestore confirma el nuevo status
  useEffect(() => {
    if (pendingAction === "resuming" && eventData?.status === "live") setPendingAction(null);
    if (pendingAction === "pausing" && eventData?.status === "paused") setPendingAction(null);
  }, [eventData?.status, pendingAction]);

  useEffect(() => {
    return () => {
      const e = emitterRef.current;
      if (e.eventId) e.stopEmitting(e.eventId);
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchMode = useCallback(
    (next: Mode) => {
      if (next === "receiver" && emitter.eventId) emitter.stopEmitting(emitter.eventId);

      receiver.setJoinStatusMsg("");
      receiver.setNameMatches([]);
      nearby.setNearby([]);
      nearby.setNearbyMsg("");
      setMode(next);

      if (next === "emitter" && emitter.eventId) subscribe(emitter.eventId);

      if (next === "receiver") {
        if (receiver.followedEventId) subscribe(receiver.followedEventId);
        else {
          unsubscribe();
          setEventData(null);
        }
      }
    },
    [emitter, nearby, receiver, setEventData, subscribe, unsubscribe]
  );

  const createEventAndStart = useCallback(async () => {
    const fgOk = await ensureForegroundPermission();
    if (!fgOk) {
      Alert.alert(
        "Permiso de ubicación necesario",
        "Para crear un evento necesitas conceder acceso a la ubicación. Ve a Ajustes y activa el permiso."
      );
      return;
    }
    const id = await emitter.createEventAndStart();
    if (!id) {
      Alert.alert("Error creando evento", "Comprueba tu conexión e inténtalo de nuevo.");
      return;
    }
    subscribe(id);
    Alert.alert("Evento creado", `Nombre: ${emitter.eventName.trim()}\nEmisión iniciada`);
  }, [emitter, ensureForegroundPermission, subscribe]);

  const finishEventAndReset = useCallback(async () => {
    if (!emitter.eventId) return;
    setPendingAction(null);
    try {
      await emitter.finishEventAndReset();
      Alert.alert("Evento finalizado", "Listo para crear un nuevo evento.");
      unsubscribe();
      setEventData(null);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "No se pudo finalizar el evento.");
    }
  }, [emitter, setEventData, unsubscribe]);

  const handleToggleEmitting = useCallback(async () => {
    if (emitter.isEmitting) {
      setPendingAction("pausing");
      await emitter.stopEmitting(emitter.eventId!);
    } else {
      setPendingAction("resuming");
      await emitter.startEmitting(emitter.eventId!);
    }
  }, [emitter]);

  const stopFollowingAndReset = useCallback(() => {
    receiver.stopFollowingAndReset();
    setEventData(null);
    nearby.setNearby([]);
    nearby.setNearbyMsg("");
  }, [nearby, receiver, setEventData]);

  // Bloquear UI si la versión es insuficiente o mostrar spinner mientras se comprueba
  if (versionStatus === "outdated") return <UpdateRequired minVersion={minVersion} />;

  const lastLoc = eventData?.lastLocation;
  const lastTsMs = lastLoc?.ts;
  const isWaitingForGps =
    !lastLoc &&
    ((mode === "emitter" && !!emitter.eventId) ||
      (mode === "receiver" && !!receiver.followedEventId));

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor="#fff" translucent={false} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.container}>

          {/* Cabecera */}
          <View style={styles.header}>
            <Text style={styles.title}>Sigue la Charanga</Text>
            <Pressable onPress={() => setShowAbout(true)} style={styles.infoBtn}>
              <Text style={styles.infoBtnText}>i</Text>
            </Pressable>
          </View>

          {/* Selector de modo */}
          <View style={styles.row}>
            {(["receiver", "emitter"] as Mode[]).map((m) => (
              <Pressable
                key={m}
                onPress={() => switchMode(m)}
                style={[styles.modeBtn, mode === m ? styles.modeBtnActive : styles.modeBtnInactive]}
              >
                <Text style={[styles.modeBtnText, mode === m ? styles.modeBtnTextActive : styles.modeBtnTextInactive]}>
                  {m === "receiver" ? "Receptor" : "Emisor"}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={{ height: 20 }} />

          {/* Mapa */}
          <EventMap
            mode={mode}
            lastLoc={lastLoc}
            isWaitingForGps={isWaitingForGps}
            polyCoords={polyCoords}
            eventData={eventData}
          />

          {/* Info del evento activo */}
          <View style={{ marginTop: 10 }}>
            {eventData?.name ? (
              <Text style={styles.small}>
                Evento: <Text style={styles.bold}>{eventData.name}</Text>
                {" · "}
                <Text style={{ color: eventData.status === "live" ? "#16a34a" : eventData.status === "paused" ? "#d97706" : "#dc2626" }}>
                  {"● "}{eventData.status ?? "live"}
                </Text>
                {" · "}Última señal: <Text style={styles.bold}>{formatAge(lastTsMs)}</Text>
                {eventData.id ? <Text> · Rastro: <Text style={styles.bold}>{positions.length} pts</Text></Text> : null}
              </Text>
            ) : null}
          </View>

          <View style={{ height: 12 }} />

          {/* Panel según modo */}
          {mode === "emitter" ? (
            <EmitterPanel
              authReady={authReady}
              authError={authError}
              eventId={emitter.eventId}
              eventName={emitter.eventName}
              isEmitting={emitter.isEmitting}
              pendingAction={pendingAction}
              onChangeEventName={emitter.setEventName}
              onCreateEventAndStart={createEventAndStart}
              onToggleEmitting={handleToggleEmitting}
              onFinishEvent={finishEventAndReset}
              onRetryAuth={retryAuth}
            />
          ) : (
            <ReceiverPanel
              followedEventId={receiver.followedEventId}
              joinName={receiver.joinName}
              isSearching={receiver.isSearching}
              joinStatusMsg={receiver.joinStatusMsg}
              nameMatches={receiver.nameMatches}
              nearby={nearby.nearby}
              nearbyMsg={nearby.nearbyMsg}
              onChangeJoinName={receiver.setJoinName}
              onConnect={() => receiver.connectToEventByName(receiver.joinName)}
              onFollowEvent={receiver.followEvent}
              onLoadNearby={nearby.loadNearbyEvents}
              onStopFollowing={stopFollowingAndReset}
            />
          )}
        </View>
      </KeyboardAvoidingView>

      <AboutModal visible={showAbout} onClose={() => setShowAbout(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, padding: 20, paddingBottom: 6 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "center", position: "relative" },
  title: { fontSize: 22, fontWeight: "bold", textAlign: "center", color: "#111" },
  infoBtn: { position: "absolute", right: 0, width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: "#FF3FA4", alignItems: "center", justifyContent: "center" },
  infoBtnText: { fontSize: 13, fontWeight: "700", color: "#FF3FA4", lineHeight: 16 },
  row: { flexDirection: "row", justifyContent: "center", gap: 12, marginTop: 15 },
  modeBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1 },
  modeBtnActive: { backgroundColor: "#FF3FA4", borderColor: "#FF3FA4" },
  modeBtnInactive: { backgroundColor: "#f3f4f6", borderColor: "#FFB3D9" },
  modeBtnText: { fontWeight: "bold", color: "#111" },
  modeBtnTextActive: { color: "white" },
  modeBtnTextInactive: { color: "#111" },
  small: { marginTop: 6, fontSize: 12, opacity: 0.78, color: "#111" },
  bold: { fontWeight: "700", color: "#111" },
});
