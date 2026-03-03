import { useRouter } from "expo-router";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Index() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require("../assets/images/logo.jpeg")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.menu}>
        <TouchableOpacity style={styles.boton} onPress={() => router.push("/programacion")}>
          <Text style={styles.botonTexto}>📅  Programación</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.boton}>
          <Text style={styles.botonTexto}>📊  Resumen Pastillas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.boton} onPress={() => router.push("/cantidad")}>
          <Text style={styles.botonTexto}>💊  Cantidad Pastillas</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F0FF" },
  header: { backgroundColor: "#FFFFFF", alignItems: "center", paddingVertical: 10 },
  logo: { width: 350, height: 140, alignSelf: "center" },
  menu: { flex: 1, padding: 24, gap: 16, justifyContent: "center" },
  boton: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 6,
    borderLeftColor: "#8B5CF6",
    elevation: 3,
  },
  botonTexto: { fontSize: 18, color: "#6D28D9", fontWeight: "600" },
});