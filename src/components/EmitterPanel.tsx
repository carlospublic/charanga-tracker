import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";

interface Props {
  authReady: boolean;
  authError: string | null;
  eventId: string | null;
  eventName: string;
  isEmitting: boolean;
  pendingAction: "pausing" | "resuming" | null;
  onChangeEventName: (name: string) => void;
  onCreateEventAndStart: () => void;
  onToggleEmitting: () => void;
  onFinishEvent: () => void;
}

export function EmitterPanel({
  authReady,
  authError,
  eventId,
  eventName,
  isEmitting,
  pendingAction,
  onChangeEventName,
  onCreateEventAndStart,
  onToggleEmitting,
  onFinishEvent,
}: Props) {
  return (
    <View style={styles.panel}>
      {!eventId ? (
        <>
          <Text style={styles.label}>Nombre del evento</Text>
          <TextInput
            value={eventName}
            onChangeText={onChangeEventName}
            placeholder="Ej: Charanga San Mateo"
            style={styles.input}
          />
          <Pressable
            style={[styles.btn, (!authReady || !eventName.trim()) && styles.btnDisabled]}
            onPress={onCreateEventAndStart}
            disabled={!authReady || !eventName.trim()}
          >
            <Text style={styles.btnText}>
              {authError ? "❌ Sin conexión" : authReady ? "🎺 Crear evento (y emitir)" : "⏳ Conectando..."}
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <Pressable
            style={[styles.btn, isEmitting && styles.btnSecondary, pendingAction && styles.btnDisabled]}
            disabled={!!pendingAction}
            onPress={onToggleEmitting}
          >
            <Text style={styles.btnText}>
              {pendingAction === "pausing"
                ? "⏳ Pausando..."
                : pendingAction === "resuming"
                ? "⏳ Reanudando..."
                : isEmitting
                ? "⏸ Pausar emisión"
                : "▶ Reanudar emisión"}
            </Text>
          </Pressable>
          <View style={{ height: 8 }} />
          <Pressable style={[styles.btn, styles.btnDanger]} onPress={onFinishEvent}>
            <Text style={styles.btnText}>🏁 Finalizar evento</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { padding: 12, borderWidth: 1, borderColor: "#FFB3D9", borderRadius: 12, marginBottom: 18 },
  label: { fontWeight: "bold" },
  input: { borderWidth: 1, padding: 8, borderRadius: 12, marginVertical: 8, borderColor: "#FFB3D9", color: "#111", backgroundColor: "#fff" },
  btn: { backgroundColor: "#FF3FA4", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, alignItems: "center" },
  btnDisabled: { backgroundColor: "#f9a8d4", opacity: 0.6 },
  btnSecondary: { backgroundColor: "#64748b" },
  btnDanger: { backgroundColor: "#dc2626" },
  btnText: { color: "white", fontWeight: "700" },
});
