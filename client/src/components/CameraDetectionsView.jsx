import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  IconButton,
  CircularProgress,
  Pagination,
  Tooltip,
  Divider,
  Checkbox,
  Button,
  Snackbar,
  Alert,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import CloseIcon from '@mui/icons-material/Close';
import PhotoIcon from '@mui/icons-material/Photo';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { formatDistanceToNow } from 'date-fns';

const CameraDetectionsView = () => {
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
        console.log("CameraDetectionsView: Fetching images...");
        
        // Check if we have a valid access token
        const token = localStorage.getItem('accessToken');
        console.log("Access token present:", !!token);
        
        if (!token) {
          console.error("No access token found, cannot authenticate with API");
          setLoading(false);
          return;
        }
        
        // First try with the frontend proxy that should handle CORS correctly
        let apiUrl = '/api/captured-images/';
        console.log("Using API URL:", apiUrl);
        
        try {
          let response = await fetch(apiUrl, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          console.log("API Response status:", response.status);
          console.log("API Response ok:", response.ok);
          
          if (response.ok) {
            const data = await response.json();
            console.log('Fetched images data:', data);
            
            if (data.error) {
              console.error('Error from server:', data.error);
            }
            
            // Check if images array exists and is not empty
            if (data.images && data.images.length > 0) {
              console.log(`Found ${data.images.length} images`);
              setCapturedImages(data.images);
            } else {
              console.log('No images found or empty images array');
              setCapturedImages([]);
            }
            
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error('Error with proxy API call, trying direct backend call:', error);
        }
        
        // Fallback to direct backend call if proxy fails
        apiUrl = 'http://localhost:8000/api/captured-images/';
        console.log("Fallback to direct backend API URL:", apiUrl);
        
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include',
        });
        
        console.log("Direct API Response status:", response.status);
        console.log("Direct API Response ok:", response.ok);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Fetched images data from direct API:', data);
          
          if (data.error) {
            console.error('Error from direct API server:', data.error);
          }
          
          // Check if images array exists and is not empty
          if (data.images && data.images.length > 0) {
            console.log(`Found ${data.images.length} images from direct API`);
            setCapturedImages(data.images);
          } else {
            console.log('No images found or empty images array from direct API');
            setCapturedImages([]);
          }
        } else {
          const errorText = await response.text();
          console.error('Failed to fetch images from direct API. Status:', response.status);
          console.error('Error response from direct API:', errorText);
        }
      } catch (error) {
        console.error('Error in fetchImages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
    // Refresh images every 30 seconds
    const interval = setInterval(fetchImages, 30000);
    return () => clearInterval(interval);
  }, []);

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
      console.log(`Attempting to delete image: ${selectedImage.filename}`);
      
      const response = await fetch(`/api/delete-image/${selectedImage.filename}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      console.log(`Delete response status: ${response.status}`);
      
      // Get response text first
      const responseText = await response.text();
      console.log('Raw response text:', responseText);
      
      // Try to parse as JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        throw new Error(`Server returned invalid JSON: ${responseText.substring(0, 100)}`);
      }
      
      console.log('Parsed delete result:', result);
      
      if (response.ok) {
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
        console.error('Failed to delete image:', result);
        
        // Show detailed error message
        setSnackbar({
          open: true,
          message: `Failed to delete image: ${result?.error || 'Server error, please try again.'}`,
          severity: 'error'
        });
        
        // Keep dialog open if it's a permission issue that the user might want to fix
        if (response.status !== 403) {
          setDeleteDialogOpen(false);
        }
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      setSnackbar({
        open: true,
        message: `Error deleting image: ${error.message || 'Unknown error'}`,
        severity: 'error'
      });
      setDeleteDialogOpen(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const deleteMultipleImages = async () => {
    if (selectedImages.length === 0) return;
    
    try {
      setDeleteLoading(true);
      console.log(`Attempting to delete ${selectedImages.length} images`);
      
      const response = await fetch('/api/delete-multiple-images/', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filenames: selectedImages })
      });
      
      console.log(`Delete multiple response status: ${response.status}`);
      
      // Get response text first
      const responseText = await response.text();
      console.log('Raw multiple delete response text:', responseText);
      
      // Try to parse as JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing JSON response for multiple delete:', parseError);
        throw new Error(`Server returned invalid JSON: ${responseText.substring(0, 100)}`);
      }
      
      console.log('Parsed multiple delete result:', result);
      
      if (response.ok) {
        // Remove the deleted images from the state
        setCapturedImages(capturedImages.filter(img => !selectedImages.includes(img.filename)));
        
        // Show success message with details of any failures
        if (result.failed_count > 0) {
          setSnackbar({
            open: true,
            message: `Deleted ${result.success_count} images, but ${result.failed_count} failed. Check console for details.`,
            severity: 'warning'
          });
          console.warn('Some images failed to delete:', result.details);
        } else {
          setSnackbar({
            open: true,
            message: `Successfully deleted ${result.success_count} images`,
            severity: 'success'
          });
        }
        
        // Close dialogs and reset selection
        setDeleteMultipleDialogOpen(false);
        setSelectedImages([]);
        setSelectionMode(false);
        
        // If we deleted all images on the current page, go to the previous page
        if (selectedImages.length >= currentImages.length && page > 1) {
          setPage(page - 1);
        }
      } else {
        console.error('Failed to delete multiple images:', result);
        
        setSnackbar({
          open: true,
          message: `Failed to delete images: ${result?.error || 'Server error, please try again.'}`,
          severity: 'error'
        });
        
        // Close dialog unless it's a permission issue
        if (response.status !== 403) {
          setDeleteMultipleDialogOpen(false);
        }
      }
    } catch (error) {
      console.error('Error deleting multiple images:', error);
      setSnackbar({
        open: true,
        message: `Error deleting images: ${error.message || 'Unknown error'}`,
        severity: 'error'
      });
      setDeleteMultipleDialogOpen(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Helper functions for detection type display
  const getDetectionTypeLabel = (type) => {
    switch (type) {
      case 'yolo': return 'Person Detected';
      case 'pir': return 'Motion Sensor';
      case 'test': return 'Test Capture';
      default: return 'Unknown';
    }
  };

  const getDetectionTypeColor = (type) => {
    switch (type) {
      case 'yolo': return 'error';
      case 'pir': return 'warning';
      case 'test': return 'info';
      default: return 'default';
    }
  };

  const getDetectionTypeIcon = (type) => {
    switch (type) {
      case 'yolo': return <PersonIcon fontSize="small" />;
      case 'pir': return <DirectionsRunIcon fontSize="small" />;
      case 'test': return <PhotoIcon fontSize="small" />;
      default: return null;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h4" gutterBottom>
        Captured Images
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        View images captured when people or motion were detected
      </Typography>

      <Divider sx={{ mb: 4 }} />
      
      {/* Action buttons for image management */}
      {!loading && capturedImages.length > 0 && (
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
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : capturedImages.length === 0 ? (
        <Box sx={{ textAlign: 'center', p: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No captured images yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Images will appear here when a person is detected
          </Typography>
        </Box>
      ) : (
        <>
          <Grid container spacing={3}>
            {currentImages.map((image) => (
              <Grid item xs={12} sm={6} md={4} key={image.filename}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    transition: 'transform 0.3s',
                    '&:hover': {
                      transform: selectionMode ? 'none' : 'scale(1.02)',
                      boxShadow: (theme) => theme.shadows[6]
                    },
                    position: 'relative',
                    border: selectedImages.includes(image.filename) ? (theme) => `2px solid ${theme.palette.primary.main}` : 'none',
                  }}
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
                          color: (theme) => theme.palette.primary.main,
                        }
                      }}
                    />
                  )}
                  <Box sx={{ position: 'relative' }}>
                    <CardMedia
                      component="img"
                      image={image.url}
                      alt={`Captured Image ${image.filename}`}
                      sx={{ 
                        height: 220,
                        objectFit: 'cover',
                        cursor: selectionMode ? 'default' : 'pointer'
                      }}
                      onClick={selectionMode ? null : () => handleImageClick(image)}
                    />
                    <Box 
                      sx={{ 
                        position: 'absolute', 
                        top: 8, 
                        right: 8,
                        display: 'flex',
                        gap: 1
                      }}
                    >
                      <Chip
                        size="small"
                        label={getDetectionTypeLabel(image.detection_type)}
                        color={getDetectionTypeColor(image.detection_type)}
                        icon={getDetectionTypeIcon(image.detection_type)}
                        sx={{ 
                          backgroundColor: 'rgba(0, 0, 0, 0.6)',
                          color: 'white',
                          '& .MuiChip-icon': { color: 'white' }
                        }}
                      />
                      {!selectionMode && (
                        <Tooltip title="Delete image">
                          <IconButton
                            size="small"
                            sx={{ 
                              color: 'white', 
                              backgroundColor: 'rgba(211, 47, 47, 0.7)',
                              '&:hover': {
                                backgroundColor: 'rgba(211, 47, 47, 0.9)',
                              }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteDialog(image);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(image.timestamp).toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDistanceToNow(new Date(image.timestamp), { addSuffix: true })}
                    </Typography>
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
      
      {/* Image Dialog */}
      <Dialog
        open={!!selectedImage}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        {selectedImage && (
          <>
            <DialogContent sx={{ p: 0, position: 'relative' }}>
              <IconButton
                onClick={handleCloseDialog}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  color: 'white',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  }
                }}
              >
                <CloseIcon />
              </IconButton>
              <CardMedia
                component="img"
                image={selectedImage.url}
                alt={`Captured Image ${selectedImage.filename}`}
                sx={{ width: '100%' }}
              />
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {selectedImage.filename}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <Chip
                      icon={getDetectionTypeIcon(selectedImage.detection_type)}
                      label={getDetectionTypeLabel(selectedImage.detection_type)}
                      color={getDetectionTypeColor(selectedImage.detection_type)}
                      sx={{ mb: 1, mr: 1 }}
                    />
                    <Chip
                      icon={<AccessTimeIcon />}
                      label={formatDistanceToNow(new Date(selectedImage.timestamp), { addSuffix: true })}
                      sx={{ mb: 1 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => {
                        handleCloseDialog();
                        openDeleteDialog(selectedImage);
                      }}
                    >
                      Delete Image
                    </Button>
                  </Grid>
                </Grid>
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

export default CameraDetectionsView; 