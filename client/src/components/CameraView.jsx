import React, { useEffect, useState, useRef } from 'react';
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
  AlertTitle
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

const CameraView = () => {
  const theme = useTheme();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [useCameraRelay, setUseCameraRelay] = useState(shouldUseCameraRelay());
  const isLocalhost = window.location.hostname === 'localhost';
  
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
    captureImage,
    mockCamera,
    setMockCamera
  } = useCamera();

  const videoContainerRef = useRef(null);
  const onFrameRef = useRef(null);

  // Handle notification display when a person is detected
  useEffect(() => {
    if (personDetected && isDetecting) {
      setNotificationOpen(true);
      
      // Play sound notification if enabled
      if (soundEnabled) {
        playNotificationSound();
      }
    }
  }, [personDetected, isDetecting, soundEnabled]);

  // Handle closing the notification
  const handleCloseNotification = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setNotificationOpen(false);
  };

  // Toggle sound notifications
  const handleToggleSound = () => {
    setSoundEnabled(prev => !prev);
  };

  // Add a function to handle frames from the camera relay
  const handleRelayFrame = (canvas) => {
    // Process the frame as needed
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.drawImage(canvas, 0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

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
                      // Create a localhost URL with the same path
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
                          // Replace current URL with localhost equivalent
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
                          // Open the HTTPS setup instructions
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
                          // Toggle camera relay
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

          {/* Camera Selection */}
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

          {isModelLoading ? (
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                p: 4
              }}
            >
              <CircularProgress size={60} thickness={4} variant="determinate" value={modelLoadingProgress} />
              <Typography variant="h6" sx={{ mt: 2 }}>
                Loading YOLOv7 model: {modelLoadingProgress}%
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                This may take a few moments depending on your internet connection
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Box sx={{ position: 'relative', mb: 3 }}>
                  {/* Use CameraRelay when needed, otherwise use the regular camera view */}
                  {useCameraRelay ? (
                    <CameraRelay
                      active={cameraActive}
                      width={640}
                      height={480}
                      cameraId={selectedCameraId}
                      onFrame={handleRelayFrame}
                      onError={(message) => {
                        console.error("CameraRelay error:", message);
                        setError(message);
                      }}
                    />
                  ) : (
                    <Box
                      ref={videoContainerRef}
                      sx={{
                        position: 'relative',
                        width: '100%',
                        height: 0,
                        paddingBottom: '75%', // 4:3 aspect ratio
                        backgroundColor: 'black',
                        borderRadius: 1,
                        overflow: 'hidden'
                      }}
                    >
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                      <canvas
                        ref={canvasRef}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'none' // Hidden by default, used for capturing frames
                        }}
                      />
                      
                      {/* Overlay for detected objects */}
                      {detections.length > 0 && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none'
                          }}
                        >
                          {detections.map((detection, index) => (
                            detection.class !== 'person' && (
                              <Box
                                key={index}
                                sx={{
                                  position: 'absolute',
                                  left: `${detection.bbox[0] * 100}%`,
                                  top: `${detection.bbox[1] * 100}%`,
                                  width: `${detection.bbox[2] * 100}%`,
                                  height: `${detection.bbox[3] * 100}%`,
                                  border: `2px solid ${theme.palette.primary.main}`,
                                  borderRadius: '4px',
                                  boxSizing: 'border-box',
                                  '&::after': {
                                    content: `"${detection.class} ${Math.round(detection.confidence * 100)}%"`,
                                    position: 'absolute',
                                    top: '-24px',
                                    left: '0',
                                    backgroundColor: theme.palette.primary.main,
                                    color: theme.palette.primary.contrastText,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    whiteSpace: 'nowrap'
                                  }
                                }}
                              />
                            )
                          ))}
                        </Box>
                      )}
                      
                      {/* Camera controls */}
                      <Box sx={{ 
                        position: 'absolute', 
                        bottom: 16, 
                        right: 16, 
                        display: 'flex', 
                        gap: 1,
                        zIndex: 2
                      }}>
                        <Tooltip title={soundEnabled ? "Mute notifications" : "Enable notifications"}>
                          <IconButton
                            color={soundEnabled ? "primary" : "default"}
                            onClick={handleToggleSound}
                            sx={{ 
                              bgcolor: 'rgba(0, 0, 0, 0.5)',
                              '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' }
                            }}
                          >
                            {soundEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Capture image">
                          <span>
                            <IconButton
                              color="primary"
                              onClick={captureImage}
                              disabled={!cameraActive}
                              sx={{ 
                                bgcolor: 'rgba(0, 0, 0, 0.5)',
                                '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' }
                              }}
                            >
                              <PhotoCameraIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                        
                        <Tooltip title={cameraActive ? "Stop camera" : "Start camera"}>
                          <IconButton
                            color={cameraActive ? "error" : "primary"}
                            onClick={toggleCamera}
                            sx={{ 
                              bgcolor: 'rgba(0, 0, 0, 0.5)',
                              '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' }
                            }}
                          >
                            {cameraActive ? <VideocamOffIcon /> : <VideocamIcon />}
                          </IconButton>
                        </Tooltip>
                        
                        {/* Add a button to toggle between direct camera and relay */}
                        {!isLocalhost && (
                          <Tooltip title={useCameraRelay ? "Use direct camera access" : "Use camera relay"}>
                            <IconButton
                              color={useCameraRelay ? "primary" : "default"}
                              onClick={() => {
                                // Stop the camera before switching modes
                                if (cameraActive) {
                                  toggleCamera();
                                  setTimeout(() => {
                                    setUseCameraRelay(!useCameraRelay);
                                    toggleCamera();
                                  }, 500);
                                } else {
                                  setUseCameraRelay(!useCameraRelay);
                                }
                              }}
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
                            Camera is off
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
                
                <Stack 
                  direction="row" 
                  spacing={2} 
                  sx={{ mt: 2 }}
                  justifyContent="center"
                >
                  <Button
                    variant="contained"
                    color={cameraActive ? "error" : "primary"}
                    onClick={cameraActive ? stopCamera : startCamera}
                    startIcon={<VideocamIcon />}
                    disabled={isModelLoading}
                  >
                    {cameraActive ? "Stop Camera" : "Start Camera"}
                  </Button>
                  
                  {error && error.includes('camera') && (
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={useMockCamera}
                      startIcon={<VideoLibraryIcon />}
                      disabled={isModelLoading || cameraActive}
                    >
                      Use Mock Camera
                    </Button>
                  )}
                  
                  <Button
                    variant="contained"
                    color={isDetecting ? "error" : "secondary"}
                    onClick={toggleDetection}
                    startIcon={<SmartToyIcon />}
                    disabled={isModelLoading || !cameraActive}
                  >
                    {isDetecting ? "Stop Detection" : "Start Detection"}
                  </Button>
                </Stack>
              </Grid>
              
              <Grid item xs={12} md={4}>
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
                        {detections.filter(detection => detection.class === 'person').length > 0 && (
                          <Chip
                            label={`People detected: ${detections.filter(detection => detection.class === 'person').length}`}
                            color="primary"
                            sx={{ justifyContent: 'flex-start', fontWeight: 'bold' }}
                          />
                        )}
                        {detections.map((detection, index) => (
                          detection.class !== 'person' && (
                            <Chip
                              key={index}
                              label={`${detection.class}`}
                              color="primary"
                              variant="outlined"
                              sx={{ justifyContent: 'flex-start' }}
                            />
                          )
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
                          : "Start camera and detection to see objects"}
                      </Typography>
                    </Box>
                  )}
                </Paper>
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
          Person Detected!
        </MuiAlert>
      </Snackbar>
      
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

export default CameraView;
