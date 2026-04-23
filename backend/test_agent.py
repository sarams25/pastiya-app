import time
from database import init_db, check_recent_intake
from agent import get_agent_response

def run_tests():
    print("Iniciando pruebas automatizadas del Agente IA de PastiYa...\n")
    
    # Asegurarnos de que la base de datos está inicializada
    init_db()
    
    print("--- Prueba 1: Preguntar por horarios ---")
    respuesta = get_agent_response("¿A qué hora me toca mi medicina?")
    print("Usuario: ¿A qué hora me toca mi medicina?")
    print(f"Agente:\\n{respuesta}\\n")
    
    print("--- Prueba 2: Toma correcta ---")
    respuesta = get_agent_response("Ya me tomé el Losartan")
    print("Usuario: Ya me tomé el Losartan")
    print(f"Agente:\\n{respuesta}\\n")
    
    print("--- Prueba 3: Prevención de doble toma (Error fatal) ---")
    print("(Simulando que el usuario vuelve a tomarlo inmediatamente...)")
    respuesta = get_agent_response("Me acabo de tomar otro Losartan")
    print("Usuario: Me acabo de tomar otro Losartan")
    print(f"Agente:\\n{respuesta}\\n")
    
    print("--- Prueba 4: Análisis de hábitos ---")
    respuesta = get_agent_response("¿Cómo van mis hábitos?")
    print("Usuario: ¿Cómo van mis hábitos?")
    print(f"Agente:\\n{respuesta}\\n")
    
    print("Todas las pruebas ejecutadas correctamente.")

if __name__ == "__main__":
    run_tests()
