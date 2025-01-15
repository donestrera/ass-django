import React from 'react';
import { Box, Grid, Typography, useTheme, CircularProgress, Alert, Paper, Fade, Container } from '@mui/material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import { useSensor } from '../context/SensorContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

const SensorReadingCard = ({ title, value, icon, unit }) => {
  const theme = useTheme();
  const isValuePresent = value !== null;
  
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
            bgcolor: title === 'Temperature' ? theme.palette.error.main : theme.palette.primary.main,
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
            bgcolor: title === 'Temperature' 
              ? `${theme.palette.error.main}15` 
              : `${theme.palette.primary.main}15`,
            mb: { xs: 0.5, sm: 1 },
          }}
        >
          {React.cloneElement(icon, { 
            sx: { 
              fontSize: { xs: 30, sm: 35, md: 40 },
              color: title === 'Temperature' ? theme.palette.error.main : theme.palette.primary.main,
            }
          })}
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
          {title}
        </Typography>
        <Typography 
          variant="h2" 
          sx={{ 
            mt: 'auto',
            fontWeight: 600,
            color: title === 'Temperature' ? theme.palette.error.main : theme.palette.primary.main,
            transition: 'all 0.3s ease',
            animation: isValuePresent ? 'fadeIn 0.5s ease-out' : 'none',
            fontSize: { xs: '2.5rem', sm: '3rem', md: '3.75rem' },
          }}
        >
          {isValuePresent ? value : '-'}
          <Typography 
            component="span" 
            variant="h4" 
            sx={{ 
              ml: { xs: 0.5, sm: 1 },
              color: theme.palette.text.secondary,
              opacity: 0.8,
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
            }}
          >
            {unit}
          </Typography>
        </Typography>
      </Paper>
    </Fade>
  );
};

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
};

const TemperatureHumidityView = () => {
  const theme = useTheme();
  const { sensorData, historicalData, loading, error } = useSensor();

  const chartData = {
    labels: historicalData.timestamps,
    datasets: [
      {
        label: 'Temperature',
        data: historicalData.temperature,
        borderColor: theme.palette.error.main,
        backgroundColor: theme.palette.error.main + '20',
        yAxisID: 'y',
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5,
        fill: true,
      },
      {
        label: 'Humidity',
        data: historicalData.humidity,
        borderColor: theme.palette.primary.main,
        backgroundColor: theme.palette.primary.main + '20',
        yAxisID: 'y1',
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            family: theme.typography.fontFamily,
          },
          color: theme.palette.text.primary,
        },
      },
      tooltip: {
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        padding: 12,
        bodySpacing: 8,
        titleSpacing: 8,
        bodyFont: {
          size: 12,
          family: theme.typography.fontFamily,
        },
        titleFont: {
          size: 14,
          family: theme.typography.fontFamily,
          weight: 'bold',
        },
        callbacks: {
          title: (context) => {
            return formatTimestamp(context[0].label);
          },
          label: (context) => {
            let label = context.dataset.label || '';
            if (label) {
              label = `${label}: `;
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(1);
              label += label.includes('Temperature') ? '°C' : '%';
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
          color: theme.palette.divider,
        },
        ticks: {
          maxTicksLimit: 8,
          font: {
            size: 11,
          },
          color: theme.palette.text.secondary,
          callback: function(value) {
            return formatTimestamp(this.getLabelForValue(value));
          }
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Temperature (°C)',
          color: theme.palette.error.main,
          font: {
            size: 12,
            weight: 'bold',
          }
        },
        min: Math.min(...historicalData.temperature, 0) - 5,
        max: Math.max(...historicalData.temperature, 40) + 5,
        ticks: {
          stepSize: 5,
          font: {
            size: 11,
          },
          color: theme.palette.text.secondary,
        },
        grid: {
          color: theme.palette.divider,
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Humidity (%)',
          color: theme.palette.primary.main,
          font: {
            size: 12,
            weight: 'bold',
          }
        },
        min: 0,
        max: 100,
        ticks: {
          stepSize: 10,
          font: {
            size: 11,
          },
          color: theme.palette.text.secondary,
        },
        grid: {
          display: false,
        }
      }
    }
  };

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
        Temperature & Humidity Monitor
      </Typography>

      <Grid 
        container 
        spacing={{ xs: 2, sm: 3 }}
        sx={{ width: '100%' }}
      >
        <Grid item xs={12} sm={6}>
          <SensorReadingCard
            title="Temperature"
            value={sensorData?.temperature}
            icon={<ThermostatIcon />}
            unit="°C"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <SensorReadingCard
            title="Humidity"
            value={sensorData?.humidity}
            icon={<WaterDropIcon />}
            unit="%"
          />
        </Grid>
        <Grid item xs={12}>
          <Fade in timeout={500}>
            <Paper
              elevation={3}
              sx={{
                p: { xs: 2, sm: 3 },
                borderRadius: { xs: 2, sm: 3 },
                bgcolor: 'background.paper',
                height: '400px',
                position: 'relative',
              }}
            >
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Alert severity="error">{error}</Alert>
                </Box>
              ) : (
                <Line data={chartData} options={chartOptions} />
              )}
            </Paper>
          </Fade>
        </Grid>
      </Grid>
    </Container>
  );
};

export default TemperatureHumidityView; 