import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

const DIAS = ["L", "M", "M", "J", "V", "S", "D"];

export default function Programacion() {
  const [pastillas, setPastillas] = useState([
    { nombre: "", dosis: ["", "", "", "", "", "", ""], hora: "" }
  ]);

  // Cargar datos guardados al abrir la pantalla
  useEffect(() => {
    const cargar = async () => {
      try {
        const guardado = await AsyncStorage.getItem("programacion");
        if (guardado) setPastillas(JSON.parse(guardado));
      } catch (e) {}
    };
    cargar();
  }, []);

  // Guardar automaticamente cada vez que cambia algo
  const guardar = async (nuevas: any) => {
    try {
      await AsyncStorage.setItem("programacion", JSON.stringify(nuevas));
    } catch (e) {}
  };

  const agregarPastilla = () => {
    const nuevas = [...pastillas, { nombre: "", dosis: ["", "", "", "", "", "", ""], hora: "" }];
    setPastillas(nuevas);
    guardar(nuevas);
  };

  const actualizarNombre = (index: number, valor: string) => {
    const nuevas = [...pastillas];
    nuevas[index].nombre = valor;
    setPastillas(nuevas);
    guardar(nuevas);
  };

  const actualizarDosis = (indexPastilla: number, indexDia: number, valor: string) => {
    const nuevas = [...pastillas];
    nuevas[indexPastilla].dosis[indexDia] = valor;
    setPastillas(nuevas);
    guardar(nuevas);
  };

  const actualizarHora = (index: number, valor: string) => {
    const nuevas = [...pastillas];
    nuevas[index].hora = valor;
    setPastillas(nuevas);
    guardar(nuevas);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image source={require("../assets/images/logo.jpeg")} style={styles.logo} resizeMode="contain" />
      </View>

      <Text style={styles.titulo}>Programación de Pastillas</Text>

      <ScrollView horizontal>
        <View>
          <View style={styles.fila}>
            <View style={[styles.celdaNombre, styles.celdaHeader]}>
              <Text style={styles.headerTexto}>Pastilla</Text>
            </View>
            {DIAS.map((dia, i) => (
              <View key={i} style={[styles.celdaDia, styles.celdaHeader]}>
                <Text style={styles.headerTexto}>{dia}</Text>
              </View>
            ))}
            <View style={[styles.celdaHora, styles.celdaHeader]}>
              <Text style={styles.headerTexto}>Hora</Text>
            </View>
          </View>

          {pastillas.map((pastilla, i) => (
            <View key={i} style={[styles.fila, { backgroundColor: i % 2 === 0 ? "#EBF8FB" : "#FFFFFF" }]}>
              <View style={styles.celdaNombre}>
                <TextInput
                  style={styles.input}
                  placeholder="Nombre"
                  placeholderTextColor="#A78BFA"
                  value={pastilla.nombre}
                  onChangeText={(v) => actualizarNombre(i, v)}
                />
              </View>
              {pastilla.dosis.map((dosis, j) => (
                <View key={j} style={styles.celdaDia}>
                  <TextInput
                    style={styles.inputDosis}
                    placeholder="0"
                    placeholderTextColor="#A78BFA"
                    keyboardType="decimal-pad"
                    value={dosis}
                    onChangeText={(v) => actualizarDosis(i, j, v)}
                  />
                </View>
              ))}
              <View style={styles.celdaHora}>
                <TextInput
                  style={styles.input}
                  placeholder="8:00"
                  placeholderTextColor="#A78BFA"
                  value={pastilla.hora}
                  keyboardType="numeric"
                  maxLength={5}
                  onChangeText={(v) => {
                    const soloNumeros = v.replace(/[^0-9]/g, "").slice(0, 4);
                    actualizarHora(i, soloNumeros);
                }}
                onBlur={() => {
                  const nums = pastilla.hora.replace(/[^0-9]/g, "");
                  if (nums.length === 0) return;
                  let horas = "", minutos = "";
                  if (nums.length === 1) {
                    horas = "0" + nums;
                    minutos = "00";
                  } else if (nums.length === 2) {
                    horas = nums;
                    minutos = "00";
                  } else if (nums.length === 3) {
                    horas = "0" + nums[0];
                    minutos = nums.slice(1);
                  } else {
                    horas = nums.slice(0, 2);
                    minutos = nums.slice(2, 4);
                  }
                  const h = Math.min(parseInt(horas), 23).toString().padStart(2, "0");
                  const m = Math.min(parseInt(minutos), 59).toString().padStart(2, "0");
                  actualizarHora(i, `${h}:${m}`);
                }}
                />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.botonAgregar} onPress={agregarPastilla}>
        <Text style={styles.botonTexto}>+ Agregar Pastilla</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F0FF" },
  header: { backgroundColor: "#FFFFFF", alignItems: "center", paddingVertical: 10 },
  logo: { width: 350, height: 140, alignSelf: "center" },
  titulo: { fontSize: 20, fontWeight: "bold", color: "#6D28D9", textAlign: "center", marginVertical: 16 },
  fila: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E9D5FF" },
  celdaHeader: { backgroundColor: "#8B5CF6" },
  celdaNombre: { width: 80, padding: 4, justifyContent: "center", borderRightWidth: 1, borderRightColor: "#E9D5FF" },
  celdaDia: { width: 34, padding: 2, alignItems: "center", justifyContent: "center", borderRightWidth: 1, borderRightColor: "#E9D5FF" },
  celdaHora: { width: 60, padding: 4, justifyContent: "center" },
  headerTexto: { color: "#FFFFFF", fontWeight: "bold", textAlign: "center", fontSize: 13 },
  input: { fontSize: 11, color: "#6D28D9" },
  inputDosis: { fontSize: 11, color: "#6D28D9", textAlign: "center", width: 30 },
  botonAgregar: {
    margin: 16, padding: 14, borderRadius: 12,
    backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: "#8B5CF6", alignItems: "center"
  },
  botonTexto: { color: "#8B5CF6", fontWeight: "bold", fontSize: 16 },
});