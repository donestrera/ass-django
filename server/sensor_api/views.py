from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
import serial
import json
import threading
import time
from serial.tools import list_ports
from .models import MotionHistory
from rest_framework import status

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
                        'connected': False,
                        'pirEnabled': True  # Add PIR state tracking
                    }
                    cls._instance._last_motion_state = False
                    cls._instance.serial_connection = None
                    cls._instance.start_serial_thread()
        return cls._instance

    def find_arduino_port(self):
        """Find the Arduino port automatically"""
        ports = list_ports.comports()
        for port in ports:
            if 'usbserial' in port.device.lower() or 'usbmodem' in port.device.lower():
                return port.device
        return None

    def handle_motion_event(self, motion_detected):
        """Handle motion detection state changes"""
        if motion_detected and not self._last_motion_state:
            # Only create new entry if enough time has passed
            if MotionHistory.can_create_new_entry():
                MotionHistory.objects.create(
                    temperature=self.data['temperature'],
                    humidity=self.data['humidity']
                )
        elif not motion_detected and self._last_motion_state:
            # Motion just ended - update last active motion entry
            latest_motion = MotionHistory.objects.filter(is_active=True).first()
            if latest_motion:
                latest_motion.is_active = False
                latest_motion.save()
        
        self._last_motion_state = motion_detected

    def send_command(self, command):
        """Send a command to the Arduino"""
        if self.serial_connection and self.serial_connection.is_open:
            try:
                self.serial_connection.write(f"{command}\n".encode())
                time.sleep(0.1)  # Give Arduino time to process
                return True
            except Exception as e:
                print(f"Error sending command: {e}")
                return False
        return False

    def set_pir_state(self, enabled):
        """Control PIR sensor state"""
        command = "PIR_ON" if enabled else "PIR_OFF"
        if self.send_command(command):
            self.data['pirEnabled'] = enabled
            return True
        return False

    def read_serial_data(self):
        """Background thread function to continuously read serial data from Arduino"""
        serial_port = self.find_arduino_port() or '/dev/cu.usbmodem1101'  # Common port for Arduino on Mac
        baud_rate = 9600

        while True:
            try:
                self.serial_connection = serial.Serial(serial_port, baud_rate, timeout=1)
                self.data['connected'] = True
                print(f"Connected to Arduino on {serial_port}")
                
                while True:
                    if self.serial_connection.in_waiting:
                        line = self.serial_connection.readline().decode('utf-8').strip()
                        try:
                            new_data = json.loads(line)
                            # Handle motion detection before updating data
                            if 'motionDetected' in new_data:
                                self.handle_motion_event(new_data['motionDetected'])
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
                self.serial_connection = None
                self.data['lastUpdate'] = time.strftime('%Y-%m-%d %H:%M:%S')
                time.sleep(5)  # Wait before retrying

    def start_serial_thread(self):
        """Start the serial reading thread"""
        thread = threading.Thread(target=self.read_serial_data, daemon=True)
        thread.start()

class SensorDataView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """API endpoint to get current sensor data"""
        sensor_data = SensorData()
        return Response(sensor_data.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clear_motion_history(request):
    """Clear all motion detection records."""
    try:
        MotionHistory.objects.all().delete()
        return Response({'message': 'Motion detection history cleared successfully'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def control_pir(request):
    """Control PIR sensor state"""
    try:
        enabled = request.data.get('enabled', True)
        sensor_data = SensorData()
        
        if sensor_data.set_pir_state(enabled):
            return Response({
                'message': f'PIR sensor {"enabled" if enabled else "disabled"} successfully',
                'pirEnabled': enabled
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': 'Failed to communicate with Arduino'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 