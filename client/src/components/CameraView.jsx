import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Container, 
  Paper, 
  Grid, 
  CircularProgress, 
  Button,
  Chip,
  Stack,
  useTheme,
  Fade,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Snackbar,
  Alert as MuiAlert,
  Switch,
  FormControlLabel,
  AlertTitle,
  Alert
} from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonIcon from '@mui/icons-material/Person';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import SyncIcon from '@mui/icons-material/Sync';
import SyncDisabledIcon from '@mui/icons-material/SyncDisabled';
import { useCamera } from '../hooks/useCamera';
import { playNotificationSound } from '../utils/soundUtils';
import CameraRelay from './CameraRelay';

// Add a helper function to check if we're in a secure context
const isSecureContext = () => {
  return window.isSecureContext || 
         window.location.protocol === 'https:' || 
         window.location.hostname === 'localhost';
};

// Add a helper function to check if we should use the camera relay
const shouldUseCameraRelay = () => {
  return window.location.protocol === 'https:' && 
         window.location.hostname !== 'localhost';
};

// Helper function to notify server about person detection
const notifyServerAboutPerson = async (confidence = 0.85) => {
  try {
    const accessToken = localStorage.getItem('accessToken');
    const response = await fetch('/api/person-detected/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': accessToken ? `Bearer ${accessToken}` : ''
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        confidence
      })
    });
    
    if (response.ok) {
      console.log('Person detection notification sent to server successfully');
      return true;
    } else {
      console.error('Failed to notify server about person detection:', await response.text());
      return false;
    }
  } catch (error) {
    console.error('Error notifying server about person detection:', error);
    return false;
  }
};

const CameraView = () => {
  const theme = useTheme();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [useCameraRelay, setUseCameraRelay] = useState(shouldUseCameraRelay());
  const isLocalhost = useMemo(() => window.location.hostname === 'localhost', []);
  const [lastCaptureTime, setLastCaptureTime] = useState(0);
  const captureTimeoutRef = useRef(null);
  
  const {
    videoRef,
    canvasRef,
    isModelLoading,
    modelLoadingProgress,
    error,
    cameraActive,
    isDetecting,
    detections,
    personDetected,
    startCamera,
    useMockCamera,
    stopCamera,
    toggleDetection,
    availableCameras,
    selectedCameraId,
    selectCamera,
    getAvailableCameras,
    toggleCamera,
    captureImage
  } = useCamera();

  const videoContainerRef = useRef(null);

  // Automatically start camera and detection when component mounts - using useCallback
  useEffect(() => {
    // Wait for model to load before starting camera
    if (!isModelLoading && modelLoadingProgress === 100 && !cameraActive) {
      console.log('Auto-starting camera...');
      startCamera();
    }
  }, [isModelLoading, modelLoadingProgress, cameraActive, startCamera]);

  // Start detection when camera becomes active
  useEffect(() => {
    if (cameraActive && !isDetecting) {
      console.log('Auto-starting detection...');
      toggleDetection();
    }
  }, [cameraActive, isDetecting, toggleDetection]);

  // Handle notification display when a person is detected
  useEffect(() => {
    if (personDetected && isDetecting) {
      setNotificationOpen(true);
      
      // Play sound notification if enabled
      if (soundEnabled) {
        playNotificationSound();
      }

      // Trigger image capture with rate limiting (max once every 5 seconds)
      const currentTime = Date.now();
      if (currentTime - lastCaptureTime > 5000) {
        // Clear any existing timeout
        if (captureTimeoutRef.current) {
          clearTimeout(captureTimeoutRef.current);
        }

        // Set a timeout to capture after short delay to allow camera to stabilize
        captureTimeoutRef.current = setTimeout(async () => {
          console.log('Triggering automatic image capture on person detection');
          
          // Try the server API first
          const apiSuccess = await notifyServerAboutPerson();
          
          // If API fails, use local capture
          if (!apiSuccess) {
            captureImage();
          }
          
          setLastCaptureTime(Date.now());
        }, 500);
      }
    }

    // Cleanup function
    return () => {
      if (captureTimeoutRef.current) {
        clearTimeout(captureTimeoutRef.current);
      }
    };
  }, [personDetected, isDetecting, soundEnabled, captureImage, lastCaptureTime]);

  // Handle closing the notification
  const handleCloseNotification = useCallback((event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setNotificationOpen(false);
  }, []);

  // Toggle sound notifications
  const handleToggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev);
  }, []);

  // Memoize camera relay handling for better performance
  const handleRelayFrame = useCallback((canvas) => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.drawImage(canvas, 0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [canvasRef]);

  // Toggle camera relay 
  const handleToggleCameraRelay = useCallback(() => {
    if (cameraActive) {
      toggleCamera();
      setTimeout(() => {
        setUseCameraRelay(prev => !prev);
        toggleCamera();
      }, 500);
    } else {
      setUseCameraRelay(prev => !prev);
    }
  }, [cameraActive, toggleCamera]);

  // Memoize detection filter for better performance
  const peopleDetected = useMemo(() => 
    detections.filter(detection => detection.class === 'person').length,
    [detections]
  );

  // Memoize other objects for better performance
  const otherObjectsDetected = useMemo(() => 
    detections.filter(detection => detection.class !== 'person'),
    [detections]
  );

  // Render loading indicator
  const renderLoading = useMemo(() => (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        my: 4
      }}
    >
      <CircularProgress 
        variant="determinate" 
        value={modelLoadingProgress} 
        size={80} 
        thickness={4}
        sx={{ mb: 2 }}
      />
      <Typography variant="h6">
        Loading Object Detection Model ({modelLoadingProgress}%)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        This may take a few moments depending on your internet speed
      </Typography>
    </Box>
  ), [modelLoadingProgress]);

  // Memoize the camera feed component to prevent unnecessary re-renders
  const renderCameraFeed = useMemo(() => (
    <Box
      ref={videoContainerRef}
      sx={{
        position: 'relative',
        backgroundColor: 'black',
        borderRadius: 1,
        overflow: 'hidden',
        aspectRatio: '4/3',
        width: '100%',
      }}
    >
      {useCameraRelay ? (
        <CameraRelay 
          active={cameraActive} 
          onFrame={handleRelayFrame}
          canvasRef={canvasRef}
        />
      ) : (
        <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
          <video
            ref={videoRef}
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)', // Mirror the camera
              display: cameraActive ? 'block' : 'none',
            }}
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              // No transform here to keep text readable
              zIndex: 2,
            }}
          />
          
          {/* Camera controls overlay */}
          <Box 
            sx={{ 
              position: 'absolute', 
              bottom: 0, 
              right: 0, 
              m: 1,
              zIndex: 10, 
              display: 'flex',
              gap: 1
            }}
          >
            {/* Capture image button */}
            <Tooltip title="Capture image">
              <IconButton
                color="primary"
                onClick={captureImage}
                disabled={!cameraActive}
                sx={{ 
                  bgcolor: 'rgba(0, 0, 0, 0.5)',
                  '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' },
                  '&.Mui-disabled': { 
                    bgcolor: 'rgba(0, 0, 0, 0.2)', 
                    color: 'rgba(255, 255, 255, 0.3)' 
                  } 
                }}
              >
                <PhotoCameraIcon />
              </IconButton>
            </Tooltip>
            
            {/* Add a button to toggle between direct camera and relay */}
            {!isLocalhost && (
              <Tooltip title={useCameraRelay ? "Use direct camera access" : "Use camera relay"}>
                <IconButton
                  color={useCameraRelay ? "primary" : "default"}
                  onClick={handleToggleCameraRelay}
                  sx={{ 
                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                    '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' }
                  }}
                >
                  {useCameraRelay ? <SyncIcon /> : <SyncDisabledIcon />}
                </IconButton>
              </Tooltip>
            )}
          </Box>
          
          {/* Camera status indicator */}
          {!cameraActive && (
            <Box sx={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              textAlign: 'center'
            }}>
              <Typography variant="body1" color="white">
                Camera is initializing...
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  ), [
    videoContainerRef, useCameraRelay, cameraActive, handleRelayFrame, 
    canvasRef, videoRef, captureImage, isLocalhost, handleToggleCameraRelay
  ]);

  // Memoize the detection panel to prevent unnecessary re-renders
  const renderDetectionPanel = useMemo(() => (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 2, 
        height: '100%', 
        minHeight: 300,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0 }}>
          <SmartToyIcon fontSize="small" color="primary" />
          Detected Objects
        </Typography>
        
        <FormControlLabel
          control={
            <Switch 
              size="small"
              checked={soundEnabled}
              onChange={handleToggleSound}
              icon={<VolumeOffIcon fontSize="small" />}
              checkedIcon={<VolumeUpIcon fontSize="small" />}
            />
          }
          label={
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
              {soundEnabled ? "Sound On" : "Sound Off"}
            </Typography>
          }
          sx={{ m: 0 }}
        />
      </Box>
      
      {detections.length > 0 ? (
        <Box sx={{ mt: 2, flex: 1, overflowY: 'auto' }}>
          <Stack spacing={1}>
            {peopleDetected > 0 && (
              <Chip
                label={`People detected: ${peopleDetected}`}
                color="primary"
                sx={{ justifyContent: 'flex-start', fontWeight: 'bold' }}
              />
            )}
            {otherObjectsDetected.map((detection, index) => (
              <Chip
                key={index}
                label={`${detection.class}`}
                color="primary"
                variant="outlined"
                sx={{ justifyContent: 'flex-start' }}
              />
            ))}
          </Stack>
        </Box>
      ) : (
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
            {cameraActive && isDetecting 
              ? "No objects detected yet" 
              : "Camera is starting automatically..."}
          </Typography>
        </Box>
      )}
    </Paper>
  ), [
    soundEnabled, handleToggleSound, detections, peopleDetected, 
    otherObjectsDetected, cameraActive, isDetecting
  ]);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Fade in timeout={500}>
        <Paper 
          elevation={3} 
          sx={{ 
            p: { xs: 2, sm: 3, md: 4 }, 
            borderRadius: 2,
            mb: 4
          }}
        >
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              mb: 3
            }}
          >
            <VideocamIcon color="primary" sx={{ fontSize: 32 }} />
            Camera Feed with Object Detection
          </Typography>

          {error && (
            <MuiAlert 
              severity="error" 
              sx={{ mb: 3 }}
              action={
                error.includes('secure context') ? (
                  <Button 
                    color="inherit" 
                    size="small"
                    onClick={() => {
                      const currentPath = window.location.pathname;
                      const currentSearch = window.location.search;
                      window.location.href = `http://localhost:5173${currentPath}${currentSearch}`;
                    }}
                    sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
                  >
                    Switch to localhost
                  </Button>
                ) : null
              }
            >
              {error}
              {error.includes('secure context') && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Camera access requires HTTPS or localhost. You can:
                  <ul>
                    <li>
                      <Button 
                        variant="text" 
                        size="small" 
                        color="primary"
                        onClick={() => {
                          const currentPath = window.location.pathname;
                          const currentSearch = window.location.search;
                          window.location.href = `http://localhost:5173${currentPath}${currentSearch}`;
                        }}
                        sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
                      >
                        Switch to localhost
                      </Button> (recommended for macOS development)
                    </li>
                    <li>
                      <Button 
                        variant="text" 
                        size="small" 
                        color="primary"
                        onClick={() => {
                          window.open('/https-setup-instructions.html', '_blank');
                        }}
                        sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
                      >
                        Set up HTTPS
                      </Button> (optimized for macOS with Apple Silicon)
                    </li>
                    <li>
                      <Button 
                        variant="text" 
                        size="small" 
                        color="primary"
                        onClick={() => {
                          setUseCameraRelay(true);
                        }}
                        sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
                      >
                        Use camera relay
                      </Button> (access camera through a secure proxy)
                    </li>
                    <li>Use the mock camera option below</li>
                  </ul>
                  <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(25, 118, 210, 0.08)', borderRadius: 1 }}>
                    <strong>Note for macOS users:</strong> If you're using macOS with Apple Silicon, the setup script has been optimized for your system. Click "Set up HTTPS" for detailed instructions.
                  </Box>
                </Typography>
              )}
            </MuiAlert>
          )}

          {/* Camera Selection - only show when we have multiple cameras */}
          {availableCameras.length > 1 && (
            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel id="camera-select-label">Camera</InputLabel>
                <Select
                  labelId="camera-select-label"
                  id="camera-select"
                  value={selectedCameraId || ''}
                  onChange={(e) => selectCamera(e.target.value)}
                  label="Camera"
                >
                  {availableCameras.map((camera) => (
                    <MenuItem key={camera.deviceId} value={camera.deviceId}>
                      {camera.label || `Camera ${camera.deviceId.substring(0, 5)}...`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Tooltip title="Refresh camera list">
                  <IconButton 
                    size="small" 
                    onClick={getAvailableCameras}
                    disabled={cameraActive}
                  >
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          )}

          {/* Loading Indicator */}
          {isModelLoading && renderLoading}

          {/* Camera and Detection Display */}
          {!isModelLoading && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                {renderCameraFeed}
              </Grid>
              
              <Grid item xs={12} md={4}>
                {renderDetectionPanel}
              </Grid>
            </Grid>
          )}
        </Paper>
      </Fade>
      
      {/* Person Detection Notification */}
      <Snackbar
        open={notificationOpen}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MuiAlert 
          onClose={handleCloseNotification} 
          severity="warning" 
          sx={{ width: '100%', display: 'flex', alignItems: 'center' }}
          icon={<PersonIcon />}
          variant="filled"
          elevation={6}
        >
          Person Detected! Image being captured.
        </MuiAlert>
      </Snackbar>
      
      {/* Add information about automatic background detection */}
      <Alert severity="success" sx={{ mb: 3 }}>
        <AlertTitle>Automatic Camera and Detection Active</AlertTitle>
        The camera feed and YOLOv7 object detection start automatically when you open this page. The system will:
        <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
          <li>Activate your camera and start detecting objects immediately</li>
          <li>Detect people and objects continuously</li>
          <li>Automatically capture images when people are detected</li>
          <li>Log all detections for later review</li>
        </ul>
      </Alert>
      
      {/* Add information about camera relay when it's being used */}
      {useCameraRelay && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>Using Camera Relay</AlertTitle>
          Your camera feed is being relayed through a secure connection. For this to work:
          <ol style={{ marginTop: '8px', paddingLeft: '20px' }}>
            <li>The camera relay server must be running on your machine</li>
            <li>You must have accessed the app via localhost at least once to grant camera permissions</li>
          </ol>
          <Button 
            variant="outlined" 
            size="small" 
            color="info" 
            sx={{ mt: 1 }}
            onClick={() => window.open('/camera-relay-instructions.html', '_blank')}
          >
            Learn More
          </Button>
        </Alert>
      )}
    </Container>
  );
};

export default React.memo(CameraView);
