import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  useTheme,
  Container,
  Grid,
  Fade,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tabs,
  Tab,
  Card,
  CardMedia,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  IconButton,
  CircularProgress,
  Pagination,
  Badge,
  Tooltip,
  Divider,
  Checkbox,
  Button,
  DialogActions,
  DialogTitle,
  Snackbar,
  Alert
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import CloseIcon from '@mui/icons-material/Close';
import SpeedIcon from '@mui/icons-material/Speed';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { useSensor } from '../context/SensorContext';
import { formatDistanceToNow } from 'date-fns';

// Tab panel component - remove this as we no longer need tabs
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`camera-tabpanel-${index}`}
      aria-labelledby={`camera-tab-${index}`}
      {...other}
      style={{ width: '100%' }}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const CameraLogView = () => {
  const theme = useTheme();
  const { motionHistory } = useSensor();
  
  // Remove all state variables and functions related to tabs and images
  // const [tabValue, setTabValue] = useState(0); - REMOVE THIS
  // const [capturedImages, setCapturedImages] = useState([]); - REMOVE THIS
  // const [loading, setLoading] = useState(true); - REMOVE THIS
  // const [selectedImage, setSelectedImage] = useState(null); - REMOVE THIS
  // const [page, setPage] = useState(1); - REMOVE THIS
  
  // Remove all the fetchImages code and useEffect for images

  // Filter history by detection type
  const yoloDetections = motionHistory.filter(event => event.detection_type === 'yolo');
  const pirDetections = motionHistory.filter(event => event.detection_type === 'pir');

  // Remove all the tab handling, image handling, dialog handling, pagination etc
  
  // Keep only these helper functions for detection display
  const getDetectionTypeLabel = (type) => {
    switch (type) {
      case 'yolo': return 'Person Detected';
      case 'pir': return 'Motion Sensor';
      default: return 'Unknown';
    }
  };
  
  const getDetectionTypeColor = (type) => {
    switch (type) {
      case 'yolo': return 'error';
      case 'pir': return 'warning';
      default: return 'default';
    }
  };
  
  const getDetectionTypeIcon = (type) => {
    switch (type) {
      case 'yolo': return <PersonIcon />;
      case 'pir': return <DirectionsRunIcon />;
      default: return null;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h4" gutterBottom>
        Camera Detection Log
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        View history of person and motion detection events
      </Typography>

      <Divider sx={{ mb: 4 }} />
      
      {/* Keep only the Motion Detection History section */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">
            Motion Detection History
            </Typography>
          <Box>
                        <Chip 
              icon={<PersonIcon />} 
              label={`Person Detections: ${yoloDetections.length}`} 
              color="error" 
                        variant="outlined"
                        sx={{ mr: 1 }}
            />
                            <Chip 
              icon={<DirectionsRunIcon />} 
              label={`Motion Events: ${pirDetections.length}`} 
              color="warning" 
              variant="outlined" 
            />
                          </Box>
                        </Box>
        
        {/* Rest of the motion history list display */}
        {/* ... Keep the existing motion history list ... */}
      </Paper>

      {/* Remove all code related to images, image dialog, etc. */}
    </Container>
  );
};

export default CameraLogView; 