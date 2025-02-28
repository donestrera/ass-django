import React, { useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Container, 
  Paper, 
  Grid, 
  CircularProgress, 
  Alert, 
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
  Tooltip
} from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useCamera } from '../hooks/useCamera';

const CameraView = () => {
  const theme = useTheme();
  const {
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
  } = useCamera();

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
            <Alert 
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
                      window.location.href = `http://localhost:5173${currentPath}`;
                    }}
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
                    <li>Click the "Switch to localhost" button above</li>
                    <li>Access this app via HTTPS</li>
                    <li>Run the app locally on your computer</li>
                    <li>Or use the mock camera option below</li>
                  </ul>
                </Typography>
              )}
            </Alert>
          )}

          {/* Camera Selection */}
          {availableCameras.length > 1 && (
            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel id="camera-select-label">Camera Source</InputLabel>
                <Select
                  labelId="camera-select-label"
                  id="camera-select"
                  value={selectedCameraId || ''}
                  onChange={(e) => selectCamera(e.target.value)}
                  label="Camera Source"
                  disabled={cameraActive}
                >
                  {availableCameras.map((camera, index) => (
                    <MenuItem key={camera.deviceId} value={camera.deviceId}>
                      {camera.label || `Camera ${index + 1}`} 
                      {index === availableCameras.length - 1 ? ' (External Webcam)' : index === 0 ? ' (Built-in Camera)' : ''}
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
                <Box 
                  sx={{ 
                    position: 'relative',
                    width: '100%',
                    height: 0,
                    paddingBottom: '75%', // 4:3 aspect ratio
                    backgroundColor: '#000',
                    borderRadius: 1,
                    overflow: 'hidden'
                  }}
                >
                  <video
                    ref={videoRef}
                    style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: cameraActive ? 'block' : 'none'
                    }}
                    muted
                    playsInline
                  />
                  <canvas
                    ref={canvasRef}
                    style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: cameraActive ? 'block' : 'none'
                    }}
                  />
                  {!cameraActive && (
                    <Box 
                      sx={{ 
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        color: 'white'
                      }}
                    >
                      <VideocamIcon sx={{ fontSize: 60, mb: 2, opacity: 0.7 }} />
                      <Typography variant="h6">
                        Camera is turned off
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
                        Click the Start Camera button to begin
                      </Typography>
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
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SmartToyIcon fontSize="small" color="primary" />
                    Detected Objects
                  </Typography>
                  
                  {detections.length > 0 ? (
                    <Box sx={{ mt: 2, flex: 1, overflowY: 'auto' }}>
                      <Stack spacing={1}>
                        {detections.map((detection, index) => (
                          <Chip
                            key={index}
                            label={`${detection.label}: ${Math.round(detection.confidence * 100)}%`}
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
    </Container>
  );
};

export default CameraView;
