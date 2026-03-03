import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

export default function Cantidad() {
  const [pastillas, setPastillas] = useState<any[]>([]);

  const cargarDatos = async () => {
    try {
      // Cargar programacion
      const progGuardada = await AsyncStorage.getItem("programacion");
      const programacion = progGuardada ? JSON.parse(progGuardada) : [];

      // Cargar consumidas guardadas
      const cantGuardada = await AsyncStorage.getItem("cantidad");
      const cantidadAnterior = cantGuardada ? JSON.parse(cantGuardada) : [];

    // Agrupar pastillas con el mismo nombre y sumar sus dosis
      const agrupadas: any = {};
      programacion.forEach((p: any) => {
        const nombre = p.nombre || "Sin nombre";
        const total = p.dosis.reduce((acc: number, d: string) => {
          return acc + (parseFloat(d) || 0);
        }, 0);
        if (agrupadas[nombre]) {
          agrupadas[nombre] += total;
        } else {
          agrupadas[nombre] = total;
        }
      });

      const nuevas = Object.keys(agrupadas).map((nombre) => {
        const total = agrupadas[nombre];
        const anterior = cantidadAnterior.find((c: any) => c.nombre === nombre);
        const consumidas = anterior ? anterior.consumidas : "";
        const restantes = (total - (parseFloat(consumidas) || 0)).toString();
        return {
          nombre,
          totalSemana: total.toString(),
          consumidas,
          restantes,
        };
      });

      setPastillas(nuevas);
      await AsyncStorage.setItem("cantidad", JSON.stringify(nuevas));
    } catch (e) {}
  };

  // Se recarga cada vez que entras a esta pantalla
  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
  );

  const actualizarConsumidas = (index: number, valor: string) => {
    const nuevas = [...pastillas];
    nuevas[index].consumidas = valor;
    const total = parseFloat(nuevas[index].totalSemana) || 0;
    const consumidas = parseFloat(valor) || 0;
    nuevas[index].restantes = (total - consumidas).toString();
    setPastillas(nuevas);
    AsyncStorage.setItem("cantidad", JSON.stringify(nuevas));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image source={require("../assets/images/logo.jpeg")} style={styles.logo} resizeMode="contain" />
      </View>

      <Text style={styles.titulo}>Cantidad de Pastillas</Text>

      <View style={styles.fila}>
        <View style={[styles.celdaNombre, styles.celdaHeader]}>
          <Text style={styles.headerTexto}>Pastilla</Text>
        </View>
        <View style={[styles.celdaNum, styles.celdaHeader]}>
          <Text style={styles.headerTexto}>Total{"\n"}Semana</Text>
        </View>
        <View style={[styles.celdaNum, styles.celdaHeader]}>
          <Text style={styles.headerTexto}>Consu-{"\n"}midas</Text>
        </View>
        <View style={[styles.celdaNum, styles.celdaHeader]}>
          <Text style={styles.headerTexto}>Res-{"\n"}tantes</Text>
        </View>
      </View>

      {pastillas.length === 0 ? (
        <Text style={styles.vacio}>Agrega pastillas en la pantalla de Programación</Text>
      ) : (
        pastillas.map((p, i) => (
          <View key={i} style={[styles.fila, { backgroundColor: i % 2 === 0 ? "#EBF8FB" : "#FFFFFF" }]}>
            <View style={styles.celdaNombre}>
              <Text style={styles.input}>{p.nombre || "Sin nombre"}</Text>
            </View>
            <View style={styles.celdaNum}>
              <Text style={styles.inputNum}>{p.totalSemana}</Text>
            </View>
            <View style={styles.celdaNum}>
              <TextInput
                style={styles.inputNum}
                placeholder="0"
                placeholderTextColor="#A78BFA"
                keyboardType="decimal-pad"
                value={p.consumidas}
                onChangeText={(v) => actualizarConsumidas(i, v)}
              />
            </View>
            <View style={styles.celdaNum}>
              <Text style={[styles.inputNum, {
                color: parseFloat(p.restantes) < 0 ? "red" :
                       parseFloat(p.restantes) <= 2 ? "orange" : "#6D28D9"
              }]}>{p.restantes}</Text>
            </View>
          </View>
        ))
      )}
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
  celdaNombre: { flex: 2, padding: 8, justifyContent: "center", borderRightWidth: 1, borderRightColor: "#E9D5FF" },
  celdaNum: { flex: 1, padding: 8, alignItems: "center", justifyContent: "center", borderRightWidth: 1, borderRightColor: "#E9D5FF" },
  headerTexto: { color: "#FFFFFF", fontWeight: "bold", textAlign: "center", fontSize: 13 },
  input: { fontSize: 13, color: "#6D28D9" },
  inputNum: { fontSize: 13, color: "#6D28D9", textAlign: "center" },
  vacio: { textAlign: "center", color: "#A78BFA", marginTop: 40, fontSize: 15 },
});