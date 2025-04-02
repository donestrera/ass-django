from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser
import serial
import json
import threading
import time
import logging
from serial.tools import list_ports
from .models import MotionHistory
from rest_framework import status
import os
from django.conf import settings
from django.http import JsonResponse
from django.contrib.sites.shortcuts import get_current_site

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ImageUploadView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = []  # Allow unauthenticated access

    def post(self, request, *args, **kwargs):
        try:
            image_file = request.FILES.get('image')
            if not image_file:
                logger.error("No image file provided in request")
                return Response({
                    'error': 'No image file provided'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Save image to media directory
            media_dir = os.path.abspath(settings.MEDIA_ROOT)
            upload_dir = os.path.join(media_dir, 'captured_images')
            logger.info(f"Saving uploaded image to: {upload_dir}")
            
            # Create directory if it doesn't exist
            os.makedirs(upload_dir, exist_ok=True)

            # Generate a unique filename if one is not provided
            if not image_file.name or image_file.name == 'blob':
                timestamp = time.strftime('%Y%m%d_%H%M%S')
                image_file.name = f"uploaded_{timestamp}.jpg"
                logger.info(f"Generated filename for blob: {image_file.name}")

            file_path = os.path.join(upload_dir, image_file.name)
            logger.info(f"Saving to: {file_path}")
            
            with open(file_path, 'wb+') as destination:
                for chunk in image_file.chunks():
                    destination.write(chunk)
            
            logger.info(f"Image saved successfully to: {file_path}")
            
            # Create URL for the image
            base_url = request.build_absolute_uri('/').rstrip('/')
            image_url = f"{base_url}{settings.MEDIA_URL}captured_images/{image_file.name}"

            return Response({
                'message': 'Image uploaded successfully',
                'file_path': file_path,
                'url': image_url
            })
        except Exception as e:
            logger.error(f"Error uploading image: {e}")
            return JsonResponse({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




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
                # Check for common Arduino port patterns
                if ('usbserial' in port.device.lower() or 
                    'usbmodem' in port.device.lower() or 
                    'ttyusb' in port.device.lower()):
                    return port.device
            # Fallback to a direct check for ttyUSB0
            if os.path.exists('/dev/ttyUSB0'):
                return '/dev/ttyUSB0'
        except Exception as e:
            logger.error(f"Error finding Arduino port: {e}")
        return None

    def handle_motion_event(self, motion_detected):
        """Handle motion detection state changes"""
        try:
            if motion_detected and not self._last_motion_state:
                if MotionHistory.can_create_new_entry():
                    # Create motion history entry
                    motion_entry = MotionHistory.objects.create(
                        temperature=self.data['temperature'],
                        humidity=self.data['humidity'],
                        detection_type='pir'  # Specify PIR sensor as detection source
                    )
                    
                    # Capture image when motion is detected
                    try:
                        # Import here to avoid circular imports
                        import sys
                        import os.path
                        # Get the absolute path to the server directory
                        server_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                        sys.path.append(server_dir)
                        from camera import capture_and_upload_and_save
                        
                        # Get the full URL for the API endpoint
                        from django.contrib.sites.shortcuts import get_current_site
                        from django.conf import settings
                        
                        # Use localhost for API URL since this is running on the same server
                        api_url = "http://localhost:8000/api/upload-image/"
                        timestamp = time.strftime('%Y%m%d_%H%M%S')
                        filename = f"motion_pir_{timestamp}.jpg"
                        
                        # Get absolute path to media directory
                        media_dir = os.path.abspath(settings.MEDIA_ROOT)
                        captured_images_dir = os.path.join(media_dir, 'captured_images')
                        
                        # Ensure the directory exists
                        os.makedirs(captured_images_dir, exist_ok=True)
                        
                        # Start image capture in a separate thread to avoid blocking
                        capture_thread = threading.Thread(
                            target=capture_and_upload_and_save,
                            args=(api_url,),
                            kwargs={
                                'save_dir': captured_images_dir,
                                'filename': filename,
                                'capture_delay': 1
                            },
                            daemon=True
                        )
                        capture_thread.start()
                        logger.info(f"Started image capture for PIR motion event: {filename}")
                    except Exception as e:
                        logger.error(f"Failed to capture image: {e}")
                        import traceback
                        logger.error(traceback.format_exc())
                        
            elif not motion_detected and self._last_motion_state:
                latest_motion = MotionHistory.objects.filter(is_active=True, detection_type='pir').first()
                if latest_motion:
                    latest_motion.is_active = False
                    latest_motion.save()
            
            self._last_motion_state = motion_detected
        except Exception as e:
            logger.error(f"Error handling motion event: {e}")
            import traceback
            logger.error(traceback.format_exc())

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

    def read_serial_data(self):
        """Background thread function to continuously read serial data from Arduino"""
        retry_interval = self.INITIAL_RETRY_INTERVAL
        last_smoke_state = False

        while self._should_run:
            try:
                if not self.serial_connection or not self.serial_connection.is_open:
                    serial_port = self.find_arduino_port() or '/dev/cu.usbmodem1101'
                    logger.info(f"Attempting to connect to Arduino on port: {serial_port}")
                    self.serial_connection = serial.Serial(serial_port, 9600, timeout=1)
                    logger.info(f"Successfully connected to Arduino on {serial_port}")
                    self.data['connected'] = True
                    retry_interval = self.INITIAL_RETRY_INTERVAL

                while self._should_run and self.serial_connection.is_open:
                    if self.serial_connection.in_waiting:
                        line = self.serial_connection.readline().decode('utf-8').strip()
                        logger.info(f"Raw data received from Arduino: {line}")
                        if line:  # Only process non-empty lines
                            try:
                                new_data = json.loads(line)
                                logger.info(f"Parsed sensor data: {new_data}")
                                
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
                                logger.info(f"Updated sensor data state: {self.data}")
                                
                            except json.JSONDecodeError as e:
                                logger.warning(f"Invalid JSON data received: {line}, Error: {e}")
                    time.sleep(0.1)
                    
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
        
    def set_pir_state(self, enabled):
        """Enable or disable the PIR sensor"""
        command = "PIR_ON" if enabled else "PIR_OFF"
        result = self.send_command(command, timeout=1.0)
        if result:
            self.data['pirEnabled'] = enabled
        return result

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

@api_view(['POST'])
def person_detected(request):
    """Handle person detection from YOLOv7 and trigger camera capture"""
    try:
        # Extract data from request
        timestamp = request.data.get('timestamp')
        confidence = request.data.get('confidence', 0)
        
        logger.info(f"Person detected at {timestamp} with confidence {confidence}")
        
        # Import camera module
        try:
            import sys
            import os.path
            # Get the absolute path to the server directory
            server_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            sys.path.append(server_dir)
            from camera import capture_and_upload_and_save, test_camera_access
            logger.info(f"Camera module imported from {server_dir}")
            
            # Test camera access first
            if not test_camera_access():
                logger.error("Camera access test failed")
                return Response({
                    'error': 'Camera access test failed. Please check your webcam connection and permissions.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except ImportError as e:
            logger.error(f"Failed to import camera module: {e}")
            return Response({
                'error': f'Failed to import camera module: {e}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Generate unique filename with timestamp
        import time
        timestamp_str = time.strftime('%Y%m%d_%H%M%S')
        filename = f"person_detected_{timestamp_str}.jpg"
        
        # Get absolute path to media directory
        media_dir = os.path.abspath(settings.MEDIA_ROOT)
        captured_images_dir = os.path.join(media_dir, 'captured_images')
        logger.info(f"Media directory: {media_dir}")
        logger.info(f"Captured images directory: {captured_images_dir}")
        
        # Ensure the directory exists
        os.makedirs(captured_images_dir, exist_ok=True)
        
        # Get the full URL for the API endpoint
        # Use request.build_absolute_uri to get the base URL
        base_url = request.build_absolute_uri('/').rstrip('/')
        api_url = f"{base_url}/api/upload-image/"
        logger.info(f"API URL: {api_url}")
        
        # Start image capture in a separate thread to avoid blocking
        capture_thread = threading.Thread(
            target=capture_and_upload_and_save,
            args=(api_url,),
            kwargs={
                'save_dir': captured_images_dir,
                'filename': filename,
                'capture_delay': 0.5  # Reduced delay for faster capture
            },
            daemon=True
        )
        capture_thread.start()
        logger.info(f"Started image capture thread for {filename}")
        
        # Create a motion history entry for this detection
        try:
            MotionHistory.objects.create(
                temperature=SensorData().data.get('temperature'),
                humidity=SensorData().data.get('humidity'),
                detection_type='yolo',
                confidence=confidence
            )
            logger.info("Created motion history entry for YOLO detection")
        except Exception as e:
            logger.error(f"Error creating motion history entry: {e}")
        
        return Response({
            'message': 'Person detection processed successfully',
            'camera_capture_initiated': True,
            'filename': filename,
            'save_directory': captured_images_dir
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error processing person detection: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def captured_images(request):
    """Get a list of captured images"""
    try:
        # Get the captured_images directory path
        media_dir = os.path.abspath(settings.MEDIA_ROOT)
        images_dir = os.path.join(media_dir, 'captured_images')
        logger.info(f"Looking for images in: {images_dir}")
        
        # Create directory if it doesn't exist
        os.makedirs(images_dir, exist_ok=True)
        
        # Get all image files in the directory
        image_files = []
        
        # Check if directory exists and is accessible
        if not os.path.exists(images_dir):
            logger.error(f"Directory does not exist: {images_dir}")
            return Response({
                'error': f'Directory does not exist: {images_dir}',
                'images': [],
                'count': 0
            }, status=status.HTTP_200_OK)
            
        if not os.access(images_dir, os.R_OK):
            logger.error(f"Directory is not readable: {images_dir}")
            return Response({
                'error': f'Directory is not readable: {images_dir}',
                'images': [],
                'count': 0
            }, status=status.HTTP_200_OK)
        
        # List files in the directory
        try:
            files_in_dir = os.listdir(images_dir)
            logger.info(f"Found {len(files_in_dir)} files in directory")
        except Exception as e:
            logger.error(f"Error listing directory: {e}")
            return Response({
                'error': f'Error listing directory: {e}',
                'images': [],
                'count': 0
            }, status=status.HTTP_200_OK)
        
        # Process image files
        for filename in files_in_dir:
            if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
                file_path = os.path.join(images_dir, filename)
                
                try:
                    # Get file creation time
                    creation_time = os.path.getctime(file_path)
                    
                    # Determine detection type from filename
                    detection_type = 'unknown'
                    if 'person_detected' in filename:
                        detection_type = 'yolo'
                    elif 'motion_pir' in filename:
                        detection_type = 'pir'
                    elif 'test_capture' in filename:
                        detection_type = 'test'
                    
                    # Get file size
                    file_size = os.path.getsize(file_path)
                    
                    # Create URL for the image
                    # Use request.build_absolute_uri to get the base URL with scheme and domain
                    base_url = request.build_absolute_uri('/').rstrip('/')
                    image_url = f"{base_url}{settings.MEDIA_URL}captured_images/{filename}"
                    
                    # Check if file is readable and not empty
                    if os.access(file_path, os.R_OK) and file_size > 0:
                        image_files.append({
                            'filename': filename,
                            'url': image_url,
                            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(creation_time)),
                            'detection_type': detection_type,
                            'size': file_size
                        })
                        logger.debug(f"Added image to response: {filename}")
                    else:
                        logger.warning(f"Skipping unreadable or empty file: {filename}")
                except Exception as e:
                    logger.error(f"Error processing file {filename}: {e}")
                    import traceback
                    logger.error(traceback.format_exc())
        
        # Sort by timestamp (newest first)
        image_files.sort(key=lambda x: x['timestamp'], reverse=True)
        
        logger.info(f"Returning {len(image_files)} images")
        return Response({
            'images': image_files,
            'count': len(image_files),
            'directory': images_dir
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error retrieving captured images: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return Response({
            'error': str(e),
            'images': [],
            'count': 0
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def motion_history(request):
    """Get motion detection history"""
    try:
        # Get all motion history entries
        history = MotionHistory.objects.all().order_by('-timestamp')
        
        # Serialize the data
        history_data = []
        for entry in history:
            history_data.append({
                'id': entry.id,
                'timestamp': entry.timestamp,
                'temperature': entry.temperature,
                'humidity': entry.humidity,
                'detection_type': entry.detection_type,
                'confidence': entry.confidence,
                'is_active': entry.is_active
            })
        
        return Response(history_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error retrieving motion history: {e}")
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_captured_image(request, filename):
    """Delete a specific captured image"""
    try:
        # Get the captured_images directory path
        media_dir = os.path.abspath(settings.MEDIA_ROOT)
        images_dir = os.path.join(media_dir, 'captured_images')
        file_path = os.path.join(images_dir, filename)
        
        logger.info(f"Attempting to delete image: {file_path}")
        
        # Check if file exists
        if not os.path.exists(file_path):
            logger.error(f"File does not exist: {file_path}")
            return JsonResponse({
                'error': f'File does not exist: {filename}'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if file is an image
        if not filename.lower().endswith(('.jpg', '.jpeg', '.png')):
            logger.error(f"Not an image file: {filename}")
            return JsonResponse({
                'error': f'Not an image file: {filename}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Try more aggressive permission handling
        try:
            # First try to make file writable by everyone
            os.chmod(file_path, 0o666)
            logger.info(f"Changed permissions for file: {file_path}")
            
            # Handle metadata file permissions first
            metadata_file = os.path.splitext(file_path)[0] + "_metadata.json"
            if os.path.exists(metadata_file):
                try:
                    os.chmod(metadata_file, 0o666)
                    logger.info(f"Changed permissions for metadata file: {metadata_file}")
                except Exception as meta_perm_err:
                    logger.warning(f"Failed to change metadata file permissions: {meta_perm_err}")
        except Exception as perm_err:
            logger.warning(f"Failed to change permissions: {perm_err}")
            # Continue anyway - we'll try to delete even if chmod fails
        
        # Delete the file
        try:
            # Use subprocess for more robust deletion
            import subprocess
            result = subprocess.run(['rm', '-f', file_path], capture_output=True, text=True)
            
            if result.returncode != 0:
                logger.error(f"Command line deletion failed: {result.stderr}")
                # Fall back to regular deletion
                os.remove(file_path)
                
            logger.info(f"Successfully deleted image: {filename}")
            
            # Check for and delete metadata file if it exists
            metadata_file = os.path.splitext(file_path)[0] + "_metadata.json"
            if os.path.exists(metadata_file):
                try:
                    subprocess.run(['rm', '-f', metadata_file], capture_output=True, text=True)
                    logger.info(f"Also deleted metadata file: {os.path.basename(metadata_file)}")
                except Exception as meta_err:
                    logger.warning(f"Could not delete metadata file: {meta_err}")
            
            # Return a proper JSON response
            return JsonResponse({
                'success': True,
                'message': f'Successfully deleted image: {filename}'
            }, status=status.HTTP_200_OK)
        except PermissionError as pe:
            logger.error(f"Permission error deleting {filename}: {pe}")
            return JsonResponse({
                'error': f'Permission denied when deleting file: {str(pe)}'
            }, status=status.HTTP_403_FORBIDDEN)
        except Exception as del_err:
            logger.error(f"Error during file deletion: {del_err}")
            return JsonResponse({
                'error': f'Failed to delete file: {str(del_err)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    except Exception as e:
        logger.error(f"Error deleting image {filename}: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return JsonResponse({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_multiple_images(request):
    """Delete multiple captured images"""
    try:
        # Get the list of filenames from the request data
        filenames = request.data.get('filenames', [])
        
        if not filenames:
            return JsonResponse({
                'error': 'No filenames provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the captured_images directory path
        media_dir = os.path.abspath(settings.MEDIA_ROOT)
        images_dir = os.path.join(media_dir, 'captured_images')
        
        results = {
            'success': [],
            'failed': []
        }
        
        # Import subprocess for more robust deletion
        import subprocess
        
        for filename in filenames:
            file_path = os.path.join(images_dir, filename)
            
            # Check if file exists and is an image
            if os.path.exists(file_path) and filename.lower().endswith(('.jpg', '.jpeg', '.png')):
                try:
                    # Try more aggressive permission handling
                    try:
                        # First try to make file writable by everyone
                        os.chmod(file_path, 0o666)
                        logger.info(f"Changed permissions for file: {file_path}")
                        
                        # Handle metadata file permissions first
                        metadata_file = os.path.splitext(file_path)[0] + "_metadata.json"
                        if os.path.exists(metadata_file):
                            try:
                                os.chmod(metadata_file, 0o666)
                                logger.info(f"Changed permissions for metadata file: {metadata_file}")
                            except Exception as meta_perm_err:
                                logger.warning(f"Failed to change metadata file permissions: {meta_perm_err}")
                    except Exception as perm_err:
                        logger.warning(f"Failed to change permissions: {perm_err}")
                        # Continue anyway - we'll try to delete even if chmod fails

                    # Try to delete the file using subprocess for more robust deletion
                    result = subprocess.run(['rm', '-f', file_path], capture_output=True, text=True)
                    
                    if result.returncode != 0:
                        logger.error(f"Command line deletion failed: {result.stderr}")
                        # Fall back to regular deletion
                        os.remove(file_path)
                    
                    # Check for and delete metadata file if it exists
                    metadata_file = os.path.splitext(file_path)[0] + "_metadata.json"
                    if os.path.exists(metadata_file):
                        try:
                            subprocess.run(['rm', '-f', metadata_file], capture_output=True, text=True)
                            logger.info(f"Also deleted metadata file: {os.path.basename(metadata_file)}")
                        except Exception as meta_err:
                            logger.warning(f"Could not delete metadata file: {meta_err}")
                    
                    results['success'].append(filename)
                    logger.info(f"Successfully deleted image: {filename}")
                except PermissionError as pe:
                    results['failed'].append({
                        'filename': filename,
                        'error': f'Permission denied: {str(pe)}'
                    })
                    logger.error(f"Permission error deleting {filename}: {pe}")
                except Exception as e:
                    results['failed'].append({
                        'filename': filename,
                        'error': str(e)
                    })
                    logger.error(f"Error deleting image {filename}: {e}")
            else:
                results['failed'].append({
                    'filename': filename,
                    'error': 'File does not exist or is not an image'
                })
                logger.error(f"File does not exist or is not an image: {filename}")
        
        return JsonResponse({
            'results': results,
            'success_count': len(results['success']),
            'failed_count': len(results['failed']),
            'details': results['failed'] if results['failed'] else None
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error deleting multiple images: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return JsonResponse({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 