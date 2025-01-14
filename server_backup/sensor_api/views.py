from rest_framework.views import APIView
from rest_framework.response import Response
import serial
import json
import threading
import time
from serial.tools import list_ports

class SensorData:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance.data = {
                        'temperature': None,
                        'humidity': None,
                        'motionDetected': False,
                        'smokeDetected': False,
                        'lastUpdate': None,
                        'connected': False
                    }
                    cls._instance.start_serial_thread()
        return cls._instance

    def find_arduino_port(self):
        ports = list_ports.comports()
        for port in ports:
            if 'usbserial' in port.device.lower() or 'usbmodem' in port.device.lower():
                return port.device
        return None

    def read_serial_data(self):
        serial_port = self.find_arduino_port() or '/dev/cu.usbserial-110'
        baud_rate = 9600

        while True:
            try:
                with serial.Serial(serial_port, baud_rate, timeout=1) as ser:
                    self.data['connected'] = True
                    print(f"Connected to Arduino on {serial_port}")
                    
                    while True:
                        if ser.in_waiting:
                            line = ser.readline().decode('utf-8').strip()
                            try:
                                new_data = json.loads(line)
                                self.data.update(new_data)
                                self.data['lastUpdate'] = time.strftime('%Y-%m-%d %H:%M:%S')
                                self.data['connected'] = True
                            except json.JSONDecodeError as e:
                                print(f"Error parsing JSON data: {line}")
                                print(f"Error details: {str(e)}")
                        time.sleep(0.1)
                        
            except serial.SerialException as e:
                print(f"Serial port error: {e}")
                self.data['connected'] = False
                self.data['lastUpdate'] = time.strftime('%Y-%m-%d %H:%M:%S')
                time.sleep(5)

    def start_serial_thread(self):
        thread = threading.Thread(target=self.read_serial_data, daemon=True)
        thread.start()

class SensorDataView(APIView):
    def get(self, request):
        sensor_data = SensorData()
        return Response(sensor_data.data) 