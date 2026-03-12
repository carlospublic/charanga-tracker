import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWindowDimensions } from "react-native";
import { APP_VERSION } from "../version";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function AboutModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const modalMaxHeight = screenHeight * 0.85 - insets.top - insets.bottom;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
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
           <Text style={styles.modalText}>Sigue la Charanga permite conocer en tiempo real la ubicación de una charanga durante las fiestas. También puede utilizarse para cualquier otro tipo de evento que recorra las calles.</Text>
          <Text style={styles.modalText}>Un dispositivo que acompaña a la charanga actúa como emisor y comparte la ubicación del evento. El resto de dispositivos actúan como receptores y pueden visualizar su posición en el mapa.</Text>

            <Text style={styles.modalSection}>📡 Modo Emisor</Text>
            <Text style={styles.modalStep}>1. Selecciona la pestaña <Text style={styles.modalBold}>Emisor</Text>.</Text>
            <Text style={styles.modalStep}>2. Escribe un nombre para el evento (p. ej. "Charanga San Mateo").</Text>
            <Text style={styles.modalStep}>3. Pulsa <Text style={styles.modalBold}>Crear evento (y emitir)</Text>.</Text>
            <Text style={styles.modalStep}>4. Acepta los permisos de ubicación. Si aceptas "Ubicación siempre", la app emitirá aunque esté en segundo plano.</Text>
            <Text style={styles.modalStep}>5. Cuando termines, pulsa <Text style={styles.modalBold}>Finalizar evento</Text>.</Text>
            <Text style={styles.modalText}>Los eventos inactivos se marcan como finalizados automáticamente tras 1 hora sin actividad, y se eliminan definitivamente a los 7 días.</Text>

            <Text style={styles.modalSection}>🗺️ Modo Receptor</Text>
            <Text style={styles.modalStep}>1. Selecciona la pestaña <Text style={styles.modalBold}>Receptor</Text>.</Text>
            <Text style={styles.modalStep}>2. Escribe el nombre exacto del evento y pulsa <Text style={styles.modalBold}>Conectar</Text>, o usa <Text style={styles.modalBold}>Buscar eventos cercanos</Text> para ver los eventos activos en un radio de 3 km.</Text>
            <Text style={styles.modalStep}>3. Una vez conectado verás la posición de la charanga en el mapa y el rastro del recorrido.</Text>
            <Text style={styles.modalStep}>4. El punto azul del mapa indica tu propia posición.</Text>
            <Text style={styles.modalStep}>5. Para dejar de seguir, pulsa <Text style={styles.modalBold}>Dejar de seguir</Text>.</Text>

            <Text style={styles.modalSection}>Créditos</Text>
            <Text style={styles.modalText}>Idea y desarrollo: Jesús y Carlos.</Text>
            <Text style={styles.modalText}>Dedicado a Joaquín.</Text>
            <Text style={styles.modalText}>Contacto: carlos.public@gmail.com</Text>

            <Pressable style={[styles.modalClose, { marginTop: 20 }]} onPress={onClose}>
              <Text style={styles.modalCloseText}>Cerrar</Text>
            </Pressable>
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
  modalTitle: { fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 4, color: "#111" },
  modalVersion: { fontSize: 12, textAlign: "center", opacity: 0.5, marginBottom: 20, color: "#111" },
  modalSection: { fontSize: 15, fontWeight: "700", marginTop: 16, marginBottom: 6, color: "#FF3FA4" },
  modalText: { fontSize: 14, lineHeight: 22, opacity: 0.85, marginBottom: 6, color: "#111" },
  modalStep: { fontSize: 14, lineHeight: 22, opacity: 0.85, marginBottom: 6, color: "#111" },
  modalBold: { fontWeight: "700", color: "#111" },
  modalClose: { backgroundColor: "#FF3FA4", borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 20 },
  modalCloseText: { color: "white", fontWeight: "700", fontSize: 15 },
});
