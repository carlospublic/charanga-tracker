import { View, Text, Pressable, StyleSheet, BackHandler, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { APP_VERSION } from "../version";

interface Props {
  minVersion: string | null;
}

export function UpdateRequired({ minVersion }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" backgroundColor="#fff" translucent={false} />
      <View style={styles.container}>
        <Text style={styles.emoji}>🎺</Text>
        <Text style={styles.title}>Actualización necesaria</Text>
        <Text style={styles.body}>
          Esta versión de la app ({APP_VERSION}) ya no es compatible.
          {minVersion ? ` Se requiere la versión ${minVersion} o superior.` : ""}
        </Text>
        <Text style={styles.body}>
          Actualiza para seguir usando Sigue la Charanga.
        </Text>
        {Platform.OS === "android" && (
          <Pressable style={styles.btn} onPress={() => BackHandler.exitApp()}>
            <Text style={styles.btnText}>Salir</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32, gap: 16 },
  emoji: { fontSize: 64 },
  title: { fontSize: 22, fontWeight: "bold", textAlign: "center", color: "#111" },
  body: { fontSize: 15, lineHeight: 22, textAlign: "center", opacity: 0.75, color: "#111" },
  btn: { width: "100%", backgroundColor: "#FF3FA4", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  btnText: { color: "white", fontWeight: "700", fontSize: 15 },
});
