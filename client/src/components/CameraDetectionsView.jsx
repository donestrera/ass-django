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
              
              // Add debugging for timestamps in the first few images
              data.images.slice(0, 3).forEach((img, index) => {
                console.log(`Image ${index + 1} details:`, {
                  filename: img.filename,
                  timestamp: img.timestamp,
                  parsed_date: getBestDate(img).toISOString(),
                  file_date: extractDateFromFilename(img.filename)?.toISOString() || 'No date from filename'
                });
              });
              
              // Process the images to ensure dates are consistent
              const processedImages = data.images.map(img => {
                // Try to get date from filename for each image and store it
                const fileDate = extractDateFromFilename(img.filename);
                if (fileDate) {
                  img._extracted_date = fileDate.toISOString();
                }
                return img;
              });
              
              setCapturedImages(processedImages);
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
            
            // Add debugging for timestamps in the first few images
            data.images.slice(0, 3).forEach((img, index) => {
              console.log(`Direct API Image ${index + 1} details:`, {
                filename: img.filename,
                timestamp: img.timestamp,
                parsed_date: getBestDate(img).toISOString(),
                file_date: extractDateFromFilename(img.filename)?.toISOString() || 'No date from filename'
              });
            });
            
            // Process the images to ensure dates are consistent
            const processedImages = data.images.map(img => {
              // Try to get date from filename for each image and store it
              const fileDate = extractDateFromFilename(img.filename);
              if (fileDate) {
                img._extracted_date = fileDate.toISOString();
              }
              return img;
            });
            
            setCapturedImages(processedImages);
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
      
      // First try the direct API to avoid proxy issues
      let apiUrl = `http://localhost:8000/api/delete-image/${selectedImage.filename}/`;
      console.log(`Using direct API URL: ${apiUrl}`);
      
      try {
        const response = await fetch(apiUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include'
        });
        
        console.log(`Delete response status from direct API: ${response.status}`);
        
        // Get response text first
        const responseText = await response.text();
        console.log('Raw response text from direct API:', responseText);
        
        // Try to parse as JSON
        let result;
        try {
          // Only try to parse if the response starts with a JSON character ({ or [)
          if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
            result = JSON.parse(responseText);
            
            // If we got a valid response, proceed with the rest of the function
            console.log('Parsed delete result from direct API:', result);
            
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
              throw new Error(result?.error || 'Server error, please try again.');
            }
            
            return; // Exit early since we processed the direct API successfully
          } else {
            console.error('Response from direct API is not JSON:', responseText.substring(0, 100));
            // Continue to try the proxy if direct API failed
          }
        } catch (parseError) {
          console.error('Error parsing JSON response from direct API:', parseError);
          // Continue to try the proxy if direct API failed
        }
      } catch (directApiError) {
        console.error('Error with direct API call:', directApiError);
        // Continue to try the proxy if direct API failed
      }
      
      // Fall back to proxy call
      console.log('Falling back to proxy API call');
      const response = await fetch(`/api/delete-image/${selectedImage.filename}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log(`Delete response status from proxy: ${response.status}`);
      
      // Get response text first
      const responseText = await response.text();
      console.log('Raw response text from proxy:', responseText);
      
      // Try to parse as JSON
      let result;
      try {
        // Only try to parse if the response starts with a JSON character ({ or [)
        if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
          result = JSON.parse(responseText);
        } else {
          console.error('Response from proxy is not JSON:', responseText.substring(0, 100));
          throw new Error('Server returned non-JSON response');
        }
      } catch (parseError) {
        console.error('Error parsing JSON response from proxy:', parseError);
        throw new Error(`Server returned invalid JSON response`);
      }
      
      console.log('Parsed delete result from proxy:', result);
      
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
        console.error('Failed to delete image from proxy:', result);
        
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
      
      // First try the direct API to avoid proxy issues
      let apiUrl = 'http://localhost:8000/api/delete-multiple-images/';
      console.log(`Using direct API URL: ${apiUrl}`);
      
      try {
        const response = await fetch(apiUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ filenames: selectedImages })
        });
        
        console.log(`Delete multiple response status from direct API: ${response.status}`);
        
        // Get response text first
        const responseText = await response.text();
        console.log('Raw multiple delete response text from direct API:', responseText);
        
        // Try to parse as JSON
        let result;
        try {
          // Only try to parse if the response starts with a JSON character ({ or [)
          if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
            result = JSON.parse(responseText);
            
            // If we got a valid response, proceed with the rest of the function
            console.log('Parsed multiple delete result from direct API:', result);
            
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
              
              return; // Exit early since we processed the direct API successfully
            } else {
              throw new Error(result?.error || 'Server error, please try again.');
            }
          } else {
            console.error('Response from direct API is not JSON:', responseText.substring(0, 100));
            // Continue to try the proxy if direct API failed
          }
        } catch (parseError) {
          console.error('Error parsing JSON response from direct API:', parseError);
          // Continue to try the proxy if direct API failed
        }
      } catch (directApiError) {
        console.error('Error with direct API call:', directApiError);
        // Continue to try the proxy if direct API failed
      }
      
      // Fall back to proxy call
      console.log('Falling back to proxy API call for multiple delete');
      const response = await fetch('/api/delete-multiple-images/', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ filenames: selectedImages })
      });
      
      console.log(`Delete multiple response status from proxy: ${response.status}`);
      
      // Get response text first
      const responseText = await response.text();
      console.log('Raw multiple delete response text from proxy:', responseText);
      
      // Try to parse as JSON
      let result;
      try {
        // Only try to parse if the response starts with a JSON character ({ or [)
        if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
          result = JSON.parse(responseText);
        } else {
          console.error('Response from proxy is not JSON:', responseText.substring(0, 100));
          throw new Error('Server returned non-JSON response');
        }
      } catch (parseError) {
        console.error('Error parsing JSON response for multiple delete from proxy:', parseError);
        throw new Error(`Server returned invalid JSON response`);
      }
      
      console.log('Parsed multiple delete result from proxy:', result);
      
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
        console.error('Failed to delete multiple images from proxy:', result);
        
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

  // Extract date from filename using multiple pattern matching strategies
  const extractDateFromFilename = (filename) => {
    if (!filename) return null;
    
    try {
      // Most common pattern: YYYYMMDD_HHMMSS anywhere in the filename
      // Matches: person_detected_20230402_145321.jpg, motion_pir_20230402_145321.jpg, etc.
      const standardPattern = /(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/;
      const standardMatch = filename.match(standardPattern);
      
      if (standardMatch) {
        const [_, year, month, day, hour, min, sec] = standardMatch;
        console.log(`Matched standard pattern in ${filename}: ${year}-${month}-${day} ${hour}:${min}:${sec}`);
        
        // Ensure we're in the correct timezone by using UTC and then getting local date
        const date = new Date(Date.UTC(
          parseInt(year, 10), 
          parseInt(month, 10) - 1, // Month is 0-indexed in JS Date
          parseInt(day, 10),
          parseInt(hour, 10),
          parseInt(min, 10),
          parseInt(sec, 10)
        ));
        
        // Convert UTC to local timezone
        return new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
      }
      
      // More loose pattern with separators: YYYY-MM-DD or YYYY/MM/DD followed by time
      const loosePattern = /(\d{4})[-/](\d{1,2})[-/](\d{1,2})[-_\s]?(\d{1,2})[:.h](\d{1,2})(?:[:.m](\d{1,2}))?/;
      const looseMatch = filename.match(loosePattern);
      
      if (looseMatch) {
        const [_, year, month, day, hour, min, sec = '00'] = looseMatch;
        console.log(`Matched loose pattern in ${filename}: ${year}-${month}-${day} ${hour}:${min}:${sec}`);
        
        // Ensure we're in the correct timezone by using UTC and then getting local date
        const date = new Date(Date.UTC(
          parseInt(year, 10), 
          parseInt(month, 10) - 1, // Month is 0-indexed in JS Date
          parseInt(day, 10),
          parseInt(hour, 10),
          parseInt(min, 10),
          parseInt(sec, 10)
        ));
        
        // Convert UTC to local timezone
        return new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
      }
      
      // ISO-like date pattern: match anything that looks like an ISO date/time
      const isoPattern = /(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})/;
      const isoMatch = filename.match(isoPattern);
      
      if (isoMatch) {
        const [_, year, month, day, hour, min, sec] = isoMatch;
        console.log(`Matched ISO pattern in ${filename}: ${year}-${month}-${day} ${hour}:${min}:${sec}`);
        
        // ISO pattern is already in standard format so we can just construct the date directly
        const date = new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}`);
        return date;
      }
      
      // Additional pattern for test files: test_capture_YYYYMMDD_HHMMSS.jpg
      const testPattern = /test_capture_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/;
      const testMatch = filename.match(testPattern);
      
      if (testMatch) {
        const [_, year, month, day, hour, min, sec] = testMatch;
        console.log(`Matched test pattern in ${filename}: ${year}-${month}-${day} ${hour}:${min}:${sec}`);
        
        // Ensure we're in the correct timezone by using UTC and then getting local date
        const date = new Date(Date.UTC(
          parseInt(year, 10), 
          parseInt(month, 10) - 1, // Month is 0-indexed in JS Date
          parseInt(day, 10),
          parseInt(hour, 10),
          parseInt(min, 10),
          parseInt(sec, 10)
        ));
        
        // Convert UTC to local timezone
        return new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
      }
    } catch (error) {
      console.error('Error extracting date from filename:', error, filename);
    }
    
    // Return null if no pattern matched or if there was an error
    return null;
  };
  
  // Helper function to get the best available date from an image object
  const getBestDate = (image) => {
    if (!image) return new Date();
    
    // First try using the cached extracted date if available
    if (image._extracted_date) {
      try {
        const cachedDate = new Date(image._extracted_date);
        if (!isNaN(cachedDate.getTime())) {
          return cachedDate;
        }
      } catch (error) {
        console.warn('Error using cached extracted date:', error);
      }
    }
    
    // Try extracting date from the filename again if needed
    let fileDate;
    
    // If image is a motion_pir or person_detected file, we know exactly how to extract the date
    if (image.filename.includes('motion_pir_') || image.filename.includes('person_detected_')) {
      // These filenames have a consistent format: prefix_YYYYMMDD_HHMMSS.jpg
      const datePart = image.filename.match(/(\d{8})_(\d{6})/);
      if (datePart) {
        const [_, dateStr, timeStr] = datePart;
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        const hour = timeStr.substring(0, 2);
        const min = timeStr.substring(2, 4);
        const sec = timeStr.substring(4, 6);
        
        fileDate = new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}`);
        console.log(`Extracted specific date from ${image.filename}: ${fileDate.toISOString()}`);
      }
    } else {
      // Use the general extraction function for other file types
      fileDate = extractDateFromFilename(image.filename);
    }
    
    if (fileDate && !isNaN(fileDate.getTime())) {
      // Ensure the date is not wildly in the future or past (within 5 years)
      const now = new Date();
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(now.getFullYear() - 5);
      const fiveYearsFuture = new Date();
      fiveYearsFuture.setFullYear(now.getFullYear() + 5);
      
      if (fileDate >= fiveYearsAgo && fileDate <= fiveYearsFuture) {
        return fileDate;
      } else {
        console.warn(`Date from filename is outside reasonable range: ${fileDate.toISOString()}`);
      }
    }
    
    // If file date doesn't exist or is invalid, try metadata timestamp
    const metadataDate = parseTimestamp(image.timestamp);
    if (metadataDate && !isNaN(metadataDate.getTime())) {
      return metadataDate;
    }
    
    // As a last resort, try to extract timestamp from creation_time if available
    if (image.creation_time) {
      const creationDate = parseTimestamp(image.creation_time);
      if (creationDate && !isNaN(creationDate.getTime())) {
        return creationDate;
      }
    }
    
    // If all else fails, use the current date but log a warning
    console.warn(`Could not determine valid date for image: ${image.filename}`);
    return new Date();
  };

  // Helper function to parse timestamp properly
  const parseTimestamp = (timestamp) => {
    if (!timestamp) {
      return null;
    }
    
    try {
      // Handle various timestamp formats
      if (typeof timestamp === 'string') {
        // Match number-only strings that might be milliseconds
        if (/^\d+$/.test(timestamp)) {
          const milliseconds = parseInt(timestamp, 10);
          // Check if it's seconds (10 digits or less) or milliseconds (13 digits typically)
          if (milliseconds < 10000000000) { // seconds
            return new Date(milliseconds * 1000);
          } else { // milliseconds
            return new Date(milliseconds);
          }
        }
        
        // Handle YYYY-MM-DD HH:MM:SS format (space separator)
        if (timestamp.includes(' ') && !timestamp.includes('T')) {
          const isoFormat = timestamp.replace(' ', 'T');
          const date = new Date(isoFormat);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
        
        // Handle ISO format directly (with T separator)
        if (timestamp.includes('T')) {
          const date = new Date(timestamp);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
        
        // Try to handle MM/DD/YYYY or DD/MM/YYYY format
        if (timestamp.includes('/')) {
          const parts = timestamp.split(/[/\s:]/);
          if (parts.length >= 3) {
            // Try both MM/DD/YYYY and DD/MM/YYYY formats
            let date;
            
            // First try MM/DD/YYYY
            date = new Date(parseInt(parts[2], 10), parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
            if (!isNaN(date.getTime())) {
              return date;
            }
            
            // Then try DD/MM/YYYY
            date = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
            if (!isNaN(date.getTime())) {
              return date;
            }
          }
        }
        
        // Last resort, try using the JS Date constructor directly
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      
      // If it's a number (unix timestamp in seconds or milliseconds)
      else if (typeof timestamp === 'number') {
        // If it's in seconds (10 digits or less), convert to milliseconds
        if (timestamp < 10000000000) {
          return new Date(timestamp * 1000);
        } else {
          return new Date(timestamp);
        }
      }
      
      // If it's a Date object already
      else if (timestamp instanceof Date) {
        return timestamp;
      }
    } catch (error) {
      console.error('Error parsing timestamp:', error, timestamp);
    }
    
    // Return null if all parsing methods failed
    return null;
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
                      onError={(e) => {
                        console.error(`Failed to load image: ${image.url}`);
                        // Set a fallback image or placeholder
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMzAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIGZpbGw9IiM5OTkiPkltYWdlIE5vdCBBdmFpbGFibGU8L3RleHQ+PC9zdmc+';
                      }}
                    />
                    {/* Detection Type Badge */}
                    <Box 
                      sx={{ 
                        position: 'absolute', 
                        top: 8, 
                        left: 8,
                        display: 'flex',
                        flexDirection: 'column',
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
                    </Box>
                    
                    {/* Controls */}
                    <Box 
                      sx={{ 
                        position: 'absolute', 
                        top: 8, 
                        right: 8,
                        display: 'flex',
                        gap: 1
                      }}
                    >
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
                    
                    {/* Filename Badge */}
                    <Box 
                      sx={{ 
                        position: 'absolute', 
                        bottom: 0, 
                        left: 0,
                        right: 0,
                        padding: 1,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0) 100%)',
                        color: 'white',
                        textAlign: 'left'
                      }}
                    >
                      <Typography variant="caption" 
                        sx={{ 
                          fontSize: '0.7rem', 
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {image.filename}
                      </Typography>
                    </Box>
                  </Box>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {getBestDate(image).toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDistanceToNow(getBestDate(image), { addSuffix: true })}
                        </Typography>
                      </Box>
                      <Tooltip title={`File size: ${Math.round(image.size / 1024)} KB`}>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          {Math.round(image.size / 1024)} KB
                        </Typography>
                      </Tooltip>
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
                <Typography variant="h6" gutterBottom sx={{ wordBreak: 'break-all' }}>
                  {selectedImage.filename}
                </Typography>
                <Divider sx={{ my: 1 }} />
                
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  {/* Left Column - Image Information */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>Image Details</Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      <Chip
                        icon={getDetectionTypeIcon(selectedImage.detection_type)}
                        label={getDetectionTypeLabel(selectedImage.detection_type)}
                        color={getDetectionTypeColor(selectedImage.detection_type)}
                        sx={{ mb: 1, mr: 1 }}
                      />
                      <Chip
                        icon={<AccessTimeIcon />}
                        label={formatDistanceToNow(getBestDate(selectedImage), { addSuffix: true })}
                        sx={{ mb: 1 }}
                      />
                    </Box>
                    
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'auto 1fr',
                      gap: '8px 12px', 
                      alignItems: 'center',
                      '& > :nth-of-type(odd)': { 
                        color: 'text.secondary',
                        fontWeight: 'medium',
                      },
                    }}>
                      <Typography variant="body2">Date:</Typography>
                      <Typography variant="body2">
                        {getBestDate(selectedImage).toLocaleDateString()}
                      </Typography>
                      
                      <Typography variant="body2">Time:</Typography>
                      <Typography variant="body2">
                        {getBestDate(selectedImage).toLocaleTimeString()}
                      </Typography>
                      
                      <Typography variant="body2">Size:</Typography>
                      <Typography variant="body2">{Math.round(selectedImage.size / 1024)} KB</Typography>
                      
                      <Typography variant="body2">Path:</Typography>
                      <Typography variant="body2" sx={{ 
                        maxWidth: '100%', 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {selectedImage.url}
                      </Typography>
                    </Box>
                  </Grid>
                  
                  {/* Right Column - Detection Info */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>Detection Information</Typography>
                    
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'auto 1fr',
                      gap: '8px 12px', 
                      alignItems: 'center',
                      '& > :nth-of-type(odd)': { 
                        color: 'text.secondary',
                        fontWeight: 'medium',
                      },
                    }}>
                      <Typography variant="body2">Detection Type:</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {getDetectionTypeIcon(selectedImage.detection_type)}
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          {getDetectionTypeLabel(selectedImage.detection_type)}
                        </Typography>
                      </Box>
                      
                      <Typography variant="body2">Filename Pattern:</Typography>
                      <Typography variant="body2">
                        {selectedImage.detection_type === 'yolo' ? 'person_detected_*' : 
                         selectedImage.detection_type === 'pir' ? 'motion_pir_*' : 
                         selectedImage.detection_type === 'test' ? 'test_capture_*' : 'unknown'}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
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
                    </Box>
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