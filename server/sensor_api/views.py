from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
import serial
import json
import threading
import time
import logging
from serial.tools import list_ports
from .models import MotionHistory
from rest_framework import status

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SensorData:
    _instance = None
    _lock = threading.Lock()
    MAX_RETRY_INTERVAL = 60  # Maximum retry interval in seconds
    INITIAL_RETRY_INTERVAL = 1  # Initial retry interval in seconds

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
                        'pirEnabled': True
                    }
                    cls._instance._last_motion_state = False
                    cls._instance.serial_connection = None
                    cls._instance._should_run = True  # Flag for graceful shutdown
                    cls._instance.start_serial_thread()
        return cls._instance

    def cleanup(self):
        """Cleanup method for graceful shutdown"""
        self._should_run = False
        if self.serial_connection and self.serial_connection.is_open:
            try:
                self.serial_connection.close()
            except Exception as e:
                logger.error(f"Error closing serial connection: {e}")

    def find_arduino_port(self):
        """Find the Arduino port automatically"""
        try:
            ports = list_ports.comports()
            for port in ports:
                if 'usbserial' in port.device.lower() or 'usbmodem' in port.device.lower():
                    return port.device
        except Exception as e:
            logger.error(f"Error finding Arduino port: {e}")
        return None

    def handle_motion_event(self, motion_detected):
        """Handle motion detection state changes"""
        try:
            if motion_detected and not self._last_motion_state:
                if MotionHistory.can_create_new_entry():
                    MotionHistory.objects.create(
                        temperature=self.data['temperature'],
                        humidity=self.data['humidity']
                    )
            elif not motion_detected and self._last_motion_state:
                latest_motion = MotionHistory.objects.filter(is_active=True).first()
                if latest_motion:
                    latest_motion.is_active = False
                    latest_motion.save()
            
            self._last_motion_state = motion_detected
        except Exception as e:
            logger.error(f"Error handling motion event: {e}")

    def send_command(self, command, timeout=1.0):
        """Send a command to the Arduino with timeout"""
        if not self.serial_connection or not self.serial_connection.is_open:
            return False

        try:
            self.serial_connection.write(f"{command}\n".encode())
            time.sleep(min(timeout, 0.1))  # Give Arduino time to process, but respect timeout
            return True
        except Exception as e:
            logger.error(f"Error sending command: {e}")
            return False

    def set_pir_state(self, enabled):
        """Set the PIR sensor state"""
        try:
            command = "PIR_ON" if enabled else "PIR_OFF"
            if self.send_command(command):
                self.data['pirEnabled'] = enabled
                return True
            return False
        except Exception as e:
            logger.error(f"Error setting PIR state: {e}")
            return False

    def read_serial_data(self):
        """Background thread function to continuously read serial data from Arduino"""
        retry_interval = self.INITIAL_RETRY_INTERVAL
        last_smoke_state = False

        while self._should_run:
            try:
                if not self.serial_connection or not self.serial_connection.is_open:
                    serial_port = self.find_arduino_port() or '/dev/cu.usbmodem1101'
                    self.serial_connection = serial.Serial(serial_port, 9600, timeout=1)
                    logger.info(f"Connected to Arduino on {serial_port}")
                    self.data['connected'] = True
                    retry_interval = self.INITIAL_RETRY_INTERVAL  # Reset retry interval on successful connection

                while self._should_run and self.serial_connection.is_open:
                    if self.serial_connection.in_waiting:
                        line = self.serial_connection.readline().decode('utf-8').strip()
                        if line:  # Only process non-empty lines
                            try:
                                new_data = json.loads(line)
                                
                                # Handle motion detection
                                if 'motionDetected' in new_data:
                                    self.handle_motion_event(new_data['motionDetected'])
                                
                                # Handle smoke detection changes
                                if 'smokeDetected' in new_data:
                                    smoke_detected = bool(new_data['smokeDetected'])
                                    if smoke_detected != last_smoke_state:
                                        logger.info(f"Smoke state changed: {smoke_detected}")
                                        last_smoke_state = smoke_detected
                                
                                self.data.update(new_data)
                                self.data['lastUpdate'] = time.strftime('%Y-%m-%d %H:%M:%S')
                                self.data['connected'] = True
                                
                            except json.JSONDecodeError as e:
                                logger.warning(f"Invalid JSON data received: {line}, Error: {e}")
                    time.sleep(0.1)  # Prevent CPU overload
                    
            except serial.SerialException as e:
                logger.error(f"Serial port error: {e}")
                self.data['connected'] = False
                if self.serial_connection:
                    try:
                        self.serial_connection.close()
                    except:
                        pass
                self.serial_connection = None
                
                # Reset smoke state on disconnection
                last_smoke_state = False
                self.data['smokeDetected'] = False
                
                # Implement exponential backoff
                retry_interval = min(retry_interval * 2, self.MAX_RETRY_INTERVAL)
                logger.info(f"Retrying connection in {retry_interval} seconds")
                time.sleep(retry_interval)

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