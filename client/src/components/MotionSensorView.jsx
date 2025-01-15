import React from 'react';
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
  Switch,
  FormControlLabel,
  Button,
  IconButton,
} from '@mui/material';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSensor } from '../context/SensorContext';

const MotionStatusCard = ({ isActive, pirEnabled, onToggle }) => {
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
            bgcolor: isActive ? theme.palette.error.main : theme.palette.success.main,
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
            bgcolor: isActive ? `${theme.palette.error.main}15` : `${theme.palette.success.main}15`,
            mb: { xs: 0.5, sm: 1 },
          }}
        >
          <DirectionsRunIcon 
            sx={{ 
              fontSize: { xs: 30, sm: 35, md: 40 },
              color: isActive ? theme.palette.error.main : theme.palette.success.main,
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
          Motion Status
        </Typography>
        <Typography 
          variant="h4" 
          sx={{ 
            mt: 'auto',
            fontWeight: 600,
            color: isActive ? theme.palette.error.main : theme.palette.success.main,
            textAlign: 'center',
            fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
          }}
        >
          {isActive ? 'Motion Detected!' : 'No Motion'}
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={pirEnabled}
              onChange={onToggle}
              color="primary"
              size="small"
            />
          }
          label={
            <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              Enable Sensor
            </Typography>
          }
        />
      </Paper>
    </Fade>
  );
};

const HistoryCard = ({ history, onClear }) => {
  const theme = useTheme();
  
  return (
    <Fade in timeout={500}>
      <Paper
        elevation={3}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: { xs: 2, sm: 3 },
          bgcolor: 'background.paper',
          transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: theme.shadows[8],
          },
          height: '100%',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 500,
              color: theme.palette.text.secondary,
              fontSize: { xs: '1.1rem', sm: '1.25rem' },
            }}
          >
            Motion History
          </Typography>
          <IconButton 
            onClick={onClear} 
            disabled={history.length === 0}
            color="error"
            size="small"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
        
        {history.length === 0 ? (
          <Typography 
            color="text.secondary" 
            align="center" 
            sx={{ 
              py: { xs: 4, sm: 6, md: 8 },
              fontSize: { xs: '0.875rem', sm: '1rem', md: '1.2rem' }
            }}
          >
            No motion events recorded yet
          </Typography>
        ) : (
          <List sx={{ 
            maxHeight: { xs: 300, sm: 400, md: 500 }, 
            overflow: 'auto',
            '& .MuiListItem-root': {
              py: { xs: 1, sm: 1.5, md: 2 },
              px: { xs: 1, sm: 2, md: 3 }
            }
          }}>
            {history.map((event, index) => (
              <ListItem key={index} divider={index !== history.length - 1}>
                <ListItemIcon>
                  <DirectionsRunIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={event.timestamp}
                  secondary={
                    <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ThermostatIcon sx={{ fontSize: 16, color: theme.palette.error.main }} />
                        <Typography variant="body2" color="text.secondary">
                          {event.temperature}°C
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <WaterDropIcon sx={{ fontSize: 16, color: theme.palette.primary.main }} />
                        <Typography variant="body2" color="text.secondary">
                          {event.humidity}%
                        </Typography>
                      </Box>
                    </Box>
                  }
                  primaryTypographyProps={{
                    sx: { fontSize: { xs: '0.875rem', sm: '1rem' } }
                  }}
                  secondaryTypographyProps={{
                    sx: { fontSize: { xs: '0.75rem', sm: '0.875rem' } }
                  }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Fade>
  );
};

const MotionSensorView = () => {
  const theme = useTheme();
  const {
    sensorData,
    motionHistory,
    togglePirSensor,
    clearMotionHistory
  } = useSensor();

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
        Motion Detection Panel
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
          <MotionStatusCard
            isActive={sensorData?.motionDetected}
            pirEnabled={sensorData?.pirEnabled}
            onToggle={togglePirSensor}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <HistoryCard
            history={motionHistory}
            onClear={clearMotionHistory}
          />
        </Grid>
      </Grid>
    </Container>
  );
};

export default MotionSensorView; 