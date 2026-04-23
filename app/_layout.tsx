import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="programacion" />
      <Stack.Screen name="detalle-pastilla" />
      <Stack.Screen name="cantidad" />
      <Stack.Screen name="resumen" />
      <Stack.Screen name="agente" />
    </Stack>
  );
}