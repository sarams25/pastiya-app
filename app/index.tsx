import { useRouter } from "expo-router";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Index() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require("../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.menu}>
        <TouchableOpacity style={styles.boton} onPress={() => router.push("/programacion")}>
          <Text style={styles.botonTexto}>💊 Programación</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.boton} onPress={() => router.push("/cantidad")}>
          <Text style={styles.botonTexto}>📦 Cantidad Pastillas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.boton} onPress={() => router.push("/resumen")}>
          <Text style={styles.botonTexto}>📊 Resumen Pastillas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.boton, styles.botonAgente]} onPress={() => router.push("/agente")}>
          <Text style={styles.botonTextoAgente}>🤖 Agente Inteligente PastiYa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F0FF" },
  header: { backgroundColor: "#F3F0FF", alignItems: "center", marginTop: -60, marginBottom: -40 },
  logo: { width: "100%", height: undefined, aspectRatio: 1, alignSelf: "center" },
  menu: { flex: 1, paddingHorizontal: 24, paddingBottom: 24, gap: 12, justifyContent: "center" },
  boton: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 6,
    borderLeftColor: "#8B5CF6",
    elevation: 3,
  },
  botonTexto: { fontSize: 18, color: "#6D28D9", fontWeight: "600" },
  botonAgente: {
    borderLeftColor: "#0EA5E9", // Azul celeste para agente IA
    backgroundColor: "#F0F9FF",
  },
  botonTextoAgente: { fontSize: 18, color: "#0369A1", fontWeight: "700" },
});