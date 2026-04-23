from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from agent import get_agent_response
from database import init_db
from arduino_bluetooth import sync_data_to_arduino

app = FastAPI(title="PastiYa AI Agent API")

# Setup CORS para permitir peticiones desde React Native/Expo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from typing import Optional, List, Dict, Any

class ChatRequest(BaseModel):
    message: str
    context: Optional[List[Dict[str, Any]]] = None

class ChatResponse(BaseModel):
    response: str

class SyncRequest(BaseModel):
    programacion: List[Dict[str, Any]]

@app.on_event("startup")
def on_startup():
    init_db()

@app.post("/chat", response_model=ChatResponse)
def chat_with_agent(req: ChatRequest):
    # Procesar usando el Agente (agente.py)
    response_text = get_agent_response(req.message, req.context)
    return ChatResponse(response=response_text)

@app.post("/sync-arduino")
def sync_arduino(req: SyncRequest):
    # Enviar programación a la placa vía Bluetooth
    success = sync_data_to_arduino(req.programacion)
    if success:
        return {"status": "success", "message": "Sincronización con Arduino completa."}
    else:
        return {"status": "error", "message": "Error al comunicar con Arduino por Bluetooth. Revisa tu puerto COM."}

@app.get("/")
def read_root():
    return {"message": "PastiYa API is running. Send POST to /chat or /sync-arduino"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
