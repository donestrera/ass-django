import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  useTheme,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Button,
  Switch,
  FormControlLabel,
} from '@mui/material';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSensor } from '../context/SensorContext';

const StatusIndicator = ({ active }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        p: 4,
        borderRadius: 2,
        bgcolor: 'background.paper',
        boxShadow: theme.shadows[2],
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: active ? theme.palette.success.light : theme.palette.grey[300],
          transition: 'background-color 0.3s ease',
        }}
      >
        <DirectionsRunIcon
          sx={{
            fontSize: 60,
            color: active ? theme.palette.success.dark : theme.palette.grey[500],
          }}
        />
      </Box>
      <Typography variant="h6" sx={{ mt: 2 }}>
        Motion Sensor Status
      </Typography>
      <Chip
        label={active ? 'Motion Detected' : 'No Motion'}
        color={active ? 'success' : 'default'}
        sx={{ mt: 1 }}
      />
    </Box>
  );
};

const MotionHistoryItem = ({ timestamp, temperature, humidity }) => {
  const theme = useTheme();
  
  return (
    <>
      <ListItem>
        <ListItemIcon>
          <DirectionsRunIcon color="primary" />
        </ListItemIcon>
        <ListItemText
          primary="Motion Detected"
          secondary={
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccessTimeIcon sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
                <Typography variant="body2" color="text.secondary">
                  {timestamp}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ThermostatIcon sx={{ fontSize: 16, color: theme.palette.error.main }} />
                  <Typography variant="body2" color="text.secondary">
                    {temperature}°C
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <WaterDropIcon sx={{ fontSize: 16, color: theme.palette.primary.main }} />
                  <Typography variant="body2" color="text.secondary">
                    {humidity}%
                  </Typography>
                </Box>
              </Box>
            </Box>
          }
        />
      </ListItem>
      <Divider component="li" />
    </>
  );
};

const MotionSensorView = () => {
  const {
    sensorData,
    motionHistory,
    loading,
    error,
    togglePirSensor,
    clearMotionHistory
  } = useSensor();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Error loading sensor data: {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Motion Detection Panel
      </Typography>

      <Box sx={{ mb: 4 }}>
        <StatusIndicator active={sensorData?.motionDetected} />
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={sensorData?.pirEnabled}
                onChange={togglePirSensor}
                color="primary"
              />
            }
            label="Enable Motion Detection"
          />
        </Box>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Motion Detection History
          </Typography>
          <Button
            startIcon={<DeleteIcon />}
            onClick={clearMotionHistory}
            disabled={motionHistory.length === 0}
          >
            Clear History
          </Button>
        </Box>
        {motionHistory.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No motion events recorded
          </Typography>
        ) : (
          <List>
            {motionHistory.map((event, index) => (
              <MotionHistoryItem
                key={index}
                timestamp={event.timestamp}
                temperature={event.temperature}
                humidity={event.humidity}
              />
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default MotionSensorView; 