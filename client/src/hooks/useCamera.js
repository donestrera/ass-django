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
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);

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

  // Detect objects in the video stream
  const detectObjects = useCallback(async () => {
    if (!model || !videoRef.current || !canvasRef.current) return;
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Match canvas size to video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the current video frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Detect objects with COCO-SSD model
      const predictions = await model.detect(video);
      
      // Draw bounding boxes
      drawBoundingBoxes(ctx, predictions);
      
      // Update state with detections
      setDetections(predictions);
    } catch (err) {
      console.error('Error in object detection:', err);
      setError(`Detection error: ${err.message}`);
      setIsDetecting(false);
    }
  }, [model]);

  // Draw bounding boxes for COCO-SSD model
  const drawBoundingBoxes = (ctx, predictions) => {
    predictions.forEach(prediction => {
      // Extract prediction information
      const [x, y, width, height] = prediction.bbox;
      const score = prediction.score;
      const label = `${prediction.class} (${Math.round(score * 100)}%)`;
      
      // Draw rectangle
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, width, height);
      
      // Draw label background
      ctx.fillStyle = '#FF0000';
      const textWidth = ctx.measureText(label).width;
      ctx.fillRect(x, y - 25, textWidth + 10, 25);
      
      // Draw label text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '18px Arial';
      ctx.fillText(label, x + 5, y - 7);
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
            })
            .catch(err => {
              console.error('Error playing video:', err);
              setError('Failed to start video playback. Please try again.');
            });
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
      
      // Clear canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
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

  return {
    videoRef,
    canvasRef,
    isModelLoading,
    modelLoadingProgress,
    error,
    cameraActive,
    isDetecting,
    detections,
    startCamera,
    useMockCamera,
    stopCamera,
    toggleDetection,
    availableCameras,
    selectedCameraId,
    selectCamera,
    getAvailableCameras
  };
};
