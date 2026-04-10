import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWindowDimensions } from "react-native";

interface Props {
  visible: boolean;
  onAccept: () => void;
  onCancel: () => void;
}

/**
 * Aviso destacado de ubicación en segundo plano.
 *
 * Google Play exige mostrar este diálogo ANTES de solicitar el permiso
 * ACCESS_BACKGROUND_LOCATION. Debe:
 *  - Ser claramente visible (modal, no toast ni texto pequeño)
 *  - Explicar qué datos se recogen, por qué y cómo se usan
 *  - Requerir acción explícita del usuario antes de pedir el permiso
 *
 * Ref: https://support.google.com/googleplay/android-developer/answer/9799150
 */
export function BackgroundLocationDisclosureModal({ visible, onAccept, onCancel }: Props) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const modalMaxHeight = screenHeight * 0.85 - insets.top - insets.bottom;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onCancel}
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
            <Text style={styles.modalTitle}>📍 Uso de ubicación en segundo plano</Text>

            <Text style={styles.modalText}>
              Para que otros miembros del grupo puedan seguirte en el mapa,{" "}
              <Text style={styles.modalBold}>
                esta aplicación necesita acceder a tu ubicación incluso cuando está en segundo plano
              </Text>{" "}
              (pantalla apagada o usando otra app).
            </Text>

            <Text style={styles.modalSection}>¿Qué datos se recogen?</Text>
            <Text style={styles.modalText}>
              Tu posición GPS (latitud, longitud, precisión y dirección) mientras el evento esté activo.
            </Text>

            <Text style={styles.modalSection}>¿Para qué se usan?</Text>
            <Text style={styles.modalText}>
              Exclusivamente para mostrar tu posición en tiempo real a quienes siguen tu charanga.
              Los datos <Text style={styles.modalBold}>no se venden ni se comparten</Text> con terceros.
            </Text>

            <Text style={styles.modalSection}>¿Cuándo se recogen?</Text>
            <Text style={styles.modalText}>
              Solo mientras tengas un evento activo. La recogida se detiene al pausar o finalizar el evento.
            </Text>

            <Text style={styles.modalSection}>¿Cómo desactivarlo?</Text>
            <Text style={styles.modalText}>
              En cualquier momento puedes revocar el permiso en{" "}
              <Text style={styles.modalBold}>
                Ajustes → Aplicaciones → Sigue la Charanga → Permisos → Ubicación
              </Text>.
            </Text>

            <View style={styles.actions}>
              <Pressable style={styles.btnCancel} onPress={onCancel}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.btnAccept} onPress={onAccept}>
                <Text style={styles.btnAcceptText}>Entendido, continuar</Text>
              </Pressable>
            </View>
            <View style={{ height: 16 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end", paddingTop: 40 },
  modalBox: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalTitle: { fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 16, color: "#111" },
  modalSection: { fontSize: 15, fontWeight: "700", marginTop: 16, marginBottom: 6, color: "#FF3FA4" },
  modalText: { fontSize: 14, lineHeight: 22, opacity: 0.85, marginBottom: 6, color: "#111" },
  modalBold: { fontWeight: "700", color: "#111" },
  actions: { flexDirection: "row", gap: 10, marginTop: 24 },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#FFB3D9",
    alignItems: "center",
  },
  btnCancelText: { color: "#FF3FA4", fontWeight: "600", fontSize: 15 },
  btnAccept: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#FF3FA4",
    alignItems: "center",
  },
  btnAcceptText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
