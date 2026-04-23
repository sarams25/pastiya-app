import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

const DIAS = ["L", "M", "M", "J", "V", "S", "D"];

export default function DetallePastilla() {
  const { nombre } = useLocalSearchParams<{ nombre: string }>();
  const router = useRouter();
  const [pastillas, setPastillas] = useState<any[]>([]);
  const [modalEditarVisible, setModalEditarVisible] = useState(false);
  const [filaEditando, setFilaEditando] = useState<number | null>(null);
  const [horaEditar, setHoraEditar] = useState("");
  const [ampmEditar, setAmpmEditar] = useState("AM");
  const [dosisEditar, setDosisEditar] = useState(["", "", "", "", "", "", ""]);

  useFocusEffect(useCallback(() => {
    const cargar = async () => {
      try {
        const guardado = await AsyncStorage.getItem("programacion");
        if (guardado) setPastillas(JSON.parse(guardado));
      } catch (e) {}
    };
    cargar();
  }, []));

  const guardar = async (nuevas: any) => {
    try {
      await AsyncStorage.setItem("programacion", JSON.stringify(nuevas));
    } catch (e) {}
  };

  const filasDePastilla = pastillas.filter(p => p.nombre === nombre);

  const formatearHoraStr = (raw: string): string => {
    const nums = raw.replace(/[^0-9]/g, "");
    if (nums.length === 0) return raw;
    let horas = "", minutos = "";
    if (nums.length === 1) { horas = "0" + nums; minutos = "00"; }
    else if (nums.length === 2) { horas = nums; minutos = "00"; }
    else if (nums.length === 3) { horas = "0" + nums[0]; minutos = nums.slice(1); }
    else { horas = nums.slice(0, 2); minutos = nums.slice(2, 4); }
    const h = Math.min(parseInt(horas), 12).toString().padStart(2, "0");
    const m = Math.min(parseInt(minutos), 59).toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  const eliminarHorario = (indexReal: number) => {
    const pastilla = pastillas[indexReal];
    Alert.alert(
      "Eliminar horario",
      `¿Eliminar el horario de las ${pastilla.hora}?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Sí", style: "destructive",
          onPress: () => {
            const nuevas = pastillas.filter((_, i) => i !== indexReal);
            setPastillas(nuevas);
            guardar(nuevas);
            if (nuevas.filter(p => p.nombre === nombre).length === 0) router.back();
          }
        }
      ]
    );
  };

  const eliminarToda = () => {
    Alert.alert(
      "Eliminar pastilla",
      `¿Eliminar todos los horarios de "${nombre}"?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Sí", style: "destructive",
          onPress: () => {
            const nuevas = pastillas.filter(p => p.nombre !== nombre);
            guardar(nuevas);
            router.back();
          }
        }
      ]
    );
  };

  const abrirEditar = (indexReal: number) => {
    const horaCompleta = pastillas[indexReal].hora || "";
    const partes = horaCompleta.split(" ");
    setHoraEditar(partes[0] || "");
    setAmpmEditar(partes[1] || "AM");
    setDosisEditar([...(pastillas[indexReal].dosis || ["", "", "", "", "", "", ""])]);
    setFilaEditando(indexReal);
    setModalEditarVisible(true);
  };

  const guardarEditar = () => {
    if (filaEditando === null) return;
    const nuevas = [...pastillas];
    nuevas[filaEditando].hora = `${formatearHoraStr(horaEditar)} ${ampmEditar}`;
    nuevas[filaEditando].dosis = [...dosisEditar];
    setPastillas(nuevas);
    guardar(nuevas);
    setModalEditarVisible(false);
    setFilaEditando(null);
  };

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.botonVolver}>
          <Text style={styles.botonVolverTexto}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>{nombre}</Text>
        <TouchableOpacity onPress={eliminarToda} style={styles.botonEliminarTodo}>
          <Text style={styles.botonEliminarTodoTexto}>🗑️</Text>
        </TouchableOpacity>
      </View>

      {/* TABLA VERTICAL */}
      <ScrollView style={styles.scrollTabla}>
        {filasDePastilla.map((pastilla, i) => {
          const indexReal = pastillas.indexOf(pastilla);
          return (
            <View key={i} style={[styles.tarjetaHorario, { backgroundColor: i % 2 === 0 ? "#EBF8FB" : "#FFFFFF" }]}>
              {/* Fila hora */}
              <View style={styles.filaHoraCabecera}>
                <Text style={styles.textoHora}>🕐 {pastilla.hora}</Text>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <TouchableOpacity onPress={() => eliminarHorario(indexReal)}>
                    <Text style={styles.eliminarTexto}>✕</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => abrirEditar(indexReal)}>
                    <Text style={styles.editarTexto}>✏️</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {/* Filas días */}
              {DIAS.map((dia, j) => (
                <View key={j} style={styles.filaDia}>
                  <Text style={styles.textoDia}>{dia}</Text>
                  <Text style={styles.textoDosis}>{pastilla.dosis[j] || "0"}</Text>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>

      {/* MODAL EDITAR */}
      <Modal visible={modalEditarVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <View style={styles.modalFondo}>
            <ScrollView
              style={styles.modalContenido}
              contentContainerStyle={{ paddingBottom: 300 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              automaticallyAdjustKeyboardInsets={true}
            >
              <Text style={styles.modalTitulo}>Editar Horario</Text>

              <Text style={styles.modalLabel}>Hora</Text>
              <View style={styles.horaAmPmRow}>
                <TextInput
                  style={[styles.modalInput, { flex: 1, marginRight: 8 }]}
                  placeholder="00:00"
                  placeholderTextColor="#A78BFA"
                  keyboardType="numeric"
                  maxLength={5}
                  value={horaEditar}
                  onChangeText={(v) => {
                    const soloNumeros = v.replace(/[^0-9]/g, "");
                    if (soloNumeros.length === 0) {
                      setHoraEditar("");
                    } else if (soloNumeros.length <= 2) {
                      setHoraEditar(soloNumeros);
                    } else {
                      setHoraEditar(soloNumeros.slice(0, 2) + ":" + soloNumeros.slice(2, 4));
                    }
                  }}
                  onBlur={() => setHoraEditar(formatearHoraStr(horaEditar))}
                />
                <TouchableOpacity
                  style={[styles.ampmBtn, ampmEditar === "AM" && styles.ampmActivo]}
                  onPress={() => setAmpmEditar("AM")}
                >
                  <Text style={[styles.ampmTexto, ampmEditar === "AM" && styles.ampmTextoActivo]}>AM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ampmBtn, ampmEditar === "PM" && styles.ampmActivo]}
                  onPress={() => setAmpmEditar("PM")}
                >
                  <Text style={[styles.ampmTexto, ampmEditar === "PM" && styles.ampmTextoActivo]}>PM</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalLabel}>Cantidad por día</Text>
              <View style={styles.diasRow}>
                {DIAS.map((dia, di) => (
                  <View key={di} style={styles.diaItem}>
                    <Text style={styles.diaLabel}>{dia}</Text>
                    <TextInput
                      style={styles.diaInput}
                      placeholder="0"
                      placeholderTextColor="#A78BFA"
                      keyboardType="decimal-pad"
                      value={dosisEditar[di]}
                      onChangeText={(v) => {
                        const nuevas = [...dosisEditar];
                        nuevas[di] = v;
                        setDosisEditar(nuevas);
                      }}
                    />
                  </View>
                ))}
              </View>

              <View style={styles.modalBotones}>
                <TouchableOpacity style={styles.botonCancelar} onPress={() => setModalEditarVisible(false)}>
                  <Text style={styles.botonCancelarTexto}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.botonGuardar} onPress={guardarEditar}>
                  <Text style={styles.botonGuardarTexto}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F0FF" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#8B5CF6", paddingHorizontal: 16, paddingVertical: 14, paddingTop: 50 },
  botonVolver: { padding: 4 },
  botonVolverTexto: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  titulo: { fontSize: 18, fontWeight: "bold", color: "#FFFFFF", flex: 1, textAlign: "center" },
  botonEliminarTodo: { padding: 4 },
  botonEliminarTodoTexto: { fontSize: 20 },
  scrollTabla: { flex: 1, padding: 16 },
  tarjetaHorario: { borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#E9D5FF" },
  filaHoraCabecera: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#E9D5FF" },
  textoHora: { fontSize: 16, fontWeight: "bold", color: "#6D28D9" },
  filaDia: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, paddingHorizontal: 8 },
  textoDia: { fontSize: 14, fontWeight: "bold", color: "#8B5CF6" },
  textoDosis: { fontSize: 14, color: "#6D28D9" },
  eliminarTexto: { color: "#EF4444", fontWeight: "bold", fontSize: 18 },
  editarTexto: { fontSize: 18 },
  modalFondo: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContenido: { backgroundColor: "#F3F0FF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "95%" },
  modalTitulo: { fontSize: 22, fontWeight: "bold", color: "#6D28D9", textAlign: "center", marginBottom: 20 },
  modalLabel: { fontSize: 14, fontWeight: "bold", color: "#6D28D9", marginBottom: 6, marginTop: 10 },
  modalInput: { backgroundColor: "#FFFFFF", borderRadius: 10, padding: 12, fontSize: 15, color: "#6D28D9", borderWidth: 1, borderColor: "#C4B5FD" },
  horaAmPmRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  ampmBtn: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: "#C4B5FD", marginLeft: 6, backgroundColor: "#FFFFFF" },
  ampmActivo: { backgroundColor: "#8B5CF6", borderColor: "#8B5CF6" },
  ampmTexto: { fontWeight: "bold", color: "#8B5CF6", fontSize: 14 },
  ampmTextoActivo: { color: "#FFFFFF" },
  diasRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  diaItem: { alignItems: "center" },
  diaLabel: { fontSize: 12, fontWeight: "bold", color: "#8B5CF6", marginBottom: 4 },
  diaInput: { width: 36, height: 36, borderRadius: 8, backgroundColor: "#F3F0FF", textAlign: "center", fontSize: 13, color: "#6D28D9", borderWidth: 1, borderColor: "#C4B5FD" },
  modalBotones: { flexDirection: "row", gap: 12, marginTop: 20 },
  botonCancelar: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 2, borderColor: "#EF4444", alignItems: "center" },
  botonCancelarTexto: { color: "#EF4444", fontWeight: "bold", fontSize: 16 },
  botonGuardar: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#8B5CF6", alignItems: "center" },
  botonGuardarTexto: { color: "#FFFFFF", fontWeight: "bold", fontSize: 16 },
});