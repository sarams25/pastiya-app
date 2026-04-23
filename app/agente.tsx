import React, { useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { Stack, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// Interfaz para los mensajes
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent';
}

export default function Agente() {
  const router = useRouter();
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: "¡Hola! Soy tu asistente de PastiYa. ¿En qué te puedo ayudar hoy? ¿Te acabas de tomar una pastilla o necesitas revisar tus horarios?", sender: 'agent' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // URL del servidor FastAPI
  // Utiliza la variable de entorno si existe (para producción en la nube),
  // de lo contrario autodetecta la IP física local (para desarrollo).
  const getBackendUrl = () => {
    if (process.env.EXPO_PUBLIC_API_URL) {
      return `${process.env.EXPO_PUBLIC_API_URL}/chat`;
    }
    if (Constants.expoConfig?.hostUri) {
      const activeIp = Constants.expoConfig.hostUri.split(':')[0];
      return `http://${activeIp}:8000/chat`;
    }
    return "http://192.168.1.112:8000/chat"; // Fallback de emergencia
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = inputText.trim();
    const newMessageContent: Message = {
      id: Date.now().toString(),
      text: userMessage,
      sender: 'user'
    };

    // Añadir mensaje del usuario a la lista
    setMessages(prev => [...prev, newMessageContent]);
    setInputText("");
    setIsLoading(true);

    try {
      // Obtener la lista de programación de AsyncStorage (el contexto real del usuario)
      let programacionContext = [];
      try {
        const guardado = await AsyncStorage.getItem("programacion");
        if (guardado) programacionContext = JSON.parse(guardado);
      } catch (e) {
        console.warn("Error leyendo AsyncStorage");
      }

      // Crear controlador de tiempo límite (5 segundos) para no quedarse pensando infinitamente
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Hacer la petición al backend en Python
      const response = await fetch(getBackendUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          message: userMessage,
          context: programacionContext 
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json();
      
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), text: data.response, sender: 'agent' }
      ]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), text: "Lo siento, tuve un problema conectando con el servidor Python. Asegúrate de ejecutar: uvicorn main:app en la carpeta backend.", sender: 'agent' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: "🤖 Agente IA",
          headerStyle: { backgroundColor: '#0EA5E9' },
          headerTintColor: '#fff',
        }} 
      />
      
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={100}
      >
        <ScrollView 
          ref={scrollViewRef}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContainer}
        >
          {messages.map((msg) => (
            <View 
              key={msg.id} 
              style={[
                styles.messageBubble, 
                msg.sender === 'user' ? styles.userBubble : styles.agentBubble
              ]}
            >
              <Text style={msg.sender === 'user' ? styles.userText : styles.agentText}>
                {msg.text}
              </Text>
            </View>
          ))}
          {isLoading && (
            <View style={[styles.messageBubble, styles.agentBubble]}>
              <ActivityIndicator size="small" color="#0369A1" />
            </View>
          )}
        </ScrollView>

        <View style={styles.inputArea}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Escribe tu mensaje..."
            placeholderTextColor="#9CA3AF"
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity 
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]} 
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            <Text style={styles.sendButtonText}>Enviar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  chatArea: {
    flex: 1,
  },
  chatContainer: {
    padding: 16,
    gap: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 14,
    borderRadius: 18,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#8B5CF6',
    borderBottomRightRadius: 4,
  },
  agentBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E7EB',
    borderBottomLeftRadius: 4,
  },
  userText: {
    color: '#FFF',
    fontSize: 16,
  },
  agentText: {
    color: '#1F2937',
    fontSize: 16,
  },
  inputArea: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: 34,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1F2937',
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 12,
    backgroundColor: '#0EA5E9',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sendButtonDisabled: {
    backgroundColor: '#BAE6FD',
  },
  sendButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  }
});
