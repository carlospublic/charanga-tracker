import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from "react-native";
import { Timestamp } from "firebase/firestore";
import type { EventDoc } from "../hooks/useEventSubscription";

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

interface NearbyEvent extends EventDoc {
  distanceKm?: number;
}

interface Props {
  followedEventId: string | null;
  joinName: string;
  isSearching: boolean;
  joinStatusMsg: string;
  nameMatches: EventDoc[];
  nearby: NearbyEvent[];
  nearbyMsg: string;
  onChangeJoinName: (name: string) => void;
  onConnect: () => void;
  onFollowEvent: (event: EventDoc) => void;
  onLoadNearby: () => void;
  onStopFollowing: () => void;
}

export function ReceiverPanel({
  followedEventId,
  joinName,
  isSearching,
  joinStatusMsg,
  nameMatches,
  nearby,
  nearbyMsg,
  onChangeJoinName,
  onConnect,
  onFollowEvent,
  onLoadNearby,
  onStopFollowing,
}: Props) {
  if (followedEventId) {
    return (
      <View style={styles.panel}>
        <Pressable style={[styles.btn, styles.btnDanger]} onPress={onStopFollowing}>
          <Text style={styles.btnText}>✋ Dejar de seguir</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.label}>Unirse por nombre del evento</Text>
      <TextInput
        value={joinName}
        onChangeText={onChangeJoinName}
        placeholder="Escribe el nombre EXACTO"
        style={styles.input}
        autoCapitalize="sentences"
        autoCorrect={false}
      />
      <Pressable
        style={[styles.btn, isSearching && styles.btnDisabled]}
        onPress={onConnect}
        disabled={isSearching}
      >
        <Text style={styles.btnText}>{isSearching ? "⏳ Buscando..." : "🔗 Conectar"}</Text>
      </Pressable>

      {joinStatusMsg ? <Text style={styles.small}>{joinStatusMsg}</Text> : null}

      {nameMatches.length > 0 && (
        <View style={{ marginTop: 10, maxHeight: 160 }}>
          <FlatList
            data={nameMatches}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const ts =
                item?.lastLocation?.ts ??
                (item?.updatedAt instanceof Timestamp ? item.updatedAt.toMillis() : undefined);
              return (
                <View style={styles.nearRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "700" }}>{item.name ?? "Evento"}</Text>
                    <Text style={{ opacity: 0.75, fontSize: 12, color: "#111" }}>
                      estado: {item.status ?? "live"} · actualizado hace {formatAge(ts)}
                    </Text>
                  </View>
                  <Pressable
                    style={[styles.joinPill, item.status === "ended" && styles.joinPillDisabled]}
                    onPress={() => item.status !== "ended" ? onFollowEvent(item) : undefined}
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

      <Pressable style={styles.btn} onPress={onLoadNearby}>
        <Text style={styles.btnText}>🧭 Buscar eventos cercanos</Text>
      </Pressable>
      {nearbyMsg ? <Text style={styles.small}>{nearbyMsg}</Text> : null}

      {nearby.length > 0 && (
        <View style={{ marginTop: 10, maxHeight: 170 }}>
          <FlatList
            data={nearby}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.nearRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "700" }}>{item.name ?? "Evento"}</Text>
                  <Text style={{ opacity: 0.75, fontSize: 12, color: "#111" }}>
                    {item.distanceKm?.toFixed(2)} km · {item.status}
                  </Text>
                </View>
                <Pressable
                  style={[styles.joinPill, item.status === "ended" && styles.joinPillDisabled]}
                  onPress={() => item.status !== "ended" ? onFollowEvent(item) : undefined}
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
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { padding: 12, borderWidth: 1, borderColor: "#FFB3D9", borderRadius: 12, marginBottom: 18 },
  label: { fontWeight: "bold", color: "#111" },
  input: { borderWidth: 1, padding: 8, borderRadius: 12, marginVertical: 8, borderColor: "#FFB3D9", color: "#111", backgroundColor: "#fff" },
  btn: { backgroundColor: "#FF3FA4", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, alignItems: "center" },
  btnDisabled: { backgroundColor: "#f9a8d4", opacity: 0.6 },
  btnDanger: { backgroundColor: "#dc2626" },
  btnText: { color: "white", fontWeight: "700" },
  small: { marginTop: 6, fontSize: 12, opacity: 0.78, color: "#111" },
  separator: { height: 1, backgroundColor: "#FFB3D9", marginVertical: 14 },
  nearRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#FFB3D9" },
  joinPill: { backgroundColor: "#FF3FA4", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  joinPillDisabled: { backgroundColor: "#9ca3af" },
});
