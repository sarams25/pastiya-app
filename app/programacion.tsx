import AsyncStorage from "@react-native-async-storage/async-storage";
import { Buffer } from "buffer";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { BleManager, Device } from "react-native-ble-plx";

const DIAS = ["L", "M", "M", "J", "V", "S", "D"];

// UUID del HC-05 — estos son los estándar para módulos seriales Bluetooth
const SERVICE_UUID = "00001101-0000-1000-8000-00805f9b34fb";
const CHAR_UUID    = "00001101-0000-1000-8000-00805f9b34fb";

const manager = new BleManager();

export default function Programacion() {
  const router = useRouter();
  const [pastillas, setPastillas] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [nombreNueva, setNombreNueva] = useState("");
  const [dispensador, setDispensador] = useState("");
  const [horarios, setHorarios] = useState([
    { hora: "", ampm: "AM", dosis: ["", "", "", "", "", "", ""] },
    { hora: "", ampm: "AM", dosis: ["", "", "", "", "", "", ""] },
    { hora: "", ampm: "AM", dosis: ["", "", "", "", "", "", ""] },
  ]);

  // Bluetooth
  const [btConectado, setBtConectado] = useState(false);
  const [btConectando, setBtConectando] = useState(false);
  const [modalBtVisible, setModalBtVisible] = useState(false);
  const [dispositivosBT, setDispositivosBT] = useState<Device[]>([]);
  const dispositivoConectado = useRef<Device | null>(null);
  const intervaloHora = useRef<any>(null);

  useEffect(() => {
    return () => {
      manager.destroy();
      if (intervaloHora.current) clearInterval(intervaloHora.current);
    };
  }, []);

  // Enviar hora actual cada minuto al Arduino
  const iniciarEnvioHora = (device: Device) => {
    const enviarHora = async () => {
      try {
        const ahora = new Date();
        const hh = ahora.getHours().toString().padStart(2, "0");
        const mm = ahora.getMinutes().toString().padStart(2, "0");
        const msg = `T:${hh}${mm}\n`;
        const encoded = Buffer.from(msg).toString("base64");
        await device.writeCharacteristicWithResponseForService(SERVICE_UUID, CHAR_UUID, encoded);
      } catch (e) {}
    };
    enviarHora();
    intervaloHora.current = setInterval(enviarHora, 60000);
  };

  // Escanear dispositivos Bluetooth
  const escanear = () => {
    setDispositivosBT([]);
    setBtConectando(true);
    const encontrados: Device[] = [];

    manager.startDeviceScan(null, null, (error, device) => {
      if (error) { setBtConectando(false); return; }
      if (device && device.name && !encontrados.find(d => d.id === device.id)) {
        encontrados.push(device);
        setDispositivosBT([...encontrados]);
      }
    });

    setTimeout(() => {
      manager.stopDeviceScan();
      setBtConectando(false);
    }, 8000);
  };

  // Conectar a un dispositivo
  const conectar = async (device: Device) => {
    try {
      setBtConectando(true);
      const connected = await manager.connectToDevice(device.id);
      await connected.discoverAllServicesAndCharacteristics();
      dispositivoConectado.current = connected;
      setBtConectado(true);
      setModalBtVisible(false);
      iniciarEnvioHora(connected);
      Alert.alert("✅ Conectado", `Conectado a ${device.name}`);
    } catch (e) {
      Alert.alert("Error", "No se pudo conectar. Intenta de nuevo.");
    } finally {
      setBtConectando(false);
    }
  };

  // Desconectar
  const desconectar = async () => {
    try {
      if (dispositivoConectado.current) {
        await dispositivoConectado.current.cancelConnection();
        dispositivoConectado.current = null;
      }
      if (intervaloHora.current) clearInterval(intervaloHora.current);
      setBtConectado(false);
    } catch (e) {}
  };

  // Enviar programación al Arduino por Bluetooth
  const enviarAlArduino = async (nuevas: any[]) => {
    if (!dispositivoConectado.current || !btConectado) return;
    try {
      for (const p of nuevas) {
        if (!p.dispensador) continue;
        const partes = p.hora.split(" ");
        const horaStr = partes[0].replace(":", "");
        const ampm = partes[1] || "AM";
        const dosis = p.dosis.reduce((acc: number, d: string) => acc + (parseFloat(d) || 0), 0);
        const msg = `D:${p.dispensador},H:${horaStr},A:${ampm},C:${dosis}\n`;
        const encoded = Buffer.from(msg).toString("base64");
        await dispositivoConectado.current.writeCharacteristicWithResponseForService(
          SERVICE_UUID, CHAR_UUID, encoded
        );
        await new Promise(r => setTimeout(r, 300));
      }
    } catch (e) {
      Alert.alert("⚠️ Bluetooth", "Error al enviar datos al dispensador.");
    }
  };

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

  const nombresPastillas = [...new Set(pastillas.map(p => p.nombre))];

  const agregarHorario = () => {
    setHorarios([...horarios, { hora: "", ampm: "AM", dosis: ["", "", "", "", "", "", ""] }]);
  };

  const duplicarHorario = (index: number) => {
    const original = horarios[index];
    const copia = { hora: original.hora, ampm: original.ampm, dosis: [...original.dosis] };
    const nuevos = [...horarios];
    nuevos.splice(index + 1, 0, copia);
    setHorarios(nuevos);
  };

  const eliminarHorario = (index: number) => {
    if (horarios.length <= 1) {
      Alert.alert("Error", "Debe haber al menos un horario");
      return;
    }
    setHorarios(horarios.filter((_, i) => i !== index));
  };

  const actualizarHoraDosis = (indexHorario: number, campo: string, valor: string, indexDia?: number) => {
    const nuevos = [...horarios];
    if (campo === "hora") nuevos[indexHorario].hora = valor;
    else if (campo === "ampm") nuevos[indexHorario].ampm = valor;
    else if (campo === "dosis" && indexDia !== undefined) nuevos[indexHorario].dosis[indexDia] = valor;
    setHorarios(nuevos);
  };

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

  const formatearHora = (indexHorario: number) => {
    const nuevos = [...horarios];
    nuevos[indexHorario].hora = formatearHoraStr(horarios[indexHorario].hora);
    setHorarios(nuevos);
  };

  const resetHorarios = () => [
    { hora: "", ampm: "AM", dosis: ["", "", "", "", "", "", ""] },
    { hora: "", ampm: "AM", dosis: ["", "", "", "", "", "", ""] },
    { hora: "", ampm: "AM", dosis: ["", "", "", "", "", "", ""] },
  ];

  const guardarNueva = () => {
    if (!nombreNueva.trim()) {
      Alert.alert("Error", "Por favor escribe el nombre de la pastilla");
      return;
    }
    const horariosValidos = horarios.filter(h => h.hora.trim() !== "");
    if (horariosValidos.length === 0) {
      Alert.alert("Error", "Por favor agrega al menos una hora");
      return;
    }
    const nuevasFilas = horariosValidos.map((h) => ({
      nombre: nombreNueva.trim(),
      dispensador: dispensador.trim(),
      dosis: h.dosis,
      hora: `${formatearHoraStr(h.hora)} ${h.ampm}`,
    }));
    const nuevas = [...pastillas, ...nuevasFilas];
    setPastillas(nuevas);
    guardar(nuevas);
    enviarAlArduino(nuevasFilas);
    setModalVisible(false);
    setNombreNueva("");
    setDispensador("");
    setHorarios(resetHorarios());
  };

  return (
    <View style={{ flex: 1 }}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.botonVolver}>
          <Text style={styles.botonVolverTexto}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Programación</Text>
        <TouchableOpacity
          onPress={() => {
            if (btConectado) {
              Alert.alert("Bluetooth", "¿Desconectar el dispensador?", [
                { text: "No", style: "cancel" },
                { text: "Sí", onPress: desconectar }
              ]);
            } else {
              setModalBtVisible(true);
              escanear();
            }
          }}
          style={styles.botonBT}
        >
          <Text style={styles.botonBTTexto}>{btConectado ? "🔵 BT" : "⚪ BT"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.botonesContainer}>
          {nombresPastillas.map((nombre, i) => (
            <TouchableOpacity
              key={i}
              style={styles.botonPastilla}
              onPress={() => router.push({ pathname: "/detalle-pastilla", params: { nombre } })}
            >
              <Text style={styles.botonPastillaTexto}>
                💊 {nombre}{pastillas.find(p => p.nombre === nombre)?.dispensador ? ` — Disp. #${pastillas.find(p => p.nombre === nombre)?.dispensador}` : ""}
              </Text>
              <Text style={styles.botonPastillaFlecha}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.botonAgregar} onPress={() => setModalVisible(true)}>
          <Text style={styles.botonTexto}>+ Agregar Pastilla</Text>
        </TouchableOpacity>

        <View style={{ height: 200 }} />
      </ScrollView>

      {/* MODAL BLUETOOTH */}
      <Modal visible={modalBtVisible} animationType="slide" transparent>
        <View style={styles.modalFondo}>
          <View style={[styles.modalContenido, { maxHeight: "60%" }]}>
            <Text style={styles.modalTitulo}>Conectar Dispensador</Text>
            {btConectando && <Text style={styles.subtituloBT}>Buscando dispositivos...</Text>}
            {dispositivosBT.length === 0 && !btConectando && (
              <Text style={styles.subtituloBT}>No se encontraron dispositivos</Text>
            )}
            <ScrollView>
              {dispositivosBT.map((d, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.botonDispositivo}
                  onPress={() => conectar(d)}
                >
                  <Text style={styles.botonDispositivoTexto}>📡 {d.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.botonCancelar, { marginTop: 16 }]}
              onPress={() => { setModalBtVisible(false); manager.stopDeviceScan(); }}
            >
              <Text style={styles.botonCancelarTexto}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL AGREGAR */}
      <Modal visible={modalVisible} animationType="slide" transparent>
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
              <Text style={styles.modalTitulo}>Nueva Pastilla</Text>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>Nombre de la pastilla</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Ej: Ibuprofeno"
                    placeholderTextColor="#A78BFA"
                    value={nombreNueva}
                    onChangeText={setNombreNueva}
                  />
                </View>
                <View style={{ width: 90 }}>
                  <Text style={[styles.modalLabel, { fontSize: 13 }]}>Dispensador #</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="0"
                    placeholderTextColor="#A78BFA"
                    keyboardType="numeric"
                    value={dispensador}
                    onChangeText={setDispensador}
                  />
                </View>
              </View>

              {horarios.map((horario, hi) => (
                <View key={hi} style={styles.horarioCard}>
                  <View style={styles.horarioTituloRow}>
                    <Text style={styles.modalLabel}>Hora {hi + 1}</Text>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      <TouchableOpacity onPress={() => duplicarHorario(hi)}>
                        <Text style={styles.duplicarHoraTexto}>⧉ Duplicar</Text>
                      </TouchableOpacity>
                      {hi >= 1 && (
                        <TouchableOpacity onPress={() => eliminarHorario(hi)}>
                          <Text style={styles.eliminarHoraTexto}>✕ Eliminar</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <View style={styles.horaAmPmRow}>
                    <TextInput
                      style={[styles.modalInput, { flex: 1, marginRight: 8 }]}
                      placeholder="00:00"
                      placeholderTextColor="#A78BFA"
                      keyboardType="numeric"
                      maxLength={5}
                      value={horario.hora}
                      onChangeText={(v) => {
                        const soloNumeros = v.replace(/[^0-9]/g, "");
                        if (soloNumeros.length === 0) {
                          actualizarHoraDosis(hi, "hora", "");
                        } else if (soloNumeros.length <= 2) {
                          actualizarHoraDosis(hi, "hora", soloNumeros);
                        } else {
                          actualizarHoraDosis(hi, "hora", soloNumeros.slice(0, 2) + ":" + soloNumeros.slice(2, 4));
                        }
                      }}
                      onBlur={() => formatearHora(hi)}
                    />
                    <TouchableOpacity
                      style={[styles.ampmBtn, horario.ampm === "AM" && styles.ampmActivo]}
                      onPress={() => actualizarHoraDosis(hi, "ampm", "AM")}
                    >
                      <Text style={[styles.ampmTexto, horario.ampm === "AM" && styles.ampmTextoActivo]}>AM</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.ampmBtn, horario.ampm === "PM" && styles.ampmActivo]}
                      onPress={() => actualizarHoraDosis(hi, "ampm", "PM")}
                    >
                      <Text style={[styles.ampmTexto, horario.ampm === "PM" && styles.ampmTextoActivo]}>PM</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.modalLabel}>Cantidad</Text>
                  <View style={styles.diasRow}>
                    {DIAS.map((dia, di) => (
                      <View key={di} style={styles.diaItem}>
                        <Text style={styles.diaLabel}>{dia}</Text>
                        <TextInput
                          style={styles.diaInput}
                          placeholder="0"
                          placeholderTextColor="#A78BFA"
                          keyboardType="decimal-pad"
                          value={horario.dosis[di]}
                          onChangeText={(v) => actualizarHoraDosis(hi, "dosis", v, di)}
                        />
                      </View>
                    ))}
                  </View>
                </View>
              ))}

              <TouchableOpacity style={styles.botonAgregarHora} onPress={agregarHorario}>
                <Text style={styles.botonAgregarHoraTexto}>+ Agregar otra hora</Text>
              </TouchableOpacity>

              <View style={styles.modalBotones}>
                <TouchableOpacity style={styles.botonCancelar} onPress={() => {
                  setModalVisible(false);
                  setNombreNueva("");
                  setDispensador("");
                  setHorarios(resetHorarios());
                }}>
                  <Text style={styles.botonCancelarTexto}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.botonGuardar} onPress={guardarNueva}>
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
  botonVolver: { width: 80 },
  botonVolverTexto: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  headerTitulo: { fontSize: 18, fontWeight: "bold", color: "#FFFFFF", textAlign: "center" },
  botonBT: { width: 60, alignItems: "center" },
  botonBTTexto: { color: "#FFFFFF", fontSize: 14, fontWeight: "bold" },
  botonesContainer: { paddingHorizontal: 16, gap: 10, marginTop: 16 },
  botonPastilla: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16, borderWidth: 2, borderColor: "#8B5CF6", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  botonPastillaTexto: { color: "#6D28D9", fontWeight: "bold", fontSize: 16, flex: 1 },
  botonPastillaFlecha: { color: "#8B5CF6", fontSize: 24, fontWeight: "bold" },
  botonAgregar: { marginHorizontal: 16, marginTop: 16, marginBottom: 8, padding: 14, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: "#8B5CF6", alignItems: "center" },
  botonTexto: { color: "#8B5CF6", fontWeight: "bold", fontSize: 16 },
  botonDispositivo: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 2, borderColor: "#8B5CF6" },
  botonDispositivoTexto: { color: "#6D28D9", fontWeight: "bold", fontSize: 15 },
  subtituloBT: { textAlign: "center", color: "#A78BFA", fontSize: 13, marginBottom: 12, fontStyle: "italic" },
  modalFondo: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContenido: { backgroundColor: "#F3F0FF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "95%" },
  modalTitulo: { fontSize: 22, fontWeight: "bold", color: "#6D28D9", textAlign: "center", marginBottom: 20 },
  modalLabel: { fontSize: 14, fontWeight: "bold", color: "#6D28D9", marginBottom: 6, marginTop: 10 },
  modalInput: { backgroundColor: "#FFFFFF", borderRadius: 10, padding: 12, fontSize: 15, color: "#6D28D9", borderWidth: 1, borderColor: "#C4B5FD" },
  horarioCard: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1, borderColor: "#C4B5FD" },
  horarioTituloRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  horaAmPmRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  ampmBtn: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: "#C4B5FD", marginLeft: 6, backgroundColor: "#FFFFFF" },
  ampmActivo: { backgroundColor: "#8B5CF6", borderColor: "#8B5CF6" },
  ampmTexto: { fontWeight: "bold", color: "#8B5CF6", fontSize: 14 },
  ampmTextoActivo: { color: "#FFFFFF" },
  eliminarHoraTexto: { color: "#EF4444", fontSize: 13, fontWeight: "bold" },
  duplicarHoraTexto: { color: "#60B8D4", fontSize: 13, fontWeight: "bold" },
  diasRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  diaItem: { alignItems: "center" },
  diaLabel: { fontSize: 12, fontWeight: "bold", color: "#8B5CF6", marginBottom: 4 },
  diaInput: { width: 36, height: 36, borderRadius: 8, backgroundColor: "#F3F0FF", textAlign: "center", fontSize: 13, color: "#6D28D9", borderWidth: 1, borderColor: "#C4B5FD" },
  botonAgregarHora: { marginTop: 12, padding: 12, borderRadius: 10, borderWidth: 2, borderColor: "#60B8D4", alignItems: "center" },
  botonAgregarHoraTexto: { color: "#60B8D4", fontWeight: "bold", fontSize: 15 },
  modalBotones: { flexDirection: "row", gap: 12, marginTop: 20 },
  botonCancelar: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 2, borderColor: "#EF4444", alignItems: "center" },
  botonCancelarTexto: { color: "#EF4444", fontWeight: "bold", fontSize: 16 },
  botonGuardar: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#8B5CF6", alignItems: "center" },
  botonGuardarTexto: { color: "#FFFFFF", fontWeight: "bold", fontSize: 16 },
});