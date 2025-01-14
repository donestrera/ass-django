import React from 'react';
import {
  Box,
  Typography,
  Paper,
  useTheme,
  Alert,
  AlertTitle,
  Grid,
  CircularProgress,
} from '@mui/material';
import SmokingRoomsIcon from '@mui/icons-material/SmokingRooms';
import { useSensor } from '../context/SensorContext';
import { alpha } from '@mui/material/styles';

const SmokeStatusIndicator = ({ detected, error }) => {
  const theme = useTheme();

  if (error) {
    return (
      <Alert severity="error" sx={{ width: '100%' }}>
        <AlertTitle>Sensor Error</AlertTitle>
        Unable to read smoke sensor data. Please check the sensor connection.
      </Alert>
    );
  }

  return (
    <Box
      sx={{
        p: 4,
        borderRadius: 2,
        bgcolor: 'background.paper',
        boxShadow: theme.shadows[2],
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: detected ? alpha(theme.palette.error.main, 0.1) : 'transparent',
          transition: 'background-color 0.3s ease',
        }}
      />
      <Box
        sx={{
          width: 150,
          height: 150,
          borderRadius: '50%',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: detected ? theme.palette.error.light : theme.palette.success.light,
          transition: 'all 0.3s ease',
          position: 'relative',
        }}
      >
        <SmokingRoomsIcon
          sx={{
            fontSize: 80,
            color: detected ? theme.palette.error.dark : theme.palette.success.dark,
            animation: detected ? 'pulse 2s infinite' : 'none',
          }}
        />
      </Box>

      <Typography variant="h5" sx={{ mt: 3, mb: 1 }}>
        Smoke Detection Status
      </Typography>

      <Alert
        severity={detected ? 'error' : 'success'}
        variant="filled"
        sx={{
          mt: 2,
          animation: detected ? 'fadeInOut 2s infinite' : 'none',
        }}
      >
        {detected ? 'Smoke Detected!' : 'No Smoke Detected'}
      </Alert>

      <Box sx={{ mt: 3 }}>
        <Typography variant="body1" color="text.secondary">
          Last Updated: {new Date().toLocaleTimeString()}
        </Typography>
      </Box>
    </Box>
  );
};

const SmokeSensorView = () => {
  const theme = useTheme();
  const { sensorData, loading, error } = useSensor();

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
        Smoke Detection Panel
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8} lg={6}>
          <SmokeStatusIndicator
            detected={sensorData?.smokeDetected}
            error={!sensorData?.connected}
          />
        </Grid>

        <Grid item xs={12} md={4} lg={6}>
          <Paper
            sx={{
              p: 3,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <Typography variant="h6">Sensor Information</Typography>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Status
              </Typography>
              <Typography variant="body1">
                {sensorData?.connected ? 'Connected' : 'Disconnected'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Sensor Type
              </Typography>
              <Typography variant="body1">MQ-2 Gas Sensor</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Detection Range
              </Typography>
              <Typography variant="body1">300-10000 ppm</Typography>
            </Box>
            {sensorData?.smokeDetected && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <AlertTitle>Safety Warning</AlertTitle>
                Smoke has been detected. Please check the area and ensure proper ventilation.
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SmokeSensorView; 