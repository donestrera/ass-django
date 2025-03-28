import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import Login from './components/Login';
import Register from './components/Register';
import Navigation from './components/Navigation';
import TemperatureHumidityView from './components/TemperatureHumidityView';
import MotionSensorView from './components/MotionSensorView';
import SmokeSensorView from './components/SmokeSensorView';
import CameraView from './components/CameraView';
import CameraLogView from './components/CameraLogView';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SensorProvider } from './context/SensorContext';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2196f3',
      light: '#64b5f6',
      dark: '#1976d2',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 4px 0 rgba(0,0,0,0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
  },
});

const DashboardLayout = ({ children }) => {
  return (
    <SensorProvider>
      <Navigation />
      {children}
    </SensorProvider>
  );
};

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <DashboardLayout>{children}</DashboardLayout> : <Navigate to="/login" />;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={<Navigate to="/dashboard/temperature" replace />}
            />
            <Route
              path="/dashboard/camera"
              element={
                <PrivateRoute>
                  <CameraView />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/camera-logs"
              element={
                <PrivateRoute>
                  <CameraLogView />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/temperature"
              element={
                <PrivateRoute>
                  <TemperatureHumidityView />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/motion"
              element={
                <PrivateRoute>
                  <MotionSensorView />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/smoke"
              element={
                <PrivateRoute>
                  <SmokeSensorView />
                </PrivateRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
