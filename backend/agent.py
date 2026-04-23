import re
from database import get_schedules, check_recent_intake, log_intake

class RuleBasedAgent:
    def __init__(self):
        self.context = {}

    def _log_taken_med(self, taken_med: str) -> str:
        # Detectar errores (doble toma)
        is_recent, last_time = check_recent_intake(taken_med)
        if is_recent:
            return f"⚠️ ¡Cuidado! Ya te tomaste {taken_med} recientemente hoy a las {last_time}. Tomarla de nuevo podría ser una sobredosis. Por favor consulta a tu médico si te sientes mal."
        
        # Registrar toma
        log_intake(taken_med)
        return f"Excelente, he registrado que te tomaste {taken_med}. ¡Sigue así con tus buenos hábitos!"

    def process_message(self, message: str, context: list = None) -> str:
        msg_lower = message.lower()
        
        # Determinar de dónde sacamos los horarios (del AsyncStorage de la App o de la DB local)
        if context:
            schedules = []
            for item in context:
                nombre = item.get("nombre", "")
                hora = item.get("hora", "")
                schedules.append((nombre, hora, "1 pastilla"))
        else:
            schedules = get_schedules()

        # 0. Verificar si estamos esperando una selección de pastilla
        if self.context.get('awaiting_pill_selection'):
            med_list = self.context['awaiting_pill_selection']
            
            # Buscar si digitó el número
            match = re.search(r'\d+', msg_lower)
            if match:
                index = int(match.group()) - 1
                if 0 <= index < len(med_list):
                    taken_med = med_list[index]
                    self.context['awaiting_pill_selection'] = None
                    return self._log_taken_med(taken_med)
            
            # Buscar si digitó el nombre
            for med_name in med_list:
                if med_name.lower() in msg_lower:
                    taken_med = med_name
                    self.context['awaiting_pill_selection'] = None
                    return self._log_taken_med(taken_med)
            
            # Si no entendió, volver a preguntar
            opciones = "\n".join([f"{i+1}. {med_name}" for i, med_name in enumerate(med_list)])
            return f"Por favor dime el número o nombre de la pastilla que tomaste:\n{opciones}"

        # 1. Identificar si el usuario reporta que se tomó la pastilla
        if any(word in msg_lower for word in ["tomé", "tome", "comí", "pasé", "tomado", "tomar", "ya me tome"]):
            # Buscar qué pastilla tomó
            taken_med = None
            for med, time, dosage in schedules:
                if med.lower() in msg_lower:
                    taken_med = med
                    break
            
            if not taken_med:
                unique_meds = []
                for med in schedules:
                    if med[0] not in unique_meds:
                        unique_meds.append(med[0])

                if len(unique_meds) > 1:
                    # Guardamos el estado para el próximo mensaje
                    self.context['awaiting_pill_selection'] = unique_meds
                    opciones = "\n".join([f"{i+1}. {med_name}" for i, med_name in enumerate(unique_meds)])
                    return f"¿Qué pastilla te tomaste? Por favor responde con el número o nombre:\n{opciones}"
                elif len(unique_meds) == 1:
                    taken_med = unique_meds[0]
                else:
                    return "No tengo ninguna pastilla registrada en tu programación. ¿Qué te tomaste?"
            
            return self._log_taken_med(taken_med)

        # 2. Identificar si el usuario pregunta por su horario
        elif any(word in msg_lower for word in ["cuándo", "cuando", "hora", "toca", "siguiente"]):
            if not schedules:
                return "Actualmente no tienes pastillas programadas."
            
            response = "Aquí tienes tus próximos horarios:\n"
            for med, time, dosage in schedules:
                response += f"- {med} a las {time} ({dosage})\n"
            return response
        
        # 3. Hábitos y análisis
        elif "habito" in msg_lower or "hábitos" in msg_lower or "resumen" in msg_lower:
            return "🤖 He notado que te adhieres muy bien a tu horario de las mañanas, pero a veces te retrasas unos 30 minutos por la noche. ¿Te gustaría que ajuste las alertas de la noche para que sean más efectivas?"

        # 4. Saludos y genéricos
        elif any(word in msg_lower for word in ["hola", "buenos", "buenas", "saludos"]):
            return "¡Hola! Soy tu asistente inteligente de PastiYa. ¿Te tomaste alguna pastilla hoy o tienes dudas con tus horarios?"

        # Default fallback
        return ("No estoy seguro de entenderte completamente. Puedes decirme cosas como:\n"
                "- 'Ya me tomé el Losartan'\n"
                "- '¿A qué hora me toca mi pastilla?'\n"
                "- '¿Cómo van mis hábitos?'")

# Instancia global del agente
bot = RuleBasedAgent()

def get_agent_response(user_text: str, context: list = None) -> str:
    return bot.process_message(user_text, context)
