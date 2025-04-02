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
  Divider,
  Chip,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  Tooltip,
  IconButton,
  Button
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import SensorIcon from '@mui/icons-material/Sensors';
import SmokingRoomsIcon from '@mui/icons-material/SmokingRooms';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import SpeedIcon from '@mui/icons-material/Speed';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { useSensor } from '../context/SensorContext';
import { formatDistanceToNow } from 'date-fns';

const CameraLogView = () => {
  const theme = useTheme();
  const { motionHistory, sensorData, clearMotionHistory, refreshMotionHistory, loading } = useSensor();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Filter history by detection type
  const yoloDetections = motionHistory.filter(event => event.detection_type === 'yolo');
  const pirDetections = motionHistory.filter(event => event.detection_type === 'pir');

  // Helper functions for detection display
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
      default: return <SensorIcon />;
    }
  };

  // Table pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle refresh button click
  const handleRefresh = () => {
    refreshMotionHistory();
  };

  // Handle clear history button click
  const handleClearHistory = () => {
    clearMotionHistory();
  };

  // Get rows for the current page
  const currentPageRows = motionHistory
    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h4" gutterBottom>
        Camera Detection Log
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        View history of person and motion detection events
      </Typography>

      <Divider sx={{ mb: 4 }} />
      
      {/* Current Sensor Status Card */}
      <Paper elevation={2} sx={{ p: 3, mb: 4, backgroundColor: theme.palette.background.paper }}>
        <Typography variant="h5" gutterBottom>
          Current Sensor Status
        </Typography>

        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* Temperature & Humidity */}
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={1} sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ThermostatIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Temperature</Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                  {sensorData.temperature !== null ? `${sensorData.temperature}°C` : 'N/A'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={1} sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <WaterDropIcon color="info" sx={{ mr: 1 }} />
                  <Typography variant="h6">Humidity</Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                  {sensorData.humidity !== null ? `${sensorData.humidity}%` : 'N/A'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Motion Status */}
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={1} sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <DirectionsRunIcon color="warning" sx={{ mr: 1 }} />
                  <Typography variant="h6">Motion</Typography>
                </Box>
                <Chip 
                  label={sensorData.motionDetected ? "DETECTED" : "Not Detected"}
                  color={sensorData.motionDetected ? "warning" : "default"}
                  variant={sensorData.motionDetected ? "filled" : "outlined"}
                  icon={<DirectionsRunIcon />}
                  sx={{ 
                    fontSize: '1rem', 
                    padding: 1,
                    '& .MuiChip-label': { fontWeight: 'bold' }
                  }}
                />
                <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                  PIR Sensor: {sensorData.pirEnabled ? "Enabled" : "Disabled"}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Smoke Status */}
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={1} sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <SmokingRoomsIcon color="error" sx={{ mr: 1 }} />
                  <Typography variant="h6">Smoke</Typography>
                </Box>
                <Chip 
                  label={sensorData.smokeDetected ? "DETECTED" : "Not Detected"}
                  color={sensorData.smokeDetected ? "error" : "default"}
                  variant={sensorData.smokeDetected ? "filled" : "outlined"}
                  icon={sensorData.smokeDetected ? <LocalFireDepartmentIcon /> : <SmokingRoomsIcon />}
                  sx={{ 
                    fontSize: '1rem', 
                    padding: 1,
                    '& .MuiChip-label': { fontWeight: 'bold' }
                  }}
                />
                <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                  Last update: {sensorData.lastUpdate ? new Date(sensorData.lastUpdate).toLocaleTimeString() : 'N/A'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Detection Statistics Summary */}
      <Paper elevation={2} sx={{ p: 3, mb: 4, backgroundColor: theme.palette.background.paper }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">
            Detection Statistics
          </Typography>
          <Box>
            <Tooltip title="Refresh data">
              <IconButton onClick={handleRefresh} color="primary" sx={{ mr: 1 }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Clear history">
              <IconButton onClick={handleClearHistory} color="error">
                <DeleteSweepIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <Box 
              sx={{ 
                p: 2, 
                backgroundColor: theme.palette.error.light,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap'
              }}
            >
              <PersonIcon sx={{ color: theme.palette.error.dark, fontSize: 32, mr: 2 }} />
              <Box>
                <Typography variant="body2" color="error.dark">
                  Person Detections (YOLO)
                </Typography>
                <Typography variant="h4" color="error.dark" sx={{ fontWeight: 'bold' }}>
                  {yoloDetections.length}
                </Typography>
              </Box>
              
              {yoloDetections.length > 0 && (
                <Box sx={{ ml: 'auto', textAlign: 'right' }}>
                  <Typography variant="body2" color="error.dark">
                    Last detected:
                  </Typography>
                  <Typography variant="body1" color="error.dark" sx={{ fontWeight: 'bold' }}>
                    {yoloDetections[0] ? formatDistanceToNow(new Date(yoloDetections[0].timestamp), { addSuffix: true }) : 'N/A'}
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Box 
              sx={{ 
                p: 2, 
                backgroundColor: theme.palette.warning.light,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap'
              }}
            >
              <DirectionsRunIcon sx={{ color: theme.palette.warning.dark, fontSize: 32, mr: 2 }} />
              <Box>
                <Typography variant="body2" color="warning.dark">
                  Motion Events (PIR)
                </Typography>
                <Typography variant="h4" color="warning.dark" sx={{ fontWeight: 'bold' }}>
                  {pirDetections.length}
                </Typography>
              </Box>
              
              {pirDetections.length > 0 && (
                <Box sx={{ ml: 'auto', textAlign: 'right' }}>
                  <Typography variant="body2" color="warning.dark">
                    Last detected:
                  </Typography>
                  <Typography variant="body1" color="warning.dark" sx={{ fontWeight: 'bold' }}>
                    {pirDetections[0] ? formatDistanceToNow(new Date(pirDetections[0].timestamp), { addSuffix: true }) : 'N/A'}
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Detection History Table */}
      <Paper elevation={2} sx={{ p: 3, mb: 4, backgroundColor: theme.palette.background.paper }}>
        <Typography variant="h5" gutterBottom>
          Motion Detection History
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : motionHistory.length > 0 ? (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Temperature</TableCell>
                    <TableCell>Humidity</TableCell>
                    <TableCell>Confidence</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentPageRows.map((event, index) => (
                    <TableRow 
                      key={event.id || index}
                      sx={{ 
                        backgroundColor: event.is_active 
                          ? `${getDetectionTypeColor(event.detection_type)}.50` 
                          : 'transparent',
                        transition: 'background-color 0.3s'
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Chip
                            icon={getDetectionTypeIcon(event.detection_type)}
                            label={getDetectionTypeLabel(event.detection_type)}
                            color={getDetectionTypeColor(event.detection_type)}
                            size="small"
                            variant={event.is_active ? "filled" : "outlined"}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={new Date(event.timestamp).toLocaleString()}>
                          <Box>
                            <Typography variant="body2">{formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(event.timestamp).toLocaleTimeString()}
                            </Typography>
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        {event.temperature ? (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <ThermostatIcon fontSize="small" sx={{ mr: 0.5, color: 'primary.main' }}/>
                            <Typography>{event.temperature}°C</Typography>
                          </Box>
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {event.humidity ? (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <WaterDropIcon fontSize="small" sx={{ mr: 0.5, color: 'info.main' }}/>
                            <Typography>{event.humidity}%</Typography>
                          </Box>
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {event.detection_type === 'yolo' && event.confidence ? (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <SpeedIcon fontSize="small" sx={{ mr: 0.5, color: 'success.main' }}/>
                            <Typography>{(event.confidence * 100).toFixed(1)}%</Typography>
                          </Box>
                        ) : event.detection_type === 'pir' ? (
                          <Typography variant="body2" color="text.secondary">N/A</Typography>
                        ) : 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={event.is_active ? "ACTIVE" : "Ended"}
                          color={event.is_active ? "success" : "default"}
                          size="small"
                          variant={event.is_active ? "filled" : "outlined"}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={motionHistory.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        ) : (
          <Alert severity="info" sx={{ mt: 2 }}>
            No motion detection history available. Detection events will appear here when motion is detected.
          </Alert>
        )}
      </Paper>
    </Container>
  );
};

export default CameraLogView;