import serial
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configura aquí el puerto COM asignado al módulo Bluetooth HC-05
BLUETOOTH_PORT = "COM3"
BAUD_RATE = 9600

def sync_data_to_arduino(data: list) -> bool:
    """
    Recibe la lista de pastillas, la convierte a texto plano y la envía por Bluetooth.
    """
    try:
        # Abrir conexión
        logger.info(f"Intentando conectar con Arduino en {BLUETOOTH_PORT}...")
        arduino = serial.Serial(port=BLUETOOTH_PORT, baudrate=BAUD_RATE, timeout=2)
        time.sleep(2)  # Dar tiempo a que la conexión serial se estabilice
        
        # Primero indicamos inicio de sincronización
        arduino.write(b"APP_SYNC_START\n")
        time.sleep(0.5)

        for p in data:
            # d: {'nombre': '...', 'dispensador': '1', 'hora': '08:00 AM', 'dosis': ['1', '0', ...]}
            disp = p.get("dispensador", "0")
            hora = p.get("hora", "")
            
            # Formatear la hora "08:00 AM" a "0800"
            hr_parts = hora.split(" ")
            hr_clean = hr_parts[0].replace(":", "") if len(hr_parts) > 0 else ""
            
            dosis_arr = p.get("dosis", [])
            # Limpiar dosis vacías, asumiendo 0 por defecto
            dosis_clean = [d if str(d).strip() != "" else "0" for d in dosis_arr]
            dosis_str = ",".join(dosis_clean)
            
            # Formato propuesto: DISP:1|HORA:0800|DOSIS:1,1,1,1,1,1,1
            comando = f"DISP:{disp}|HORA:{hr_clean}|DOSIS:{dosis_str}\n"
            
            logger.info(f"Enviando comando: {comando.strip()}")
            arduino.write(comando.encode('utf-8'))
            time.sleep(0.5)  # Pequeña pausa entre comandos
            
        arduino.write(b"APP_SYNC_END\n")
        logger.info("Sincronización terminada.")
        
        arduino.close()
        return True
    except serial.SerialException as e:
        logger.error(f"Error conectando al puerto serial {BLUETOOTH_PORT}: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Error inesperado durante envío de datos: {str(e)}")
        return False
