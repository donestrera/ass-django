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
  Tabs,
  Tab,
  Card,
  CardMedia,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  IconButton,
  CircularProgress,
  Pagination,
  Badge,
  Tooltip,
  Divider,
  Checkbox,
  Button,
  DialogActions,
  DialogTitle,
  Snackbar,
  Alert
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import CloseIcon from '@mui/icons-material/Close';
import SpeedIcon from '@mui/icons-material/Speed';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { useSensor } from '../context/SensorContext';
import { formatDistanceToNow } from 'date-fns';

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`camera-tabpanel-${index}`}
      aria-labelledby={`camera-tab-${index}`}
      {...other}
      style={{ width: '100%' }}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const CameraLogView = () => {
  const theme = useTheme();
  const { motionHistory } = useSensor();
  const [tabValue, setTabValue] = useState(0);
  const [capturedImages, setCapturedImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [page, setPage] = useState(1);
  const imagesPerPage = 6;
  
  // New state for image selection and deletion
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteMultipleDialogOpen, setDeleteMultipleDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch captured images
  useEffect(() => {
    const fetchImages = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/captured-images/', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Fetched images data:', data);
          
          if (data.error) {
            console.error('Error from server:', data.error);
          }
          
          // Check if images array exists and is not empty
          if (data.images && data.images.length > 0) {
            setCapturedImages(data.images);
          } else {
            console.log('No images found or empty images array');
            setCapturedImages([]);
          }
        } else {
          console.error('Failed to fetch images:', await response.text());
        }
      } catch (error) {
        console.error('Error fetching images:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
    // Refresh images every 30 seconds
    const interval = setInterval(fetchImages, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter history by detection type
  const yoloDetections = motionHistory.filter(event => event.detection_type === 'yolo');
  const pirDetections = motionHistory.filter(event => event.detection_type === 'pir');

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Handle image click to open dialog
  const handleImageClick = (image) => {
    setSelectedImage(image);
  };

  // Handle dialog close
  const handleCloseDialog = () => {
    setSelectedImage(null);
  };

  // Handle pagination change
  const handlePageChange = (event, value) => {
    setPage(value);
  };

  // Calculate pagination
  const totalPages = Math.ceil(capturedImages.length / imagesPerPage);
  const currentImages = capturedImages.slice(
    (page - 1) * imagesPerPage,
    page * imagesPerPage
  );

  // Handle image selection for deletion
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      // Clear selections when exiting selection mode
      setSelectedImages([]);
    }
  };

  const handleImageSelection = (image, event) => {
    event.stopPropagation(); // Prevent opening the image dialog
    
    const filename = image.filename;
    const isSelected = selectedImages.includes(filename);
    
    if (isSelected) {
      setSelectedImages(selectedImages.filter(name => name !== filename));
    } else {
      setSelectedImages([...selectedImages, filename]);
    }
  };

  const handleSelectAll = () => {
    if (selectedImages.length === currentImages.length) {
      // If all are selected, deselect all
      setSelectedImages([]);
    } else {
      // Otherwise, select all current page images
      setSelectedImages(currentImages.map(image => image.filename));
    }
  };

  // Handle image deletion
  const openDeleteDialog = (image) => {
    setSelectedImage(image);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
  };

  const openDeleteMultipleDialog = () => {
    setDeleteMultipleDialogOpen(true);
  };

  const closeDeleteMultipleDialog = () => {
    setDeleteMultipleDialogOpen(false);
  };

  const deleteImage = async () => {
    if (!selectedImage) return;
    
    try {
      setDeleteLoading(true);
      const response = await fetch(`/api/delete-image/${selectedImage.filename}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Delete result:', result);
        
        // Remove the deleted image from the state
        setCapturedImages(capturedImages.filter(img => img.filename !== selectedImage.filename));
        
        // Show success message
        setSnackbar({
          open: true,
          message: `Image "${selectedImage.filename}" deleted successfully`,
          severity: 'success'
        });
        
        // Close dialogs
        setDeleteDialogOpen(false);
        setSelectedImage(null);
        
        // If we deleted the last image on the current page, go to the previous page
        if (currentImages.length === 1 && page > 1) {
          setPage(page - 1);
        }
      } else {
        const error = await response.json();
        console.error('Failed to delete image:', error);
        
        setSnackbar({
          open: true,
          message: `Failed to delete image: ${error.error || 'Unknown error'}`,
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      setSnackbar({
        open: true,
        message: `Error deleting image: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const deleteMultipleImages = async () => {
    if (selectedImages.length === 0) return;
    
    try {
      setDeleteLoading(true);
      const response = await fetch('/api/delete-multiple-images/', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filenames: selectedImages })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Delete multiple result:', result);
        
        // Remove the deleted images from the state
        setCapturedImages(capturedImages.filter(img => !selectedImages.includes(img.filename)));
        
        // Show success message
        setSnackbar({
          open: true,
          message: `Successfully deleted ${result.success_count} images`,
          severity: 'success'
        });
        
        // Close dialogs and reset selection
        setDeleteMultipleDialogOpen(false);
        setSelectedImages([]);
        setSelectionMode(false);
        
        // If we deleted all images on the current page, go to the previous page
        if (selectedImages.length >= currentImages.length && page > 1) {
          setPage(page - 1);
        }
      } else {
        const error = await response.json();
        console.error('Failed to delete multiple images:', error);
        
        setSnackbar({
          open: true,
          message: `Failed to delete images: ${error.error || 'Unknown error'}`,
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error deleting multiple images:', error);
      setSnackbar({
        open: true,
        message: `Error deleting images: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Helper functions for detection types
  const getDetectionTypeLabel = (type) => {
    switch(type) {
      case 'yolo': return 'YOLO';
      case 'pir': return 'PIR';
      case 'test': return 'Test';
      default: return 'Unknown';
    }
  };
  
  const getDetectionTypeColor = (type) => {
    switch(type) {
      case 'yolo': return 'primary';
      case 'pir': return 'secondary';
      case 'test': return 'info';
      default: return 'default';
    }
  };
  
  const getDetectionTypeIcon = (type) => {
    switch(type) {
      case 'yolo': return <PersonIcon />;
      case 'pir': return <DirectionsRunIcon />;
      case 'test': return <ZoomInIcon />;
      default: return <AccessTimeIcon />;
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
          color: theme.palette.text.primary,
          mb: { xs: 2, sm: 3, md: 4 },
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' }
        }}
      >
        <PersonIcon sx={{ color: theme.palette.primary.main }} />
        Camera Detection Logs
      </Typography>

      <Paper 
        elevation={3} 
        sx={{ 
          width: '100%', 
          borderRadius: { xs: 2, sm: 3 },
          overflow: 'hidden',
          mb: 4
        }}
      >
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          variant="fullWidth" 
          textColor="primary"
          indicatorColor="primary"
          sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            '& .MuiTab-root': {
              py: { xs: 1.5, sm: 2 },
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }
          }}
        >
          <Tab 
            icon={<PersonIcon />} 
            label="YOLO Detections" 
            iconPosition="start"
            sx={{ gap: 1 }}
          />
          <Tab 
            icon={<DirectionsRunIcon />} 
            label="PIR Detections" 
            iconPosition="start"
            sx={{ gap: 1 }}
          />
          <Tab 
            label="Captured Images" 
            icon={
              <Badge badgeContent={capturedImages.length} color="primary">
                <ZoomInIcon />
              </Badge>
            }
            iconPosition="start"
            sx={{ gap: 1 }}
          />
        </Tabs>

        {/* YOLO Detections Tab */}
        <TabPanel value={tabValue} index={0}>
          {yoloDetections.length === 0 ? (
            <Typography 
              color="text.secondary" 
              align="center" 
              sx={{ 
                py: { xs: 4, sm: 6, md: 8 },
                fontSize: { xs: '0.875rem', sm: '1rem', md: '1.2rem' }
              }}
            >
              No YOLO person detections recorded yet
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
              {yoloDetections.map((event, index) => (
                <ListItem key={index} divider={index !== yoloDetections.length - 1}>
                  <ListItemIcon>
                    <PersonIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body1">
                          {new Date(event.timestamp).toLocaleString()}
                        </Typography>
                        <Chip 
                          size="small" 
                          label="YOLO" 
                          color="primary" 
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <SpeedIcon sx={{ fontSize: 16, color: theme.palette.warning.main }} />
                          <Typography variant="body2" color="text.secondary">
                            Confidence: {(event.confidence * 100).toFixed(1)}%
                          </Typography>
                        </Box>
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AccessTimeIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
                          <Typography variant="body2" color="text.secondary">
                            {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
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
        </TabPanel>

        {/* PIR Detections Tab */}
        <TabPanel value={tabValue} index={1}>
          {pirDetections.length === 0 ? (
            <Typography 
              color="text.secondary" 
              align="center" 
              sx={{ 
                py: { xs: 4, sm: 6, md: 8 },
                fontSize: { xs: '0.875rem', sm: '1rem', md: '1.2rem' }
              }}
            >
              No PIR motion detections recorded yet
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
              {pirDetections.map((event, index) => (
                <ListItem key={index} divider={index !== pirDetections.length - 1}>
                  <ListItemIcon>
                    <DirectionsRunIcon color="secondary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body1">
                          {new Date(event.timestamp).toLocaleString()}
                        </Typography>
                        <Chip 
                          size="small" 
                          label="PIR" 
                          color="secondary" 
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AccessTimeIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
                          <Typography variant="body2" color="text.secondary">
                            {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
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
        </TabPanel>

        {/* Captured Images Tab */}
        <TabPanel value={tabValue} index={2}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : capturedImages.length === 0 ? (
            <Typography 
              color="text.secondary" 
              align="center" 
              sx={{ 
                py: { xs: 4, sm: 6, md: 8 },
                fontSize: { xs: '0.875rem', sm: '1rem', md: '1.2rem' }
              }}
            >
              No captured images available
            </Typography>
          ) : (
            <>
              {/* Action buttons for image management */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Box>
                  <Button
                    variant={selectionMode ? "contained" : "outlined"}
                    color={selectionMode ? "primary" : "secondary"}
                    startIcon={<DeleteSweepIcon />}
                    onClick={toggleSelectionMode}
                    size="small"
                    sx={{ mr: 1 }}
                  >
                    {selectionMode ? "Cancel Selection" : "Select Images"}
                  </Button>
                  
                  {selectionMode && (
                    <>
                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={handleSelectAll}
                        size="small"
                        sx={{ mr: 1 }}
                      >
                        {selectedImages.length === currentImages.length ? "Deselect All" : "Select All"}
                      </Button>
                      
                      <Button
                        variant="contained"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={openDeleteMultipleDialog}
                        disabled={selectedImages.length === 0}
                        size="small"
                      >
                        Delete Selected ({selectedImages.length})
                      </Button>
                    </>
                  )}
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                  {capturedImages.length} {capturedImages.length === 1 ? 'image' : 'images'} total
                </Typography>
              </Box>

              <Grid container spacing={2}>
                {currentImages.map((image, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card 
                      sx={{ 
                        cursor: selectionMode ? 'default' : 'pointer',
                        transition: 'transform 0.2s',
                        '&:hover': {
                          transform: selectionMode ? 'none' : 'scale(1.02)',
                        },
                        position: 'relative',
                        border: selectedImages.includes(image.filename) ? `2px solid ${theme.palette.primary.main}` : 'none',
                      }}
                      onClick={selectionMode ? null : () => handleImageClick(image)}
                    >
                      {selectionMode && (
                        <Checkbox
                          checked={selectedImages.includes(image.filename)}
                          onChange={(e) => handleImageSelection(image, e)}
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            zIndex: 1,
                            color: 'white',
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            borderRadius: '4px',
                            m: 1,
                            '&.Mui-checked': {
                              color: theme.palette.primary.main,
                            }
                          }}
                        />
                      )}
                      
                      <CardMedia
                        component="img"
                        height="180"
                        image={image.url}
                        alt={`Captured image ${index}`}
                        sx={{ 
                          objectFit: 'cover',
                          '&.MuiCardMedia-img': {
                            objectFit: 'cover',
                          }
                        }}
                        onError={(e) => {
                          console.error(`Failed to load image: ${image.url}`);
                          // Set a fallback image
                          e.target.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22288%22%20height%3D%22225%22%20viewBox%3D%220%200%20288%20225%22%3E%3Crect%20fill%3D%22%23eee%22%20width%3D%22288%22%20height%3D%22225%22%2F%3E%3Ctext%20fill%3D%22%23aaa%22%20font-family%3D%22\'Helvetica%20Neue\'%2C%20Helvetica%2C%20Arial%2C%20sans-serif%22%20font-size%3D%2214%22%20text-anchor%3D%22middle%22%20x%3D%22144%22%20y%3D%22112%22%3EImage%20not%20available%3C%2Ftext%3E%3C%2Fsvg%3E';
                        }}
                      />
                      <CardContent sx={{ py: 1, px: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(image.timestamp).toLocaleString()}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Chip 
                              size="small" 
                              label={getDetectionTypeLabel(image.detection_type)} 
                              color={getDetectionTypeColor(image.detection_type)} 
                              sx={{ height: 20, fontSize: '0.7rem', mr: 1 }}
                            />
                            {!selectionMode && (
                              <IconButton 
                                size="small" 
                                color="error" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDeleteDialog(image);
                                }}
                                sx={{ p: 0.5 }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              
              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Pagination 
                    count={totalPages} 
                    page={page} 
                    onChange={handlePageChange} 
                    color="primary"
                    size="medium"
                  />
                </Box>
              )}
            </>
          )}
        </TabPanel>
      </Paper>

      {/* Image Dialog */}
      <Dialog
        open={!!selectedImage}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        {selectedImage && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
              <IconButton onClick={handleCloseDialog}>
                <CloseIcon />
              </IconButton>
            </Box>
            <DialogContent sx={{ p: 0 }}>
              <img 
                src={selectedImage.url} 
                alt="Captured image" 
                style={{ width: '100%', height: 'auto', display: 'block' }}
                onError={(e) => {
                  console.error(`Failed to load image in dialog: ${selectedImage.url}`);
                  e.target.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Crect%20fill%3D%22%23eee%22%20width%3D%22800%22%20height%3D%22600%22%2F%3E%3Ctext%20fill%3D%22%23aaa%22%20font-family%3D%22\'Helvetica%20Neue\'%2C%20Helvetica%2C%20Arial%2C%20sans-serif%22%20font-size%3D%2224%22%20text-anchor%3D%22middle%22%20x%3D%22400%22%20y%3D%22300%22%3EImage%20not%20available%3C%2Ftext%3E%3C%2Fsvg%3E';
                }}
              />
              <Box sx={{ p: 2 }}>
                <Typography variant="h6">
                  {selectedImage.filename}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
                  <Chip 
                    icon={getDetectionTypeIcon(selectedImage.detection_type)}
                    label={getDetectionTypeLabel(selectedImage.detection_type)} 
                    color={getDetectionTypeColor(selectedImage.detection_type)} 
                  />
                  <Chip 
                    icon={<AccessTimeIcon />}
                    label={new Date(selectedImage.timestamp).toLocaleString()} 
                  />
                  <Chip 
                    label={`${(selectedImage.size / 1024).toFixed(1)} KB`} 
                  />
                </Box>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* Delete Single Image Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={closeDeleteDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Image</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this image?
            {selectedImage && (
              <Box component="span" sx={{ fontWeight: 'bold', display: 'block', mt: 1 }}>
                {selectedImage.filename}
              </Box>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button 
            onClick={deleteImage} 
            color="error" 
            variant="contained"
            disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Multiple Images Dialog */}
      <Dialog
        open={deleteMultipleDialogOpen}
        onClose={closeDeleteMultipleDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Multiple Images</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {selectedImages.length} selected {selectedImages.length === 1 ? 'image' : 'images'}?
          </Typography>
          {selectedImages.length > 0 && (
            <Box sx={{ mt: 2, maxHeight: '200px', overflowY: 'auto' }}>
              <Typography variant="subtitle2" gutterBottom>
                Selected images:
              </Typography>
              <List dense>
                {selectedImages.map((filename, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={filename} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteMultipleDialog} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button 
            onClick={deleteMultipleImages} 
            color="error" 
            variant="contained"
            disabled={deleteLoading || selectedImages.length === 0}
            startIcon={deleteLoading ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {deleteLoading ? 'Deleting...' : 'Delete Selected'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CameraLogView; 