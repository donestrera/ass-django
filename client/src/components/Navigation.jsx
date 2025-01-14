import React, { useState } from 'react';
import {
  AppBar,
  Box,
  IconButton,
  Toolbar,
  Typography,
  useTheme,
  Menu,
  MenuItem,
  Button,
  Avatar,
  Tooltip,
  Fade,
  ListItemIcon,
  Container,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import SmokingRoomsIcon from '@mui/icons-material/SmokingRooms';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navigation = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  const menuItems = [
    {
      text: 'Temperature & Humidity',
      icon: <ThermostatIcon />,
      path: '/dashboard/temperature',
    },
    {
      text: 'Motion Detection',
      icon: <DirectionsRunIcon />,
      path: '/dashboard/motion',
    },
    {
      text: 'Smoke Detection',
      icon: <SmokingRoomsIcon />,
      path: '/dashboard/smoke',
    },
  ];

  const handleMenuClick = (event) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleUserMenuClick = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleNavigation = (path) => {
    navigate(path);
    handleMenuClose();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getCurrentPageTitle = () => {
    const currentItem = menuItems.find(item => item.path === location.pathname);
    return currentItem?.text || 'Dashboard';
  };

  const getCurrentPageIcon = () => {
    const currentItem = menuItems.find(item => item.path === location.pathname);
    return currentItem?.icon || <DashboardIcon />;
  };

  return (
    <AppBar 
      position="sticky" 
      sx={{ 
        backgroundColor: theme.palette.background.paper,
        boxShadow: 1,
      }}
    >
      <Container maxWidth="lg">
        <Toolbar 
          variant="dense" 
          sx={{ 
            minHeight: 48,
            py: 0.5
          }}
        >
          <IconButton
            size="small"
            edge="start"
            onClick={handleMenuClick}
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>

          {getCurrentPageIcon()}
          
          <Typography 
            variant="subtitle1" 
            component="div" 
            sx={{ 
              flexGrow: 1,
              ml: 1,
              fontSize: '1rem'
            }}
          >
            {getCurrentPageTitle()}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="User menu">
              <IconButton
                size="small"
                onClick={handleUserMenuClick}
              >
                <Avatar 
                  sx={{ 
                    width: 32, 
                    height: 32,
                    bgcolor: theme.palette.primary.main 
                  }}
                >
                  {/* Avatar content */}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>

          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={handleMenuClose}
            TransitionComponent={Fade}
            sx={{ mt: 1 }}
          >
            {menuItems.map((item) => (
              <MenuItem 
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                dense
                sx={{ py: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {React.cloneElement(item.icon, { fontSize: 'small' })}
                </ListItemIcon>
                <Typography variant="body2">
                  {item.text}
                </Typography>
              </MenuItem>
            ))}
          </Menu>

          <Menu
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={handleUserMenuClose}
            TransitionComponent={Fade}
            sx={{ mt: 1 }}
          >
            <MenuItem 
              onClick={handleLogout}
              dense
              sx={{ py: 1 }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2">
                Logout
              </Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navigation; 