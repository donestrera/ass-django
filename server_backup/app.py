from flask import Flask, render_template, jsonify
from flask_cors import CORS
import serial
import json
import threading
import time
from serial.tools import list_ports

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

# Global variables to store sensor data
sensor_data = {
    'temperature': None,
    'humidity': None,
    'motionDetected': False,
    'smokeDetected': False,
    'lastUpdate': None,
    'connected': False
}

def find_arduino_port():
    """Find the Arduino port automatically"""
    ports = list_ports.comports()
    for port in ports:
        if 'usbserial' in port.device.lower() or 'usbmodem' in port.device.lower():
            return port.device
    return None

# Serial configuration - Now with auto-detection
SERIAL_PORT = find_arduino_port() or '/dev/cu.usbserial-110'
BAUD_RATE = 9600

def read_serial_data():
    """Background thread function to continuously read serial data from Arduino"""
    global sensor_data
    while True:
        try:
            with serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1) as ser:
                sensor_data['connected'] = True
                print(f"Connected to Arduino on {SERIAL_PORT}")
                
                while True:
                    if ser.in_waiting:
                        line = ser.readline().decode('utf-8').strip()
                        try:
                            data = json.loads(line)
                            # Update global sensor_data
                            sensor_data.update(data)
                            sensor_data['lastUpdate'] = time.strftime('%Y-%m-%d %H:%M:%S')
                            sensor_data['connected'] = True
                        except json.JSONDecodeError as e:
                            print(f"Error parsing JSON data: {line}")
                            print(f"Error details: {str(e)}")
                    time.sleep(0.1)
                    
        except serial.SerialException as e:
            print(f"Serial port error: {e}")
            sensor_data['connected'] = False
            sensor_data['lastUpdate'] = time.strftime('%Y-%m-%d %H:%M:%S')
            time.sleep(5)  # Wait before retrying

@app.route('/api/sensor-data')
def get_sensor_data():
    """API endpoint to get current sensor data"""
    return jsonify(sensor_data)

def start_serial_thread():
    """Start the serial reading thread"""
    thread = threading.Thread(target=read_serial_data, daemon=True)
    thread.start()

if __name__ == '__main__':
    start_serial_thread()
    app.run(debug=True, host='0.0.0.0', port=5000) 