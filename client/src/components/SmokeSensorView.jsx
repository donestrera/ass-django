import React, { useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  useTheme,
  Container,
  Fade,
  useMediaQuery,
} from '@mui/material';
import SmokingRoomsIcon from '@mui/icons-material/SmokingRooms';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import { useSensor } from '../context/SensorContext';

const SensorStatusCard = ({ isSmoke }) => {
  const theme = useTheme();
  
  return (
    <Fade in timeout={500}>
      <Paper
        elevation={3}
        sx={{
          p: { xs: 2, sm: 3, md: 4 },
          borderRadius: { xs: 2, sm: 3 },
          bgcolor: 'background.paper',
          height: '100%',
          minHeight: { xs: 180, sm: 200, md: 220 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: { xs: 1, sm: 1.5, md: 2 },
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: theme.shadows[8],
          },
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: { xs: 3, sm: 4 },
            bgcolor: isSmoke ? theme.palette.error.main : theme.palette.success.main,
          }}
        />
        <Box
          sx={{
            width: { xs: 60, sm: 70, md: 80 },
            height: { xs: 60, sm: 70, md: 80 },
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: isSmoke ? `${theme.palette.error.main}15` : `${theme.palette.success.main}15`,
            mb: { xs: 0.5, sm: 1 },
          }}
        >
          <SmokingRoomsIcon 
            sx={{ 
              fontSize: { xs: 30, sm: 35, md: 40 },
              color: isSmoke ? theme.palette.error.main : theme.palette.success.main,
            }}
          />
        </Box>
        <Typography 
          variant="h6" 
          component="div" 
          textAlign="center"
          sx={{ 
            fontWeight: 500,
            color: theme.palette.text.secondary,
            fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' },
          }}
        >
          Smoke Status
        </Typography>
        <Typography 
          variant="h4" 
          sx={{ 
            mt: 'auto',
            fontWeight: 600,
            color: isSmoke ? theme.palette.error.main : theme.palette.success.main,
            textAlign: 'center',
            fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
          }}
        >
          {isSmoke ? 'Smoke Detected!' : 'No Smoke Detected'}
        </Typography>
      </Paper>
    </Fade>
  );
};

const SensorInfoCard = ({ sensorData }) => {
  const theme = useTheme();
  
  return (
    <Fade in timeout={500}>
      <Paper
        elevation={3}
        sx={{
          p: { xs: 2, sm: 3, md: 4 },
          borderRadius: { xs: 2, sm: 3 },
          bgcolor: 'background.paper',
          height: '100%',
          minHeight: { xs: 180, sm: 200, md: 220 },
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 2, sm: 3 },
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: theme.shadows[8],
          },
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: { xs: 3, sm: 4 },
            bgcolor: theme.palette.primary.main,
          }}
        />
        
        <Typography 
          variant="h6" 
          component="div"
          sx={{ 
            fontWeight: 500,
            color: theme.palette.text.secondary,
            fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' },
          }}
        >
          Sensor Information
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Typography 
              variant="subtitle2" 
              color="text.secondary"
              sx={{ mb: 0.5, fontSize: { xs: '0.8rem', sm: '0.9rem' } }}
            >
              Status
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                fontSize: { xs: '0.9rem', sm: '1rem', md: '1.1rem' },
                fontWeight: 500,
              }}
            >
              {sensorData?.connected ? 'Connected' : 'Disconnected'}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Typography 
              variant="subtitle2" 
              color="text.secondary"
              sx={{ mb: 0.5, fontSize: { xs: '0.8rem', sm: '0.9rem' } }}
            >
              Sensor Type
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                fontSize: { xs: '0.9rem', sm: '1rem', md: '1.1rem' },
                fontWeight: 500,
              }}
            >
              MQ-2 Gas Sensor
            </Typography>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Typography 
              variant="subtitle2" 
              color="text.secondary"
              sx={{ mb: 0.5, fontSize: { xs: '0.8rem', sm: '0.9rem' } }}
            >
              Detection Range
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                fontSize: { xs: '0.9rem', sm: '1rem', md: '1.1rem' },
                fontWeight: 500,
              }}
            >
              300-10000 ppm
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Fade>
  );
};

const SmokeSensorView = () => {
  const theme = useTheme();
  const { sensorData } = useSensor();
  const isSmoke = Boolean(sensorData?.smokeDetected);

  // Debug logging
  useEffect(() => {
    console.log('Smoke sensor data updated:', {
      smokeDetected: sensorData?.smokeDetected,
      connected: sensorData?.connected,
      lastUpdate: sensorData?.lastUpdate
    });
  }, [sensorData]);

  return (
    <Container 
      maxWidth="lg" 
      sx={{ 
        mt: { xs: 2, sm: 3, md: 4 },
        mb: { xs: 2, sm: 3, md: 4 },
        px: { xs: 2, sm: 3 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: 'calc(100vh - 70px)',
      }}
    >
      <Typography 
        variant="h4" 
        gutterBottom
        sx={{ 
          fontWeight: 600,
          mb: { xs: 2, sm: 3, md: 4 },
          color: theme.palette.text.primary,
          textAlign: 'center',
          fontSize: { xs: '1.5rem', sm: '2rem', md: '2.25rem' },
        }}
      >
        Smoke Detection Panel
      </Typography>

      <Grid 
        container 
        spacing={{ xs: 2, sm: 3 }}
        sx={{ 
          maxWidth: { xs: '100%', sm: '90%', md: '80%', lg: '70%' },
          width: '100%',
        }}
      >
        <Grid item xs={12} sm={6}>
          <SensorStatusCard isSmoke={isSmoke} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <SensorInfoCard sensorData={sensorData} />
        </Grid>
      </Grid>
    </Container>
  );
};

export default SmokeSensorView; 