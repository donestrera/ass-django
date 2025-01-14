import { useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Box, 
  Card, 
  CardContent, 
  TextField, 
  Button, 
  Typography, 
  Alert,
  Container,
  IconButton,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

const API_URL = `${import.meta.env.VITE_API_URL}/api`;

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, error: authError } = useAuth();

  // Form validation
  const isFormValid = useMemo(() => {
    return formData.username.trim() && formData.password.trim();
  }, [formData.username, formData.password]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError(''); // Clear error when user types
  }, []);

  const handleClickShowPassword = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    setLoading(true);
    
    try {
      const trimmedData = {
        username: formData.username.trim(),
        password: formData.password,
      };

      const response = await axios.post(`${API_URL}/auth/login/`, trimmedData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (response.data?.access) {
        login(response.data);
        navigate('/dashboard');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.response?.status === 401) {
        setError('Invalid username or password');
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.request) {
        setError('Unable to connect to the server. Please check your internet connection.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Memoize styles
  const styles = useMemo(() => ({
    root: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      padding: { xs: 2, sm: 3 },
    },
    card: {
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderRadius: 2,
      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.2)',
    },
    icon: {
      fontSize: 48,
      color: 'primary.main',
      mb: 2,
    },
    title: {
      fontWeight: 700,
      color: 'primary.main',
      mb: 1,
      fontSize: { xs: '1.75rem', sm: '2.125rem' },
    },
    subtitle: {
      fontSize: { xs: '0.875rem', sm: '1rem' },
    },
    textField: {
      '& .MuiOutlinedInput-root': {
        borderRadius: 1,
      },
    },
    button: {
      mt: 3,
      mb: 2,
      py: 1.5,
      borderRadius: 1,
      fontWeight: 600,
      textTransform: 'none',
      fontSize: { xs: '1rem', sm: '1.1rem' },
    },
    link: {
      color: '#1976d2',
      textDecoration: 'none',
      fontWeight: 500,
    },
  }), []);

  return (
    <Box sx={styles.root}>
      <Container component="main" maxWidth="xs">
        <Card sx={styles.card}>
          <CardContent sx={{ padding: 4 }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                mb: 3,
              }}
            >
              <SecurityIcon sx={styles.icon} />
              <Typography component="h1" variant="h4" sx={styles.title}>
                Security Access
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center" sx={styles.subtitle}>
                Sign in to access the security system
              </Typography>
            </Box>

            {(error || authError) && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 1 }}>
                {error || authError}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Username"
                name="username"
                autoComplete="username"
                autoFocus
                value={formData.username}
                onChange={handleChange}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlineIcon color="primary" />
                    </InputAdornment>
                  ),
                }}
                sx={styles.textField}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon color="primary" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        edge="end"
                        disabled={loading}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={styles.textField}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading || !isFormValid}
                sx={styles.button}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Sign In'
                )}
              </Button>
              <Box sx={{ textAlign: 'center' }}>
                <Link to="/register" style={styles.link}>
                  Don't have an account? Register here
                </Link>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default Login; 