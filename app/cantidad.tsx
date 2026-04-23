import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function Cantidad() {
  const router = useRouter();
  const [pastillas, setPastillas] = useState<any[]>([]);
  const [pastillaSeleccionada, setPastillaSeleccionada] = useState<string | null>(null);

  const cerrarMesSiCambio = async (cantidadActual: any[]) => {
    try {
      const hoy = new Date();
      const mesActual = `${hoy.getFullYear()}-${hoy.getMonth()}`;
      const ultimoMes = await AsyncStorage.getItem("ultimoMes");

      if (ultimoMes && ultimoMes !== mesActual) {
        const historialGuardado = await AsyncStorage.getItem("historialMensual");
        const historial = historialGuardado ? JSON.parse(historialGuardado) : {};

        const partes = ultimoMes.split("-");
        const mesNombre = MESES[parseInt(partes[1])];
        const anio = partes[0];
        const clavesMes = `${mesNombre} ${anio}`;
        const claveAcumulado = `acumulado-${ultimoMes}`;
        const acumuladoGuardado = await AsyncStorage.getItem(claveAcumulado);
        const acumulado = acumuladoGuardado ? JSON.parse(acumuladoGuardado) : {};

        cantidadActual.forEach((p: any) => {
          if (!historial[p.nombre]) historial[p.nombre] = [];
          const diasDelMes = new Date(parseInt(partes[0]), parseInt(partes[1]) + 1, 0).getDate();
          const totalMensual = (parseFloat(p.totalSemana) || 0) / 7 * diasDelMes;
          const consumidas = acumulado[p.nombre] || parseFloat(p.consumidas) || 0;
          const porcentaje = totalMensual > 0 ? Math.min(Math.round(consumidas / totalMensual * 100), 100) : 0;
          historial[p.nombre].push({ mes: clavesMes, porcentaje });
          if (historial[p.nombre].length > 6) historial[p.nombre].shift();
        });

        await AsyncStorage.setItem("historialMensual", JSON.stringify(historial));
        await AsyncStorage.removeItem(claveAcumulado);

        const reseteadas = cantidadActual.map((p: any) => ({ ...p, consumidas: "" }));
        await AsyncStorage.setItem("cantidad", JSON.stringify(reseteadas));
      }

      await AsyncStorage.setItem("ultimoMes", mesActual);
    } catch (e) {}
  };

  const cargarDatos = async () => {
    try {
      const progGuardada = await AsyncStorage.getItem("programacion");
      const programacion = progGuardada ? JSON.parse(progGuardada) : [];
      const cantGuardada = await AsyncStorage.getItem("cantidad");
      const cantidadAnterior = cantGuardada ? JSON.parse(cantGuardada) : [];

      const agrupadas: any = {};
      programacion.forEach((p: any) => {
        const nombre = p.nombre || "Sin nombre";
        const total = p.dosis.reduce((acc: number, d: string) => acc + (parseFloat(d) || 0), 0);
        if (agrupadas[nombre]) agrupadas[nombre] += total;
        else agrupadas[nombre] = total;
      });

      const nuevas = Object.keys(agrupadas).map((nombre) => {
        const total = agrupadas[nombre];
        const anterior = cantidadAnterior.find((c: any) => c.nombre === nombre);
        const consumidas = anterior ? anterior.consumidas : "";
        const recargada = anterior ? anterior.recargada : "";
        const restantes = (total - (parseFloat(consumidas) || 0)).toString();
        const recargadaRestante = ((parseFloat(recargada) || 0) - (parseFloat(consumidas) || 0)).toString();
        return { nombre, totalSemana: total.toString(), consumidas, restantes, recargada, recargadaRestante };
      });

      await cerrarMesSiCambio(nuevas);
      setPastillas(nuevas);
      await AsyncStorage.setItem("cantidad", JSON.stringify(nuevas));
    } catch (e) {}
  };

  useFocusEffect(useCallback(() => { cargarDatos(); }, []));

  const actualizar = async (index: number, campo: string, valor: string) => {
    const nuevas = [...pastillas];
    (nuevas[index] as any)[campo] = valor;
    const total = parseFloat(nuevas[index].totalSemana) || 0;
    const consumidas = parseFloat(nuevas[index].consumidas) || 0;
    const recargada = parseFloat(nuevas[index].recargada) || 0;
    nuevas[index].restantes = (total - consumidas).toString();
    nuevas[index].recargadaRestante = (recargada - consumidas).toString();
    setPastillas(nuevas);
    AsyncStorage.setItem("cantidad", JSON.stringify(nuevas));

    if (campo === "consumidas") {
      try {
        const hoy = new Date();
        const claveAcumulado = `acumulado-${hoy.getFullYear()}-${hoy.getMonth()}`;
        const acumuladoGuardado = await AsyncStorage.getItem(claveAcumulado);
        const acumulado = acumuladoGuardado ? JSON.parse(acumuladoGuardado) : {};
        acumulado[nuevas[index].nombre] = parseFloat(valor) || 0;
        await AsyncStorage.setItem(claveAcumulado, JSON.stringify(acumulado));
      } catch (e) {}
    }
  };

  const colorRestantes = (valor: string) => {
    const num = parseFloat(valor) || 0;
    if (num < 0) return "red";
    if (num <= 2) return "orange";
    return "#6D28D9";
  };

  const colorRecargada = (valor: string) => {
    const num = parseFloat(valor) || 0;
    if (num <= 0) return "red";
    if (num <= 3) return "orange";
    return "#6D28D9";
  };

  const calcularTotalMes = (totalSemana: string) => {
    const hoy = new Date();
    const diasDelMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
    const porDia = (parseFloat(totalSemana) || 0) / 7;
    return (porDia * diasDelMes).toFixed(1);
  };

  const nombresPastillas = [...new Set(pastillas.map(p => p.nombre))];
  const pastillaActual = pastillas.find(p => p.nombre === pastillaSeleccionada);
  const indexActual = pastillas.findIndex(p => p.nombre === pastillaSeleccionada);

  return (
    <View style={{ flex: 1 }}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (pastillaSeleccionada) setPastillaSeleccionada(null);
          else router.back();
        }} style={styles.botonVolverHeader}>
          <Text style={styles.botonVolverHeaderTexto}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Cantidad de Pastillas</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

        {/* BOTONES */}
        {!pastillaSeleccionada && (
          <View style={styles.botonesContainer}>
            {nombresPastillas.length === 0 ? (
              <Text style={styles.vacio}>Agrega pastillas en Programación</Text>
            ) : (
              nombresPastillas.map((nombre, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.botonPastilla}
                  onPress={() => setPastillaSeleccionada(nombre)}
                >
                  <Text style={styles.botonPastillaTexto}>💊 {nombre}</Text>
                  <Text style={styles.botonPastillaFlecha}>›</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* DETALLE */}
        {pastillaSeleccionada && pastillaActual && (
          <View style={styles.detalleContainer}>
            <Text style={styles.detalleTitulo}>{pastillaSeleccionada}</Text>

            {/* Fila 1: Consumidas por semana + Restantes */}
            <View style={styles.tarjetasRow}>
              <View style={styles.tarjeta}>
                <Text style={styles.tarjetaLabel}>Consumidas por semana</Text>
                <TextInput
                  style={styles.tarjetaInput}
                  placeholder="0"
                  placeholderTextColor="#A78BFA"
                  keyboardType="decimal-pad"
                  value={pastillaActual.consumidas}
                  onChangeText={(v) => {
                    actualizar(indexActual, "consumidas", v);
                    setPastillaSeleccionada(pastillaSeleccionada);
                  }}
                />
              </View>
              <View style={[styles.tarjeta, { borderColor: colorRestantes(pastillaActual.restantes) }]}>
                <Text style={styles.tarjetaLabel}>Restantes</Text>
                <Text style={[styles.tarjetaValor, { color: colorRestantes(pastillaActual.restantes) }]}>
                  {pastillaActual.restantes}
                </Text>
              </View>
            </View>

            {/* Fila 2: Recarga semanal + Recarga Restantes */}
            <View style={styles.tarjetasRow}>
              <View style={styles.tarjeta}>
                <Text style={styles.tarjetaLabel}>Recarga semanal</Text>
                <TextInput
                  style={styles.tarjetaInput}
                  placeholder="0"
                  placeholderTextColor="#A78BFA"
                  keyboardType="decimal-pad"
                  value={pastillaActual.recargada}
                  onChangeText={(v) => {
                    actualizar(indexActual, "recargada", v);
                    setPastillaSeleccionada(pastillaSeleccionada);
                  }}
                />
              </View>
              <View style={[styles.tarjeta, { borderColor: colorRecargada(pastillaActual.recargadaRestante) }]}>
                <Text style={styles.tarjetaLabel}>Recarga Restantes</Text>
                <Text style={[styles.tarjetaValor, { color: colorRecargada(pastillaActual.recargadaRestante) }]}>
                  {pastillaActual.recargadaRestante}
                </Text>
              </View>
            </View>

            {/* Fila 3: Total Semana */}
            <View style={styles.tarjetasRow}>
              <View style={styles.tarjeta}>
                <Text style={styles.tarjetaLabel}>Total Semana</Text>
                <Text style={styles.tarjetaValor}>{pastillaActual.totalSemana}</Text>
              </View>
            </View>

            {/* Fila 4: Total Mes */}
            <View style={styles.tarjetasRow}>
              <View style={styles.tarjeta}>
                <Text style={styles.tarjetaLabel}>Total Mes ({new Date().toLocaleString("es", { month: "long" })})</Text>
                <Text style={styles.tarjetaValor}>{calcularTotalMes(pastillaActual.totalSemana)}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F0FF" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#8B5CF6", paddingHorizontal: 16, paddingVertical: 14, paddingTop: 50 },
  botonVolverHeader: { width: 80 },
  botonVolverHeaderTexto: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  headerTitulo: { fontSize: 18, fontWeight: "bold", color: "#FFFFFF", textAlign: "center" },
  botonesContainer: { paddingHorizontal: 16, gap: 10, marginTop: 16 },
  botonPastilla: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16, borderWidth: 2, borderColor: "#8B5CF6", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  botonPastillaTexto: { color: "#6D28D9", fontWeight: "bold", fontSize: 16 },
  botonPastillaFlecha: { color: "#8B5CF6", fontSize: 24, fontWeight: "bold" },
  detalleContainer: { paddingHorizontal: 16, marginTop: 16 },
  detalleTitulo: { fontSize: 22, fontWeight: "bold", color: "#6D28D9", textAlign: "center", marginBottom: 20 },
  tarjetasRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  tarjeta: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16, borderWidth: 2, borderColor: "#C4B5FD", alignItems: "center" },
  tarjetaLabel: { fontSize: 12, color: "#A78BFA", fontWeight: "bold", marginBottom: 8, textAlign: "center" },
  tarjetaValor: { fontSize: 22, fontWeight: "bold", color: "#6D28D9" },
  tarjetaInput: { fontSize: 22, fontWeight: "bold", color: "#6D28D9", textAlign: "center", borderBottomWidth: 2, borderBottomColor: "#C4B5FD", minWidth: 60 },
  vacio: { textAlign: "center", color: "#A78BFA", marginTop: 40, fontSize: 15, padding: 24 },
});