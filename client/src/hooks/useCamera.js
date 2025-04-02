import { useState, useEffect, useRef, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

// COCO dataset class labels
const COCO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog',
  'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella',
  'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball', 'kite',
  'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket', 'bottle',
  'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich',
  'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
  'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote',
  'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book',
  'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
];

// Using a pre-trained COCO-SSD model that's compatible with TensorFlow.js
const MODEL_URL = null; // We'll use the COCO-SSD model directly

export const useCamera = () => {
  const [model, setModel] = useState(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [modelLoadingProgress, setModelLoadingProgress] = useState(0);
  const [error, setError] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detections, setDetections] = useState([]);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [personDetected, setPersonDetected] = useState(false);
  const [personDetectionTime, setPersonDetectionTime] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastNotificationTimeRef = useRef(0);
  const wsRef = useRef(null);
  const personAlertTimeoutRef = useRef(null);

  // Load the object detection model
  const loadModel = useCallback(async () => {
    try {
      setIsModelLoading(true);
      setModelLoadingProgress(0);
      setError(null);

      // Ensure TensorFlow.js is ready
      await tf.ready();
      console.log('TensorFlow.js is ready');
      
      // Set the backend to WebGL for better performance
      await tf.setBackend('webgl');
      console.log('Using backend:', tf.getBackend());

      // Progress simulation
      const progressInterval = setInterval(() => {
        setModelLoadingProgress(prev => {
          const newProgress = prev + (5 * Math.random());
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 300);

      try {
        // Load the COCO-SSD model directly
        console.log('Loading COCO-SSD model...');
        const loadedModel = await cocoSsd.load({
          base: 'lite_mobilenet_v2' // Use a lighter model for better performance
        });
        
        setModel(loadedModel);
        setModelLoadingProgress(100);
        console.log('COCO-SSD model loaded successfully');
      } catch (modelError) {
        console.error('Error loading COCO-SSD model:', modelError);
        setError(`Failed to load the object detection model: ${modelError.message}. Please refresh the page and try again.`);
      }

      clearInterval(progressInterval);
    } catch (err) {
      console.error('Error in model loading:', err);
      setError(`Failed to load the object detection model: ${err.message}. Please refresh the page and try again.`);
      setModelLoadingProgress(0);
    } finally {
      setIsModelLoading(false);
    }
  }, []);

  // Connect to WebSocket for broadcasting detection data
  const connectToWebSocket = useCallback(() => {
    try {
      // Close existing connection if any
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      
      // Determine WebSocket URL based on current location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws/camera/`;
      
      console.log(`Connecting to WebSocket at ${wsUrl}`);
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connection established');
        // Identify as producer if running on localhost
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocalhost) {
          ws.send(JSON.stringify({ type: 'producer' }));
        } else {
          ws.send(JSON.stringify({ type: 'consumer' }));
        }
      };
      
      ws.onclose = (event) => {
        console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
        // Try to reconnect after a delay
        setTimeout(() => {
          if (cameraActive) {
            connectToWebSocket();
          }
        }, 5000);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      wsRef.current = ws;
    } catch (err) {
      console.error('Error connecting to WebSocket:', err);
    }
  }, [cameraActive]);

  // Send detection data to WebSocket
  const sendDetectionData = useCallback((predictions) => {
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        // Filter and format detection data
        const detectionData = {
          type: 'detection',
          data: {
            timestamp: new Date().toISOString(),
            detections: predictions.map(pred => ({
              class: pred.class,
              confidence: pred.score,
              bbox: pred.bbox
            })),
            personDetected: predictions.some(pred => pred.class === 'person')
          }
        };
        
        wsRef.current.send(JSON.stringify(detectionData));
      }
    } catch (err) {
      console.error('Error sending detection data:', err);
    }
  }, []);

  // Detect objects in the video stream
  const detectObjects = useCallback(async () => {
    if (!model || !videoRef.current || !canvasRef.current) return;
    
    const runDetection = async () => {
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // Ensure video is ready and has valid dimensions before processing
        if (video.videoWidth === 0 || video.videoHeight === 0 || !video.readyState || video.readyState < 2) {
          console.log("Video not ready yet or dimensions invalid, waiting...");
          animationFrameRef.current = requestAnimationFrame(runDetection);
          return;
        }
        
        // Match canvas size to video
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        
        // Draw the current video frame
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Detect objects with COCO-SSD model
        let predictions;
        try {
          // Try to detect using video element first
          predictions = await model.detect(video, undefined, 0.5);
        } catch (detectionErr) {
          console.warn('Error detecting from video element, trying canvas fallback:', detectionErr);
          try {
            // Fallback to using the canvas element for detection if video element fails
            predictions = await model.detect(canvas, undefined, 0.5);
          } catch (canvasErr) {
            console.error('Canvas detection also failed:', canvasErr);
            throw new Error(`Detection failed on both video and canvas: ${canvasErr.message}`);
          }
        }
        
        // Draw bounding boxes
        drawBoundingBoxes(ctx, predictions);
        
        // Update state with detections
        setDetections(predictions);
        
        // Send detection data to WebSocket
        sendDetectionData(predictions);
        
        // Check if a person is detected
        const peopleDetected = predictions.some(prediction => prediction.class === 'person');
        
        // Only trigger notification if we weren't detecting a person before but now we are
        // Also limit notifications to once every 5 seconds
        const currentTime = Date.now();
        if (peopleDetected && !personDetected && (currentTime - lastNotificationTimeRef.current > 5000)) {
          setPersonDetected(true);
          setPersonDetectionTime(new Date().toLocaleTimeString());
          lastNotificationTimeRef.current = currentTime;
          
          // Clear any existing timeout
          if (personAlertTimeoutRef.current) {
            clearTimeout(personAlertTimeoutRef.current);
          }
          
          // Notify the server about person detection to trigger server-side camera capture
          notifyServerAboutPersonDetection();
        } else if (!peopleDetected && personDetected) {
          // Set a timeout to reset personDetected after 3 seconds of no detection
          // This prevents flickering when detection is intermittent
          if (personAlertTimeoutRef.current) {
            clearTimeout(personAlertTimeoutRef.current);
          }
          
          personAlertTimeoutRef.current = setTimeout(() => {
            setPersonDetected(false);
            setPersonDetectionTime(null);
          }, 3000);
        }
        
        // Continue the detection loop if still detecting
        if (isDetecting) {
          animationFrameRef.current = requestAnimationFrame(runDetection);
        }
      } catch (err) {
        console.error('Error in object detection:', err);
        setError(`Detection error: ${err.message}`);
        setIsDetecting(false);
      }
    };
    
    // Start the detection loop
    runDetection();
  }, [model, isDetecting, personDetected, sendDetectionData]);

  // Draw bounding boxes for COCO-SSD model
  const drawBoundingBoxes = (ctx, predictions) => {
    // First, check if we need to add a person detection alert overlay
    const personPredictions = predictions.filter(pred => pred.class === 'person');
    const hasPersons = personPredictions.length > 0;
    
    if (hasPersons) {
      // Add a semi-transparent red border around the entire canvas
      const canvas = ctx.canvas;
      const borderWidth = Math.max(5, Math.min(canvas.width, canvas.height) * 0.02); // 2% of smaller dimension, min 5px
      
      // Save current context state
      ctx.save();
      
      // Draw alert border
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
      ctx.lineWidth = borderWidth;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
      
      // Add alert banner at the top
      const bannerHeight = Math.max(30, canvas.height * 0.06); // 6% of height, min 30px
      ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
      ctx.fillRect(0, 0, canvas.width, bannerHeight);
      
      // Add text
      const fontSize = Math.max(16, Math.min(canvas.width, canvas.height) * 0.03); // 3% of smaller dimension, min 16px
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const alertText = `PERSON DETECTED (${personPredictions.length})`;
      ctx.fillText(alertText, canvas.width / 2, bannerHeight / 2);
      
      // Add timestamp at bottom right
      const timestamp = new Date().toLocaleTimeString();
      const timestampFontSize = fontSize * 0.7;
      ctx.font = `${timestampFontSize}px Arial`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(timestamp, canvas.width - 10, canvas.height - 10);
      
      // Restore context state
      ctx.restore();
    }
    
    // Now draw individual bounding boxes
    predictions.forEach(prediction => {
      // Extract prediction information
      const [x, y, width, height] = prediction.bbox;
      const isPerson = prediction.class === 'person';
      const confidence = Math.round(prediction.score * 100);
      const label = `${prediction.class} ${confidence}%`;
      
      // Use different colors for persons vs other objects
      ctx.strokeStyle = isPerson ? '#FF0000' : '#00BFFF';
      ctx.lineWidth = isPerson ? 4 : 2;
      ctx.strokeRect(x, y, width, height);
      
      // Draw label background
      ctx.fillStyle = isPerson ? '#FF0000' : '#00BFFF';
      const textWidth = ctx.measureText(label).width;
      ctx.fillRect(x, y - 25, textWidth + 10, 25);
      
      // Draw label text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = isPerson ? 'bold 18px Arial' : '16px Arial';
      ctx.fillText(label, x + 5, y - 7);
      
      // For persons, add additional visual cues
      if (isPerson) {
        // Draw corner highlights
        const cornerSize = Math.min(width, height) * 0.2;
        ctx.strokeStyle = '#FFFF00';
        ctx.lineWidth = 2;
        
        // Top-left corner
        ctx.beginPath();
        ctx.moveTo(x, y + cornerSize);
        ctx.lineTo(x, y);
        ctx.lineTo(x + cornerSize, y);
        ctx.stroke();
        
        // Top-right corner
        ctx.beginPath();
        ctx.moveTo(x + width - cornerSize, y);
        ctx.lineTo(x + width, y);
        ctx.lineTo(x + width, y + cornerSize);
        ctx.stroke();
        
        // Bottom-right corner
        ctx.beginPath();
        ctx.moveTo(x + width, y + height - cornerSize);
        ctx.lineTo(x + width, y + height);
        ctx.lineTo(x + width - cornerSize, y + height);
        ctx.stroke();
        
        // Bottom-left corner
        ctx.beginPath();
        ctx.moveTo(x + cornerSize, y + height);
        ctx.lineTo(x, y + height);
        ctx.lineTo(x, y + height - cornerSize);
        ctx.stroke();
      }
    });
  };

  // Get available cameras
  const getAvailableCameras = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        throw new Error('Camera enumeration not supported in this browser');
      }
      
      // Request permission first - this helps get labels
      if (!streamRef.current) {
        try {
          // Try to get a temporary stream to force permission prompt
          // This will help us get the device labels
          const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          
          // Store all tracks to stop them after enumeration
          const tracks = tempStream.getTracks();
          
          // Now enumerate devices - with permission we should get labels
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          
          console.log('Available video devices (with permission):', videoDevices);
          setAvailableCameras(videoDevices);
          
          // Stop all tracks from the temporary stream
          tracks.forEach(track => track.stop());
          
          // If we have video devices and no camera is selected yet, select the last one (usually external webcam)
          if (videoDevices.length > 0 && !selectedCameraId) {
            // Prefer the last device in the list (often external webcam)
            setSelectedCameraId(videoDevices[videoDevices.length - 1].deviceId);
          }
          
          return videoDevices;
        } catch (permErr) {
          console.warn('Could not get camera permission for labels:', permErr);
          // Fall back to enumeration without labels
        }
      }
      
      // Regular enumeration (may or may not have labels depending on permissions)
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.log('Available video devices:', videoDevices);
      setAvailableCameras(videoDevices);
      
      // If we have video devices and no camera is selected yet, select the last one (usually external webcam)
      if (videoDevices.length > 0 && !selectedCameraId) {
        // Prefer the last device in the list (often external webcam)
        setSelectedCameraId(videoDevices[videoDevices.length - 1].deviceId);
      }
      
      return videoDevices;
    } catch (err) {
      console.error('Error enumerating devices:', err);
      setError(`Failed to get camera list: ${err.message}`);
      return [];
    }
  }, [selectedCameraId]);

  // Select a specific camera
  const selectCamera = useCallback((deviceId) => {
    setSelectedCameraId(deviceId);
    
    // If camera is already active, restart it with the new device
    if (cameraActive) {
      stopCamera();
      // Short delay to ensure camera is fully stopped
      setTimeout(() => {
        startCamera();
      }, 300);
    }
  }, [cameraActive]);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      
      // Connect to WebSocket for broadcasting detection data
      connectToWebSocket();
      
      // Check if mediaDevices API is available
      if (!navigator.mediaDevices) {
        // Check if we're in a secure context
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
          throw new Error('Camera access requires a secure context (HTTPS) or localhost. Please use HTTPS or localhost to access this feature.');
        } else {
          throw new Error('Camera API is not available in your browser. Please try a different browser.');
        }
      }
      
      // If we don't have a camera list yet, get it
      if (availableCameras.length === 0) {
        const cameras = await getAvailableCameras();
        if (cameras.length === 0) {
          throw new Error('No cameras detected on your device');
        }
      }
      
      const constraints = {
        video: selectedCameraId 
          ? { 
              deviceId: { exact: selectedCameraId },
              width: { ideal: 640 },
              height: { ideal: 480 }
            }
          : {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: 'environment'
            }
      };
      
      console.log('Using camera constraints:', constraints);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()
            .then(() => {
              setCameraActive(true);
              console.log('Camera started successfully');
              
              // Set initial canvas dimensions based on video dimensions
              if (canvasRef.current && videoRef.current.videoWidth && videoRef.current.videoHeight) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                console.log(`Setting initial canvas dimensions to ${canvasRef.current.width}x${canvasRef.current.height}`);
              } else {
                // Set fallback dimensions if video dimensions aren't available
                if (canvasRef.current) {
                  canvasRef.current.width = 640;
                  canvasRef.current.height = 480;
                  console.log('Using fallback canvas dimensions 640x480');
                }
              }
            })
            .catch(err => {
              console.error('Error playing video:', err);
              setError('Failed to start video playback. Please try again.');
            });
        };
        
        // Add error handling for video element
        videoRef.current.onerror = (err) => {
          console.error('Video element error:', err);
          setError(`Video error: ${err}`);
        };
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError(`Failed to access camera: ${err.message}. Please make sure you have granted camera permissions.`);
    }
  }, [selectedCameraId, availableCameras, getAvailableCameras]);

  // Use a mock camera for development/testing when real camera is not available
  const useMockCamera = useCallback(() => {
    try {
      setError(null);
      
      // Create a canvas element to generate mock video
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      
      // Function to draw a frame with some sample content
      const drawFrame = () => {
        // Clear canvas
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw some sample objects that the model might detect
        // Person silhouette
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.ellipse(320, 240, 100, 200, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw text
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.fillText('Mock Camera Feed', 20, 30);
        ctx.fillText('(Real camera unavailable)', 20, 60);
        
        // Add timestamp
        const now = new Date();
        ctx.fillText(now.toLocaleTimeString(), 20, 460);
        
        // Capture as stream
        if (videoRef.current) {
          videoRef.current.srcObject = canvas.captureStream(30);
        }
      };
      
      // Start animation loop
      const interval = setInterval(drawFrame, 1000 / 30); // 30fps
      
      if (videoRef.current) {
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()
            .then(() => {
              setCameraActive(true);
              console.log('Mock camera started successfully');
            })
            .catch(err => {
              console.error('Error playing mock video:', err);
              clearInterval(interval);
            });
        };
        
        // Store the interval ID for cleanup
        streamRef.current = { 
          getTracks: () => [{ stop: () => clearInterval(interval) }] 
        };
      }
    } catch (err) {
      console.error('Error setting up mock camera:', err);
      setError(`Failed to set up mock camera: ${err.message}`);
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach(track => track.stop());
      streamRef.current = null;
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      setCameraActive(false);
      setIsDetecting(false);
      
      // Clear and reset canvas with valid dimensions
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        // Ensure canvas has valid dimensions
        if (canvas.width === 0 || canvas.height === 0) {
          canvas.width = 640;
          canvas.height = 480;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      
      setDetections([]);
      
      // Cancel any pending animation frames
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  }, []);

  // Start/stop detection
  const toggleDetection = useCallback(() => {
    setIsDetecting(prevState => {
      const newState = !prevState;
      
      // If we're turning detection on and the camera is active, start the detection loop
      if (newState && cameraActive) {
        detectObjects();
      } else if (!newState && animationFrameRef.current) {
        // If we're turning detection off, cancel any pending animation frames
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      return newState;
    });
  }, [cameraActive, detectObjects]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [stopCamera]);

  // Start detection when isDetecting becomes true
  useEffect(() => {
    if (isDetecting && model && cameraActive) {
      detectObjects();
    }
  }, [isDetecting, model, cameraActive, detectObjects]);

  // Initialize - get camera list on mount
  useEffect(() => {
    getAvailableCameras();
  }, [getAvailableCameras]);

  // Load the model
  useEffect(() => {
    loadModel();
  }, [loadModel]);

  // Add this function to notify the server
  const notifyServerAboutPersonDetection = async () => {
    try {
      // Don't make an API call here since we're now handling this in CameraView.jsx
      console.log('Person detection event triggered in useCamera hook');
      // We're leaving this function as a placeholder for future extension
      return true;
    } catch (error) {
      console.error('Error in person detection hook:', error);
      return false;
    }
  };
  
  // Add function to capture an image from the camera feed
  const captureImage = useCallback(() => {
    if (!cameraActive || !videoRef.current || !canvasRef.current) {
      console.warn('Cannot capture image: camera not active or references not available');
      return null;
    }
    
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      // Ensure canvas dimensions match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Get canvas context and draw current video frame
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to data URL (base64)
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      console.log('Image captured successfully');
      
      // Return the data URL
      return imageDataUrl;
    } catch (err) {
      console.error('Error capturing image:', err);
      return null;
    }
  }, [cameraActive]);
  
  // Add function to toggle the camera (stop if running, start if stopped)
  const toggleCamera = useCallback(() => {
    if (cameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  }, [cameraActive, startCamera, stopCamera]);

  return {
    videoRef,
    canvasRef,
    isModelLoading,
    modelLoadingProgress,
    error,
    cameraActive,
    isDetecting,
    detections,
    personDetected,
    personDetectionTime,
    startCamera,
    useMockCamera,
    stopCamera,
    toggleDetection,
    availableCameras,
    selectedCameraId,
    selectCamera,
    getAvailableCameras,
    captureImage,
    toggleCamera
  };
};
