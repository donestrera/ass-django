import React, { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import PropTypes from 'prop-types';

/**
 * CameraRelay component provides an alternative way to access the camera
 * when direct access might be restricted (e.g., in non-secure contexts or certain browsers)
 */
const CameraRelay = ({ active, width, height, cameraId, onFrame, onError }) => {
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!active) {
      setIsLoading(false);
      return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    
    // Simulate camera feed for demonstration
    // In a real implementation, this would use a secure method to relay camera data
    const drawFrame = () => {
      try {
        // Clear canvas
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw timestamp to show it's working
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.fillText(`Relay active: ${new Date().toLocaleTimeString()}`, 10, 30);
        ctx.fillText(`Camera ID: ${cameraId || 'default'}`, 10, 60);
        
        // Pass the canvas to parent component for processing
        if (onFrame) {
          onFrame(canvas);
        }
        
        setIsLoading(false);
        
        // Continue animation loop if still active
        if (active) {
          animationFrameId = requestAnimationFrame(drawFrame);
        }
      } catch (err) {
        setError(err.message);
        if (onError) {
          onError(err.message);
        }
      }
    };
    
    // Start animation loop
    animationFrameId = requestAnimationFrame(drawFrame);
    
    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [active, cameraId, onFrame, onError]);
  
  if (error) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        height: '100%',
        p: 2
      }}>
        <Typography color="error" variant="body1">
          Camera relay error: {error}
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas 
        ref={canvasRef}
        width={width || 640}
        height={height || 480}
        style={{ 
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
      />
      
      {isLoading && active && (
        <Box sx={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)'
        }}>
          <CircularProgress color="primary" />
          <Typography variant="body1" color="white" sx={{ ml: 2 }}>
            Initializing camera relay...
          </Typography>
        </Box>
      )}
    </Box>
  );
};

CameraRelay.propTypes = {
  active: PropTypes.bool,
  width: PropTypes.number,
  height: PropTypes.number,
  cameraId: PropTypes.string,
  onFrame: PropTypes.func,
  onError: PropTypes.func
};

CameraRelay.defaultProps = {
  active: false,
  width: 640,
  height: 480
};

export default CameraRelay; 