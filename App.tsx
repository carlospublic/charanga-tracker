import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TextInput, Alert, Pressable, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, ScrollView, useWindowDimensions } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, Polyline } from "react-native-maps";

import { APP_VERSION } from "./src/version";

import { Timestamp } from "firebase/firestore";

import { useAuthAnonymous } from "./src/hooks/useAuthAnonymous";
import { useLocationPermission } from "./src/hooks/useLocationPermission";
import { useEventSubscription, type Mode, type EventDoc } from "./src/hooks/useEventSubscription";
import { useEmitter } from "./src/hooks/useEmitter";
import { useReceiver } from "./src/hooks/useReceiver";
import { useNearbyEvents } from "./src/hooks/useNearbyEvents";
import { useEventPositions } from "./src/hooks/useEventPositions";

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
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  // Altura del modal: 85% de pantalla menos insets top y bottom para
  // que no se salga en ningún dispositivo Android (gesture nav, notch, etc.)
  const modalMaxHeight = screenHeight * 0.85 - insets.top - insets.bottom;

  const { authReady } = useAuthAnonymous();

  const { ensureForegroundPermission, ensureBackgroundPermission } = useLocationPermission();
  const { eventData, setEventData, subscribe, unsubscribe } = useEventSubscription();

  const emitter = useEmitter({ ensureForegroundPermission, ensureBackgroundPermission });
  const receiver = useReceiver({ subscribe, unsubscribe });
  const nearby = useNearbyEvents({ ensureForegroundPermission });

  const activeEventId = eventData?.id ?? null;
  // 300 puntos = ~40 min de recorrido visible (cadencia 8s).
  // El historial completo se guarda en Firestore — esto es solo para la polyline.
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
    const id = await emitter.createEventAndStart();
    if (!id) {
      Alert.alert("Error creando evento");
      return;
    }
    subscribe(id);
    Alert.alert("Evento creado", `Nombre: ${(emitter.eventName || "Charanga").trim()}\nEmisión iniciada`);
  }, [emitter, subscribe]);

  const finishEventAndReset = useCallback(async () => {
    if (!emitter.eventId) return;
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

  const stopFollowingAndReset = useCallback(() => {
    receiver.stopFollowingAndReset();
    setEventData(null);
    nearby.setNearby([]);
    nearby.setNearbyMsg("");
  }, [nearby, receiver, setEventData]);

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
          <View style={styles.header}>
            <Text style={styles.title}>Sigue la Charanga</Text>
            <Pressable onPress={() => setShowAbout(true)} style={styles.infoBtn}>
              <Text style={styles.infoBtnText}>i</Text>
            </Pressable>
          </View>

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

          <View style={styles.mapContainer}>
            {lastLoc ? (
              <MapView
                style={{ flex: 1 }}
                showsUserLocation={mode === "receiver"}
                region={{
                  latitude: lastLoc.lat,
                  longitude: lastLoc.lng,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
              >
                {polyCoords.length >= 2 ? <Polyline coordinates={polyCoords} strokeWidth={4} /> : null}
                <Marker coordinate={{ latitude: lastLoc.lat, longitude: lastLoc.lng }} title={eventData?.name ?? "Charanga"} />
              </MapView>
            ) : (
              <View style={styles.mapPlaceholder}>
                {isWaitingForGps ? (
                  <>
                    <ActivityIndicator size="large" color="#FF3FA4" />
                    <Text style={[styles.small, { marginTop: 12, textAlign: "center" }]}>
                      📡 Obteniendo señal GPS...
                    </Text>
                  </>
                ) : (
                  <Text style={{ opacity: 0.7, textAlign: "center" }}>
                    {mode === "receiver" ? "Únete a un evento o busca eventos cercanos." : "Crea un evento: empezará a emitir automáticamente."}
                  </Text>
                )}
              </View>
            )}
          </View>

          <View style={{ marginTop: 10 }}>
            {eventData?.name ? (
              <Text style={styles.small}>
                Evento: <Text style={styles.bold}>{eventData.name}</Text> · <Text style={{ color: eventData.status === "live" ? "#16a34a" : eventData.status === "paused" ? "#d97706" : "#dc2626" }}>{"● "}{eventData.status ?? "live"}</Text> · Última señal: <Text style={styles.bold}>{formatAge(lastTsMs)}</Text>
                {eventData.id ? <Text> · Rastro: <Text style={styles.bold}>{positions.length} pts</Text></Text> : null}
              </Text>
            ) : null}
          </View>

          <View style={{ height: 12 }} />

          {mode === "emitter" ? (
            <View style={styles.panel}>
              {!emitter.eventId ? (
                <>
                  <Text style={styles.label}>Nombre del evento</Text>
                  <TextInput
                    value={emitter.eventName}
                    onChangeText={emitter.setEventName}
                    placeholder="Ej: Charanga San Mateo"
                    style={styles.input}
                  />
                  <Pressable style={[styles.btn, (!authReady || !emitter.eventName.trim()) && styles.btnDisabled]} onPress={createEventAndStart} disabled={!authReady || !emitter.eventName.trim()}>
                    <Text style={styles.btnText}>{authReady ? "🎺 Crear evento (y emitir)" : "⏳ Conectando..."}</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    style={[styles.btn, emitter.isEmitting && styles.btnSecondary, pendingAction && styles.btnDisabled]}
                    disabled={!!pendingAction}
                    onPress={async () => {
                      if (emitter.isEmitting) {
                        setPendingAction("pausing");
                        await emitter.stopEmitting(emitter.eventId!);
                      } else {
                        setPendingAction("resuming");
                        await emitter.startEmitting(emitter.eventId!);
                      }
                    }}
                  >
                    <Text style={styles.btnText}>
                      {pendingAction === "pausing"
                        ? "⏳ Pausando..."
                        : pendingAction === "resuming"
                        ? "⏳ Reanudando..."
                        : emitter.isEmitting
                        ? "⏸ Pausar emisión"
                        : "▶ Reanudar emisión"}
                    </Text>
                  </Pressable>
                  <View style={{ height: 8 }} />
                  <Pressable style={[styles.btn, styles.btnDanger]} onPress={finishEventAndReset}>
                    <Text style={styles.btnText}>🏁 Finalizar evento</Text>
                  </Pressable>
                </>
              )}
            </View>
          ) : (
            <View style={styles.panel}>
              {receiver.followedEventId ? (
                <Pressable style={[styles.btn, styles.btnDanger]} onPress={stopFollowingAndReset}>
                  <Text style={styles.btnText}>✋ Dejar de seguir</Text>
                </Pressable>
              ) : (
                <>
                  <Text style={styles.label}>Unirse por nombre del evento</Text>
                  <TextInput
                    value={receiver.joinName}
                    onChangeText={receiver.setJoinName}
                    placeholder="Escribe el nombre EXACTO"
                    style={styles.input}
                    autoCapitalize="sentences"
                    autoCorrect={false}
                  />
                  <Pressable style={styles.btn} onPress={() => receiver.connectToEventByName(receiver.joinName)}>
                    <Text style={styles.btnText}>🔗 Conectar</Text>
                  </Pressable>

                  {receiver.joinStatusMsg ? <Text style={styles.small}>{receiver.joinStatusMsg}</Text> : null}

                  {receiver.nameMatches.length > 0 && (
                    <View style={{ marginTop: 10, maxHeight: 160 }}>
                      <FlatList
                        data={receiver.nameMatches}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => {
                          const ts = item?.lastLocation?.ts ?? (item?.updatedAt instanceof Timestamp ? item.updatedAt.toMillis() : undefined);
                          return (
                            <View style={styles.nearRow}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontWeight: "700" }}>{item.name ?? "Evento"}</Text>
                                <Text style={{ opacity: 0.75, fontSize: 12 }}>estado: {item.status ?? "live"} · actualizado hace {formatAge(ts)}</Text>
                              </View>
                            <Pressable
                              style={[styles.joinPill, item.status === "ended" && styles.joinPillDisabled]}
                              onPress={() => item.status !== "ended" ? receiver.followEvent(item as EventDoc) : undefined}
                            >
                              <Text style={{ color: "white", fontWeight: "700" }}>
                                {item.status === "ended" ? "Finalizado" : item.status === "paused" ? "Unirse (pausado)" : "Unirse"}
                              </Text>
                            </Pressable>
                            </View>
                          );
                        }}
                      />
                    </View>
                  )}

                  <View style={styles.separator} />
                  <Pressable style={styles.btn} onPress={nearby.loadNearbyEvents}>
                    <Text style={styles.btnText}>🧭 Buscar eventos cercanos</Text>
                  </Pressable>
                  {nearby.nearbyMsg ? <Text style={styles.small}>{nearby.nearbyMsg}</Text> : null}

                  {nearby.nearby.length > 0 && (
                    <View style={{ marginTop: 10, maxHeight: 170 }}>
                      <FlatList
                        data={nearby.nearby}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                          <View style={styles.nearRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontWeight: "700" }}>{item.name ?? "Evento"}</Text>
                              <Text style={{ opacity: 0.75, fontSize: 12 }}>{item.distanceKm?.toFixed(2)} km · {item.status}</Text>
                            </View>
                            <Pressable
                              style={[styles.joinPill, item.status === "ended" && styles.joinPillDisabled]}
                              onPress={() => item.status !== "ended" ? receiver.followEvent(item) : undefined}
                            >
                              <Text style={{ color: "white", fontWeight: "700" }}>
                                {item.status === "ended" ? "Finalizado" : item.status === "paused" ? "Unirse (pausado)" : "Unirse"}
                              </Text>
                            </Pressable>
                          </View>
                        )}
                      />
                    </View>
                  )}
                </>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Modal Acerca de */}
      <Modal
        visible={showAbout}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAbout(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { height: modalMaxHeight }]}>
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                padding: 24,
                flexGrow: 1,
                paddingBottom: Math.max(insets.bottom + 24, 80),
              }}
            >
              <Text style={styles.modalTitle}>🎺 Sigue la Charanga</Text>
              <Text style={styles.modalVersion}>Versión {APP_VERSION}</Text>

              <Text style={styles.modalSection}>¿Qué es esta app?</Text>
              <Text style={styles.modalText}>Sigue la Charanga permite seguir en tiempo real la ubicación de una charanga durante las fiestas. También sirve para cualquier otro tipo de eventos que recorran las calles.</Text>
              <Text style={styles.modalText}>Un dispositivo actúa como emisor (una persona que acompaña a la charanga) y el resto como receptores, que pueden visualizar su posición en el mapa.</Text>

              <Text style={styles.modalSection}>📡 Modo Emisor</Text>
              <Text style={styles.modalStep}>1. Selecciona la pestaña <Text style={styles.modalBold}>Emisor</Text>.</Text>
              <Text style={styles.modalStep}>2. Escribe un nombre para el evento (p. ej. "Charanga San Mateo").</Text>
              <Text style={styles.modalStep}>3. Pulsa <Text style={styles.modalBold}>Crear evento (y emitir)</Text>.</Text>
              <Text style={styles.modalStep}>4. Acepta los permisos de ubicación. Si aceptas "Ubicación siempre", la app emitirá aunque esté en segundo plano.</Text>
              <Text style={styles.modalStep}>5. Cuando termines, pulsa <Text style={styles.modalBold}>Finalizar evento</Text>.</Text>
              <Text style={styles.modalText}>Los eventos inactivos se eliminan automáticamente cada 60 minutos.</Text>

              <Text style={styles.modalSection}>🗺️ Modo Receptor</Text>
              <Text style={styles.modalStep}>1. Selecciona la pestaña <Text style={styles.modalBold}>Receptor</Text>.</Text>
              <Text style={styles.modalStep}>2. Escribe el nombre exacto del evento y pulsa <Text style={styles.modalBold}>Conectar</Text>, o usa <Text style={styles.modalBold}>Buscar eventos cercanos</Text> para ver los eventos activos en un radio de 3 km.</Text>
              <Text style={styles.modalStep}>3. Una vez conectado verás la posición de la charanga en el mapa y el rastro del recorrido.</Text>
              <Text style={styles.modalStep}>4. El punto azul del mapa indica tu propia posición.</Text>
              <Text style={styles.modalStep}>5. Para dejar de seguir, pulsa <Text style={styles.modalBold}>Dejar de seguir</Text>.</Text>

              <Text style={styles.modalSection}>Créditos</Text>
              <Text style={styles.modalText}>Idea y desarrollo: Jesús y Carlos.</Text>
              <Text style={styles.modalText}>Contacto: carlos.public@gmail.com</Text>

              <Pressable style={[styles.modalClose, { marginTop: 20 }]} onPress={() => setShowAbout(false)}>
                <Text style={styles.modalCloseText}>Cerrar</Text>
              </Pressable>
              <View style={{ height: 16 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, padding: 20, paddingBottom: 6 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "center", position: "relative" },
  title: { fontSize: 22, fontWeight: "bold", textAlign: "center" },
  infoBtn: { position: "absolute", right: 0, width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: "#FF3FA4", alignItems: "center", justifyContent: "center" },
  infoBtnText: { fontSize: 13, fontWeight: "700", color: "#FF3FA4", lineHeight: 16 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end", paddingTop: 40 },
  modalBox: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalTitle: { fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 4 },
  modalVersion: { fontSize: 12, textAlign: "center", opacity: 0.5, marginBottom: 20 },
  modalSection: { fontSize: 15, fontWeight: "700", marginTop: 16, marginBottom: 6, color: "#FF3FA4" },
  modalText: { fontSize: 14, lineHeight: 22, opacity: 0.85, marginBottom: 6 },
  modalStep: { fontSize: 14, lineHeight: 22, opacity: 0.85, marginBottom: 6 },
  modalBold: { fontWeight: "700" },
  modalClose: { backgroundColor: "#FF3FA4", borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 20 },
  modalCloseText: { color: "white", fontWeight: "700", fontSize: 15 },

  row: { flexDirection: "row", justifyContent: "center", gap: 12, marginTop: 15 },

  modeBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1 },
  modeBtnActive: { backgroundColor: "#FF3FA4", borderColor: "#FF3FA4" },
  modeBtnInactive: { backgroundColor: "#f3f4f6", borderColor: "#FFB3D9" },
  modeBtnText: { fontWeight: "bold" },
  modeBtnTextActive: { color: "white" },
  modeBtnTextInactive: { color: "#111" },

  mapContainer: { flex: 1, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#FFB3D9" },
  mapPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center", padding: 10 },

  panel: { padding: 12, borderWidth: 1, borderColor: "#FFB3D9", borderRadius: 12, marginBottom: 18 },

  label: { fontWeight: "bold" },
  input: { borderWidth: 1, padding: 8, borderRadius: 12, marginVertical: 8, borderColor: "#FFB3D9", color: "#111", backgroundColor: "#fff" },

  btn: { backgroundColor: "#FF3FA4", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, alignItems: "center" },
  btnDisabled: { backgroundColor: "#f9a8d4", opacity: 0.6 },
  btnSecondary: { backgroundColor: "#64748b" },
  btnDanger: { backgroundColor: "#dc2626" },
  btnText: { color: "white", fontWeight: "700" },

  small: { marginTop: 6, fontSize: 12, opacity: 0.78 },
  bold: { fontWeight: "700" },

  separator: { height: 1, backgroundColor: "#FFB3D9", marginVertical: 14 },
  nearRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#FFB3D9" },
  joinPill: { backgroundColor: "#FF3FA4", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
});
