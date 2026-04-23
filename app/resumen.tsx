import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BarChart } from "react-native-chart-kit";

const ANCHO = Dimensions.get("window").width - 32;
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const getColorBarra = (porcentaje: number) => {
  if (porcentaje >= 90) return "#22C55E";
  if (porcentaje >= 50) return "#EAB308";
  return "#EF4444";
};

export default function Resumen() {
  const router = useRouter();
  const [vista, setVista] = useState<"semanal" | "mensual" | "tabla">("semanal");
  const [datos, setDatos] = useState<any[]>([]);
  const [historial, setHistorial] = useState<any>({});
  const [pastillaSeleccionada, setPastillaSeleccionada] = useState<string | null>(null);

  const cargarDatos = async () => {
    try {
      const progGuardada = await AsyncStorage.getItem("programacion");
      const programacion = progGuardada ? JSON.parse(progGuardada) : [];
      const cantGuardada = await AsyncStorage.getItem("cantidad");
      const cantidadAnterior = cantGuardada ? JSON.parse(cantGuardada) : [];
      const historialGuardado = await AsyncStorage.getItem("historialMensual");
      const historialData = historialGuardado ? JSON.parse(historialGuardado) : {};

      const hoy = new Date();
      const claveAcumulado = `acumulado-${hoy.getFullYear()}-${hoy.getMonth()}`;
      const acumuladoGuardado = await AsyncStorage.getItem(claveAcumulado);
      const acumuladoMes = acumuladoGuardado ? JSON.parse(acumuladoGuardado) : {};
      const diasDelMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();

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
        const restantes = (total - (parseFloat(consumidas) || 0)).toString();
        const totalMensual = (total / 7) * diasDelMes;
        const consumidasMes = acumuladoMes[nombre] || parseFloat(consumidas) || 0;
        const porcentajeMensual = totalMensual > 0
          ? Math.min(Math.round(consumidasMes / totalMensual * 100), 100)
          : 0;
        return { nombre, totalSemana: total.toString(), consumidas, restantes, porcentajeMensual };
      });

      setDatos(nuevas);
      setHistorial(historialData);
    } catch (e) {}
  };

  useFocusEffect(useCallback(() => { cargarDatos(); }, []));

  const consumidas = datos.map((d) => parseFloat(d.consumidas) || 0);
  const mesActual = MESES[new Date().getMonth()];

  const historialPastilla = pastillaSeleccionada
    ? (() => {
        const datoPastilla = datos.find(d => d.nombre === pastillaSeleccionada);
        const historialExistente = historial[pastillaSeleccionada] || [];
        const entradaMesActual = {
          mes: `${mesActual} ${new Date().getFullYear()}`,
          porcentaje: datoPastilla?.porcentajeMensual || 0,
        };
        const todo = [...historialExistente.filter((h: any) => !h.mes.startsWith(mesActual)), entradaMesActual];
        return todo.slice(-6);
      })()
    : [];

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
        <Text style={styles.headerTitulo}>Resumen de Pastillas</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView style={styles.container}>

        {/* Selector de vista */}
        <View style={styles.selector}>
          <TouchableOpacity
            style={[styles.botonSelector, vista === "semanal" && styles.botonActivo]}
            onPress={() => { setVista("semanal"); setPastillaSeleccionada(null); }}
          >
            <Text style={[styles.textoSelector, vista === "semanal" && styles.textoActivo]}>📈 Semanal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.botonSelector, vista === "mensual" && styles.botonActivo]}
            onPress={() => { setVista("mensual"); setPastillaSeleccionada(null); }}
          >
            <Text style={[styles.textoSelector, vista === "mensual" && styles.textoActivo]}>📅 Mensual</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.botonSelector, vista === "tabla" && styles.botonActivo]}
            onPress={() => { setVista("tabla"); setPastillaSeleccionada(null); }}
          >
            <Text style={[styles.textoSelector, vista === "tabla" && styles.textoActivo]}>📋 Tabla</Text>
          </TouchableOpacity>
        </View>

        {/* VISTA SEMANAL */}
        {vista === "semanal" && (
          datos.length === 0 ? (
            <Text style={styles.vacio}>No hay datos aún.</Text>
          ) : (
            <View style={styles.graficaContainer}>
              <Text style={styles.leyendaTitulo}>Total consumidas por pastilla en la semana</Text>
              <BarChart
                data={{
                  labels: datos.map((_, i) => `P${i + 1}`),
                  datasets: [{ data: consumidas.length > 0 ? consumidas : [0] }],
                }}
                width={ANCHO}
                height={260}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                  backgroundColor: "#FFFFFF",
                  backgroundGradientFrom: "#FFFFFF",
                  backgroundGradientTo: "#F3F0FF",
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(109, 40, 217, ${opacity})`,
                  barPercentage: 0.6,
                }}
                style={styles.grafica}
                showValuesOnTopOfBars
                fromZero
              />
              <View style={styles.leyendaContainer}>
                {datos.map((d, i) => (
                  <View key={i} style={styles.leyendaFila}>
                    <Text style={styles.leyendaNumero}>P{i + 1}</Text>
                    <Text style={styles.leyendaNombre}>{d.nombre || "?"}</Text>
                  </View>
                ))}
              </View>
            </View>
          )
        )}

        {/* VISTA MENSUAL — botones */}
        {vista === "mensual" && !pastillaSeleccionada && (
          datos.length === 0 ? (
            <Text style={styles.vacio}>No hay datos aún.</Text>
          ) : (
            <View style={styles.botonesContainer}>
              <Text style={styles.subtitulo}>Selecciona una pastilla para ver su historial mensual</Text>
              {datos.map((d, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.botonPastilla}
                  onPress={() => setPastillaSeleccionada(d.nombre)}
                >
                  <Text style={styles.botonPastillaTexto}>💊 {d.nombre}</Text>
                  <Text style={styles.botonPastillaFlecha}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          )
        )}

        {/* VISTA MENSUAL — gráfica */}
        {vista === "mensual" && pastillaSeleccionada && (
          <View style={styles.graficaContainer}>
            <Text style={styles.leyendaTitulo}>{pastillaSeleccionada}</Text>
            <Text style={styles.subtitulo}>% tomado por mes (últimos 6 meses)</Text>
            {historialPastilla.length === 0 ? (
              <Text style={styles.vacio}>Sin historial aún.</Text>
            ) : (
              <>
                <View style={styles.barrasContainer}>
                  {historialPastilla.map((d: any, i: number) => (
                    <View key={i} style={styles.barraColumna}>
                      <Text style={styles.barraPorcentaje}>{d.porcentaje}%</Text>
                      <View style={styles.barraFondo}>
                        <View style={[
                          styles.barraRelleno,
                          { height: `${d.porcentaje}%`, backgroundColor: getColorBarra(d.porcentaje) }
                        ]} />
                      </View>
                      <Text style={styles.barraMes}>{d.mes.split(" ")[0]}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.leyendaColores}>
                  <View style={styles.leyendaColorFila}>
                    <View style={[styles.cuadroColor, { backgroundColor: "#22C55E" }]} />
                    <Text style={styles.leyendaColorTexto}>≥ 90% — Excelente</Text>
                  </View>
                  <View style={styles.leyendaColorFila}>
                    <View style={[styles.cuadroColor, { backgroundColor: "#EAB308" }]} />
                    <Text style={styles.leyendaColorTexto}>50–89% — Regular</Text>
                  </View>
                  <View style={styles.leyendaColorFila}>
                    <View style={[styles.cuadroColor, { backgroundColor: "#EF4444" }]} />
                    <Text style={styles.leyendaColorTexto}>{"< 50% — Pocas tomadas"}</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        )}

        {/* VISTA TABLA — botones */}
        {vista === "tabla" && !pastillaSeleccionada && (
          datos.length === 0 ? (
            <Text style={styles.vacio}>No hay datos aún.</Text>
          ) : (
            <View style={styles.botonesContainer}>
              <Text style={styles.subtitulo}>Selecciona una pastilla para ver su resumen</Text>
              {datos.map((d, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.botonPastilla}
                  onPress={() => setPastillaSeleccionada(d.nombre)}
                >
                  <Text style={styles.botonPastillaTexto}>💊 {d.nombre}</Text>
                  <Text style={styles.botonPastillaFlecha}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          )
        )}

        {/* VISTA TABLA — detalle pastilla */}
        {vista === "tabla" && pastillaSeleccionada && (() => {
          const d = datos.find(x => x.nombre === pastillaSeleccionada);
          if (!d) return null;
          return (
            <View style={styles.graficaContainer}>
              <Text style={styles.leyendaTitulo}>{pastillaSeleccionada}</Text>

              {/* Fila 1: Consumidas + Restantes */}
              <View style={styles.tarjetasRow}>
                <View style={styles.tarjeta}>
                  <Text style={styles.tarjetaLabel}>Consumidas semana</Text>
                  <Text style={styles.tarjetaValor}>{d.consumidas || "0"}</Text>
                </View>
                <View style={[styles.tarjeta, {
                  borderColor: parseFloat(d.restantes) < 0 ? "red" :
                               parseFloat(d.restantes) <= 2 ? "orange" : "#C4B5FD"
                }]}>
                  <Text style={styles.tarjetaLabel}>Restantes</Text>
                  <Text style={[styles.tarjetaValor, {
                    color: parseFloat(d.restantes) < 0 ? "red" :
                           parseFloat(d.restantes) <= 2 ? "orange" : "#6D28D9"
                  }]}>{d.restantes}</Text>
                </View>
              </View>

              {/* Fila 2: Total Semana + % Mes */}
              <View style={styles.tarjetasRow}>
                <View style={styles.tarjeta}>
                  <Text style={styles.tarjetaLabel}>Total Semana</Text>
                  <Text style={styles.tarjetaValor}>{d.totalSemana}</Text>
                </View>
                <View style={[styles.tarjeta, { borderColor: getColorBarra(d.porcentajeMensual) }]}>
                  <Text style={styles.tarjetaLabel}>% Mes actual</Text>
                  <Text style={[styles.tarjetaValor, { color: getColorBarra(d.porcentajeMensual) }]}>
                    {d.porcentajeMensual}%
                  </Text>
                </View>
              </View>

              {/* Historial mensual */}
              {(historial[pastillaSeleccionada] || []).length > 0 && (
                <>
                  <Text style={[styles.leyendaTitulo, { marginTop: 12 }]}>Historial mensual</Text>
                  {[...(historial[pastillaSeleccionada] || [])].reverse().map((h: any, i: number) => (
                    <View key={i} style={[styles.filaHistorial, { backgroundColor: i % 2 === 0 ? "#EBF8FB" : "#FFFFFF" }]}>
                      <Text style={styles.historialMes}>{h.mes}</Text>
                      <Text style={[styles.historialPorcentaje, { color: getColorBarra(h.porcentaje) }]}>
                        {h.porcentaje}%
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          );
        })()}

        <View style={{ height: 40 }} />
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
  selector: { flexDirection: "row", marginHorizontal: 16, marginVertical: 16, borderRadius: 12, overflow: "hidden", borderWidth: 2, borderColor: "#8B5CF6" },
  botonSelector: { flex: 1, padding: 12, alignItems: "center", backgroundColor: "#FFFFFF" },
  botonActivo: { backgroundColor: "#8B5CF6" },
  textoSelector: { fontWeight: "bold", color: "#8B5CF6", fontSize: 13 },
  textoActivo: { color: "#FFFFFF" },
  graficaContainer: { marginHorizontal: 16, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, elevation: 3 },
  botonesContainer: { paddingHorizontal: 16, gap: 10 },
  subtitulo: { textAlign: "center", color: "#A78BFA", fontSize: 12, marginBottom: 12, fontStyle: "italic" },
  botonPastilla: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16, borderWidth: 2, borderColor: "#8B5CF6", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  botonPastillaTexto: { color: "#6D28D9", fontWeight: "bold", fontSize: 16 },
  botonPastillaFlecha: { color: "#8B5CF6", fontSize: 24, fontWeight: "bold" },
  leyendaTitulo: { textAlign: "center", color: "#6D28D9", marginBottom: 4, fontSize: 15, fontWeight: "bold" },
  grafica: { borderRadius: 12 },
  leyendaContainer: { marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#E9D5FF" },
  leyendaFila: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  leyendaNumero: { fontWeight: "bold", color: "#8B5CF6", width: 30, fontSize: 13 },
  leyendaNombre: { color: "#6D28D9", fontSize: 13, flex: 1 },
  barrasContainer: { flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end", height: 200, marginVertical: 12, paddingHorizontal: 4 },
  barraColumna: { alignItems: "center", flex: 1 },
  barraPorcentaje: { fontSize: 10, color: "#6D28D9", fontWeight: "bold", marginBottom: 4 },
  barraFondo: { width: 28, height: 160, backgroundColor: "#E9D5FF", borderRadius: 6, justifyContent: "flex-end", overflow: "hidden" },
  barraRelleno: { width: "100%", borderRadius: 6 },
  barraMes: { fontSize: 11, color: "#6D28D9", marginTop: 4, fontWeight: "bold" },
  leyendaColores: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E9D5FF", gap: 6 },
  leyendaColorFila: { flexDirection: "row", alignItems: "center", gap: 8 },
  cuadroColor: { width: 16, height: 16, borderRadius: 4 },
  leyendaColorTexto: { color: "#6D28D9", fontSize: 13 },
  tarjetasRow: { flexDirection: "row", gap: 12, marginBottom: 12, marginTop: 8 },
  tarjeta: { flex: 1, backgroundColor: "#F3F0FF", borderRadius: 14, padding: 16, borderWidth: 2, borderColor: "#C4B5FD", alignItems: "center" },
  tarjetaLabel: { fontSize: 12, color: "#A78BFA", fontWeight: "bold", marginBottom: 8, textAlign: "center" },
  tarjetaValor: { fontSize: 22, fontWeight: "bold", color: "#6D28D9" },
  filaHistorial: { flexDirection: "row", justifyContent: "space-between", padding: 10, borderRadius: 8, marginBottom: 4 },
  historialMes: { color: "#6D28D9", fontWeight: "bold", fontSize: 13 },
  historialPorcentaje: { fontWeight: "bold", fontSize: 13 },
  fila: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E9D5FF" },
  celda: { flex: 1, padding: 8, justifyContent: "center", alignItems: "center", borderRightWidth: 1, borderRightColor: "#E9D5FF" },
  celdaHeader: { backgroundColor: "#8B5CF6" },
  headerTexto: { color: "#FFFFFF", fontWeight: "bold", textAlign: "center", fontSize: 12 },
  celdaTexto: { color: "#6D28D9", textAlign: "center", fontSize: 13 },
  vacio: { textAlign: "center", color: "#A78BFA", marginTop: 40, fontSize: 15, marginHorizontal: 24 },
});