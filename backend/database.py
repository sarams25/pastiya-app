import sqlite3
import os
from datetime import datetime

DB_FILE = os.path.join(os.path.dirname(__file__), "pastiya.db")

def get_connection():
    return sqlite3.connect(DB_FILE)

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    # Tabla de horarios programados
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            medication_name TEXT NOT NULL,
            scheduled_time TEXT NOT NULL, -- HH:MM
            dosage TEXT NOT NULL
        )
    ''')
    # Tabla de registro de tomas reales (log)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS intake_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            medication_name TEXT NOT NULL,
            taken_at TEXT NOT NULL -- YYYY-MM-DD HH:MM:SS
        )
    ''')
    conn.commit()
    
    # Insertar datos falsos sugeridos si está vacía
    cursor.execute("SELECT COUNT(*) FROM schedules")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO schedules (medication_name, scheduled_time, dosage) VALUES ('Losartan', '08:00', '1 pastilla')")
        cursor.execute("INSERT INTO schedules (medication_name, scheduled_time, dosage) VALUES ('Metformina', '20:00', '1 pastilla')")
        conn.commit()
    conn.close()

def log_intake(medication_name: str):
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("INSERT INTO intake_logs (medication_name, taken_at) VALUES (?, ?)", (medication_name, now))
    conn.commit()
    conn.close()

def get_schedules():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT medication_name, scheduled_time, dosage FROM schedules")
    rows = cursor.fetchall()
    conn.close()
    return rows

def check_recent_intake(medication_name: str, hours: int = 4):
    """Verifica si la pastilla fue tomada recientemente (posible doble toma)."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT taken_at FROM intake_logs 
        WHERE medication_name = ? 
        ORDER BY taken_at DESC LIMIT 1
    """, (medication_name,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        last_taken = datetime.strptime(row[0], "%Y-%m-%d %H:%M:%S")
        diff = (datetime.now() - last_taken).total_seconds() / 3600
        if diff < hours:
            return True, row[0] # Retorna True y la hora si fue tomada hace poco
    return False, None
