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
  useMediaQuery,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import SmokingRoomsIcon from '@mui/icons-material/SmokingRooms';
import VideocamIcon from '@mui/icons-material/Videocam';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navigation = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const menuItems = [
    {
      text: 'Camera Feed',
      icon: <VideocamIcon />,
      path: '/dashboard/camera',
    },
    {
      text: 'Captured Images',
      icon: <ImageSearchIcon />,
      path: '/dashboard/detections',
    },
    {
      text: 'Camera Logs',
      icon: <PhotoLibraryIcon />,
      path: '/dashboard/camera-logs',
    },
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
      <Container maxWidth="xl">
        <Toolbar 
          variant="dense" 
          sx={{ 
            minHeight: { xs: 40, sm: 48, md: 56 },
            py: { xs: 0.25, sm: 0.5, md: 1 },
            px: { xs: 0.5, sm: 2, md: 3 }
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: { xs: 0.5, sm: 1, md: 2 },
            flexGrow: 1 
          }}>
            <IconButton
              size={isMobile ? "small" : "medium"}
              edge="start"
              onClick={handleMenuClick}
              sx={{ mr: { xs: 0.5, sm: 1, md: 2 } }}
            >
              <MenuIcon fontSize={isMobile ? "small" : "medium"} />
            </IconButton>

            {React.cloneElement(getCurrentPageIcon(), {
              fontSize: isMobile ? "small" : "medium",
              sx: { fontSize: { md: '1.8rem' } }
            })}
            
            <Typography 
              variant={isMobile ? "body1" : "h6"}
              component="div" 
              sx={{ 
                flexGrow: 1,
                ml: { xs: 0.5, sm: 1, md: 2 },
                fontSize: { xs: '0.9rem', sm: '1.1rem', md: '1.3rem' },
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {getCurrentPageTitle()}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1, md: 2 } }}>
            <Tooltip title="User menu">
              <IconButton
                size={isMobile ? "small" : "medium"}
                onClick={handleUserMenuClick}
              >
                <Avatar 
                  sx={{ 
                    width: { xs: 28, sm: 32, md: 40 }, 
                    height: { xs: 28, sm: 32, md: 40 },
                    bgcolor: theme.palette.primary.main,
                    fontSize: { xs: '0.9rem', sm: '1rem', md: '1.2rem' }
                  }}
                >
                  U
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>

          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={handleMenuClose}
            TransitionComponent={Fade}
            sx={{ 
              mt: { xs: 1, md: 2 },
              '& .MuiPaper-root': {
                minWidth: { xs: 200, sm: 220, md: 280 },
                maxWidth: '90vw'
              }
            }}
          >
            {menuItems.map((item) => (
              <MenuItem 
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                dense={isMobile}
                sx={{ 
                  py: { xs: 0.5, sm: 1, md: 1.5 },
                  px: { xs: 1, sm: 2, md: 3 }
                }}
              >
                <ListItemIcon sx={{ minWidth: { xs: 32, sm: 36, md: 44 } }}>
                  {React.cloneElement(item.icon, { 
                    fontSize: isMobile ? "small" : "medium",
                    sx: { fontSize: { md: '1.5rem' } }
                  })}
                </ListItemIcon>
                <Typography 
                  variant={isMobile ? "body2" : "body1"}
                  sx={{ 
                    fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1.1rem' },
                    whiteSpace: 'nowrap'
                  }}
                >
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
            sx={{ 
              mt: { xs: 1, md: 2 },
              '& .MuiPaper-root': {
                minWidth: { xs: 160, sm: 180, md: 220 },
                maxWidth: '90vw'
              }
            }}
          >
            <MenuItem 
              onClick={handleLogout}
              dense={isMobile}
              sx={{ 
                py: { xs: 0.5, sm: 1, md: 1.5 },
                px: { xs: 1, sm: 2, md: 3 }
              }}
            >
              <ListItemIcon sx={{ minWidth: { xs: 32, sm: 36, md: 44 } }}>
                <LogoutIcon 
                  fontSize={isMobile ? "small" : "medium"}
                  sx={{ fontSize: { md: '1.5rem' } }}
                />
              </ListItemIcon>
              <Typography 
                variant={isMobile ? "body2" : "body1"}
                sx={{ 
                  fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1.1rem' },
                  whiteSpace: 'nowrap'
                }}
              >
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