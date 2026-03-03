import { useRef, useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, StyleSheet } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import type { LastLocation, EventDoc, Mode } from "../hooks/useEventSubscription";

interface Props {
  mode: Mode;
  lastLoc: LastLocation | undefined;
  isWaitingForGps: boolean;
  polyCoords: { latitude: number; longitude: number }[];
  eventData: EventDoc | null;
}

export function EventMap({ mode, lastLoc, isWaitingForGps, polyCoords, eventData }: Props) {
  const mapRef = useRef<MapView>(null);
  // true = el usuario ha movido el mapa manualmente: no seguimos al marcador
  const [userMovedMap, setUserMovedMap] = useState(false);

  useEffect(() => {
    if (!lastLoc || userMovedMap) return;
    mapRef.current?.animateToRegion(
      {
        latitude: lastLoc.lat,
        longitude: lastLoc.lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      400 // ms de animación
    );
  }, [lastLoc, userMovedMap]);

  const recenter = () => {
    setUserMovedMap(false);
    if (!lastLoc) return;
    mapRef.current?.animateToRegion(
      {
        latitude: lastLoc.lat,
        longitude: lastLoc.lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      400
    );
  };

  return (
    <View style={styles.mapContainer}>
      {lastLoc ? (
        <>
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            showsUserLocation={mode === "receiver"}
            // initialRegion en vez de region: evita el conflicto entre prop
            // controlado y gestos del usuario que causaba comportamiento errático
            initialRegion={{
              latitude: lastLoc.lat,
              longitude: lastLoc.lng,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
            onRegionChangeComplete={(_region, details) => {
              // details.isGesture solo está disponible en react-native-maps ≥ 1.8
              // Si no existe, asumimos que cualquier cambio de región es del usuario
              const byUser = details?.isGesture ?? true;
              if (byUser) setUserMovedMap(true);
            }}
          >
            {polyCoords.length >= 2 ? (
              <Polyline coordinates={polyCoords} strokeWidth={4} strokeColor="#FF3FA4" />
            ) : null}
            <Marker
              coordinate={{ latitude: lastLoc.lat, longitude: lastLoc.lng }}
              title={eventData?.name ?? "Charanga"}
            />
          </MapView>

          {/* Botón recentrar: solo visible cuando el usuario se ha alejado */}
          {userMovedMap && (
            <Pressable style={styles.recenterBtn} onPress={recenter}>
              <Text style={styles.recenterText}>🎯 Recentrar</Text>
            </Pressable>
          )}
        </>
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
              {mode === "receiver"
                ? "Únete a un evento o busca eventos cercanos."
                : "Crea un evento: empezará a emitir automáticamente."}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: { flex: 1, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#FFB3D9" },
  mapPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center", padding: 10 },
  small: { fontSize: 12, opacity: 0.78 },
  recenterBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "#FF3FA4",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  recenterText: { color: "white", fontWeight: "700", fontSize: 13 },
});
