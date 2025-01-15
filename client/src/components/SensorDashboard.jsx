import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Grid,
  Container,
  CircularProgress,
  Alert,
  IconButton,
  useTheme,
  alpha,
  Fade,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  FormControlLabel,
  AppBar,
  Toolbar,
  Button,
  useMediaQuery,
  Collapse,
  Divider,
} from '@mui/material';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import SmokingRoomsIcon from '@mui/icons-material/SmokingRooms';
import RefreshIcon from '@mui/icons-material/Refresh';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DeleteIcon from '@mui/icons-material/Delete';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';

// Use environment variable for API URL with proper formatting
const API_URL = `${import.meta.env.VITE_API_URL}/api`;

// Add data formatting helpers
const formatTemperature = (value) => value !== null ? value.toFixed(1) : 'N/A';
const formatHumidity = (value) => value !== null ? value.toFixed(1) : 'N/A';

const SensorCard = ({ title, value, isAlert, unit, icon, error, secondaryText, control }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  return (
    <Card 
      sx={{ 
        height: '100%',
        minHeight: { xs: 100, sm: 140, md: 160 },
        position: 'relative',
        p: { xs: 0.5, sm: 1.5, md: 2 },
        ...(isAlert && {
          backgroundColor: alpha(theme.palette.error.main, 0.1),
          borderColor: theme.palette.error.main,
          borderWidth: 1,
          borderStyle: 'solid'
        })
      }}
    >
      <CardContent sx={{ p: { xs: 0.5, sm: 1.5, md: 2 } }}>
        <Grid container spacing={1} alignItems="center">
          <Grid item>
            {React.cloneElement(icon, { 
              sx: { 
                fontSize: { xs: '1.2rem', sm: '1.8rem', md: '2.2rem' },
                color: isAlert ? theme.palette.error.main : theme.palette.primary.main 
              } 
            })}
          </Grid>
          <Grid item>
            <Typography 
              variant={isMobile ? "body1" : "h6"} 
              component="div"
              sx={{ fontSize: { xs: '0.9rem', sm: '1.1rem', md: '1.3rem' } }}
            >
              {title}
            </Typography>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: { xs: 0.5, sm: 2, md: 3 } }}>
          <Typography 
            variant={isMobile ? "subtitle1" : "h5"} 
            component="div"
            sx={{ 
              fontSize: { xs: '1.1rem', sm: '1.5rem', md: '1.8rem' },
              fontWeight: 'bold'
            }}
          >
            {value} {unit}
          </Typography>
          {secondaryText && (
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ fontSize: { xs: '0.75rem', sm: '0.9rem', md: '1rem' } }}
            >
              {secondaryText}
            </Typography>
          )}
          {error && (
            <Typography 
              variant="caption" 
              color="error"
              sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.9rem' } }}
            >
              {error}
            </Typography>
          )}
        </Box>
        {control && (
          <Box sx={{ mt: { xs: 0.5, sm: 2 } }}>
            {control}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const SensorDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [menuOpen, setMenuOpen] = useState(false);
  const [sensorData, setSensorData] = useState({
    temperature: null,
    humidity: null,
    motionDetected: false,
    smokeDetected: false,
    lastUpdate: null,
    connected: false,
    pirEnabled: true
  });
  const [motionHistory, setMotionHistory] = useState([]);
  const [lastMotionState, setLastMotionState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const fetchData = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_URL}/sensor-data/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed');
        }
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Sensor data received:', data);

      // Validate and transform the data
      const transformedData = {
        temperature: typeof data.temperature === 'number' ? data.temperature : null,
        humidity: typeof data.humidity === 'number' ? data.humidity : null,
        motionDetected: Boolean(data.motionDetected),
        smokeDetected: Boolean(data.smokeDetected),
        lastUpdate: new Date().toISOString(),
        connected: true,
        pirEnabled: Boolean(data.pirEnabled)
      };
      
      // Only add to history when motion is first detected
      if (transformedData.motionDetected && !lastMotionState) {
        const timestamp = new Date().toLocaleString();
        setMotionHistory(prev => [{
          timestamp,
          temperature: formatTemperature(transformedData.temperature),
          humidity: formatHumidity(transformedData.humidity)
        }, ...prev].slice(0, 50));
      }
      
      setSensorData(transformedData);
      setLastMotionState(transformedData.motionDetected);
      setLoading(false);
      setRetryCount(0); // Reset retry count on successful fetch
    } catch (error) {
      console.error('Error fetching sensor data:', error);
      setError(error.message);
      setLoading(false);
      
      if (error.message.includes('Authentication failed')) {
        logout();
        navigate('/login');
        return;
      }

      // Implement exponential backoff for retries
      if (retryCount < 3) {
        const backoffTime = Math.pow(2, retryCount) * 1000;
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchData();
        }, backoffTime);
      }
    }
  };

  const togglePirSensor = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/control-pir/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: !sensorData.pirEnabled }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle PIR sensor');
      }

      setSensorData(prev => ({
        ...prev,
        pirEnabled: !prev.pirEnabled
      }));
    } catch (error) {
      console.error('Error toggling PIR sensor:', error);
      setError('Failed to toggle motion sensor');
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000); // Increased interval to 2 seconds
    return () => clearInterval(interval);
  }, []);

  const clearMotionHistory = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/clear-motion-history/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear motion history');
      }

      setMotionHistory([]);
    } catch (error) {
      console.error('Error clearing motion history:', error);
      setError('Failed to clear motion history');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  const historyContent = (
    <Card sx={{ 
      mt: { xs: 1, sm: 3, md: 4 },
      minHeight: { sm: '400px', md: '500px' }
    }}>
      <CardContent sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={{ xs: 1, sm: 2, md: 3 }}>
          <Typography 
            variant="h5" 
            component="div"
            sx={{ fontSize: { xs: '1.1rem', sm: '1.4rem', md: '1.8rem' } }}
          >
            Motion Detection History
          </Typography>
          <Box>
            <IconButton onClick={fetchData} size={isMobile ? "small" : "medium"} sx={{ mr: 1 }}>
              <RefreshIcon fontSize={isMobile ? "small" : "medium"} />
            </IconButton>
            <IconButton onClick={clearMotionHistory} size={isMobile ? "small" : "medium"} color="error">
              <DeleteIcon fontSize={isMobile ? "small" : "medium"} />
            </IconButton>
          </Box>
        </Box>
        {motionHistory.length === 0 ? (
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
            {motionHistory.map((event, index) => (
              <ListItem 
                key={index} 
                divider={index !== motionHistory.length - 1}
                sx={{ 
                  py: { xs: 1, sm: 2 },
                  px: { xs: 1, sm: 2 }
                }}
              >
                <ListItemIcon>
                  <AccessTimeIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={event.timestamp}
                  secondary={`Temperature: ${event.temperature}°C, Humidity: ${event.humidity}%`}
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
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ 
      flexGrow: 1, 
      minHeight: '100vh',
      bgcolor: 'background.default',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <AppBar position="static" color="transparent" elevation={1}>
        <Toolbar sx={{ 
          flexDirection: { xs: 'column', sm: 'row' }, 
          alignItems: { xs: 'stretch', sm: 'center' }, 
          py: { xs: 0.5, sm: 1 }
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            width: '100%', 
            mb: isMobile && menuOpen ? 1 : 0 
          }}>
            <Typography 
              variant="h5" 
              component="div" 
              sx={{ 
                flexGrow: 1, 
                color: 'primary.main', 
                fontWeight: 600,
                fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem' }
              }}
            >
              Sensor Dashboard
            </Typography>
            {!isMobile && (
              <Button
                color="primary"
                onClick={handleLogout}
                startIcon={<LogoutIcon />}
                size={isMobile ? "small" : "medium"}
              >
                Logout
              </Button>
            )}
          </Box>
          
          {isMobile && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%', mb: 0.5 }}>
                <IconButton
                  color="inherit"
                  onClick={() => setMenuOpen(!menuOpen)}
                  size="small"
                >
                  <MenuIcon />
                </IconButton>
              </Box>
              <Collapse in={menuOpen} sx={{ width: '100%' }}>
                <List sx={{ 
                  bgcolor: alpha(theme.palette.background.paper, 0.98),
                  borderRadius: 1,
                  border: `1px solid ${theme.palette.divider}`,
                  py: 0
                }}>
                  <ListItem button onClick={handleLogout} dense>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <LogoutIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Logout"
                      primaryTypographyProps={{
                        sx: { fontSize: '0.875rem' }
                      }}
                    />
                  </ListItem>
                </List>
              </Collapse>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Container 
        maxWidth="xl"
        sx={{ 
          flexGrow: 1,
          mt: { xs: 1, sm: 3, md: 4 }, 
          mb: { xs: 1, sm: 3, md: 4 },
          px: { xs: 1, sm: 3, md: 4 }
        }}
      >
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: { xs: 1, sm: 3, md: 4 },
              borderRadius: 1,
              fontSize: { xs: '0.8rem', sm: '0.875rem', md: '1rem' }
            }}
          >
            {error}
          </Alert>
        )}

        <Grid container spacing={{ xs: 1, sm: 3, md: 4 }}>
          <Grid item xs={12} sm={6} lg={3}>
            <SensorCard
              title="Temperature"
              value={sensorData.temperature?.toFixed(1) || 'N/A'}
              unit="°C"
              icon={<ThermostatIcon />}
              error={!sensorData.connected}
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <SensorCard
              title="Humidity"
              value={sensorData.humidity?.toFixed(1) || 'N/A'}
              unit="%"
              icon={<WaterDropIcon />}
              error={!sensorData.connected}
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <SensorCard
              title="Motion Status"
              value={sensorData.motionDetected ? 'Motion Detected' : 'No Motion'}
              isAlert={sensorData.motionDetected}
              icon={<DirectionsRunIcon />}
              error={!sensorData.connected}
              control={
                <FormControlLabel
                  control={
                    <Switch
                      checked={sensorData.pirEnabled}
                      onChange={togglePirSensor}
                      color="primary"
                      size={isMobile ? "small" : "medium"}
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '1.1rem' } }}>
                      Enable Sensor
                    </Typography>
                  }
                />
              }
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <SensorCard
              title="Smoke Status"
              value={sensorData.smokeDetected ? 'Smoke Detected' : 'No Smoke'}
              isAlert={sensorData.smokeDetected}
              icon={<SmokingRoomsIcon />}
              error={!sensorData.connected}
            />
          </Grid>
        </Grid>

        {historyContent}
      </Container>
    </Box>
  );
};

export default SensorDashboard;
