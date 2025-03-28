import { useState, useEffect, useCallback, useRef } from 'react';
import { debounce } from 'lodash';

const API_URL = `${import.meta.env.VITE_API_URL}/api`;
const POLLING_INTERVAL = 2000; // 2 seconds default polling
const SMOKE_POLLING_INTERVAL = 500; // 500ms polling when smoke is detected
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const MAX_HISTORY_POINTS = 50; // Maximum number of points to keep in history

const useSensorData = () => {
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
  const [historicalData, setHistoricalData] = useState({
    temperature: [],
    humidity: [],
    timestamps: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Use refs for values that shouldn't trigger re-renders
  const intervalRef = useRef(null);
  const abortControllerRef = useRef(null);
  const lastDataRef = useRef(null);

  // Debounced state updates to prevent too frequent re-renders
  const debouncedSetSensorData = useCallback(
    debounce((newData) => {
      setSensorData(prev => {
        // Only update if data has actually changed
        if (JSON.stringify(prev) === JSON.stringify(newData)) {
          return prev;
        }
        return newData;
      });
    }, 100),
    []
  );

  // Update historical data
  const updateHistoricalData = useCallback((newData) => {
    if (typeof newData.temperature === 'number' && typeof newData.humidity === 'number') {
      const timestamp = new Date().toISOString();
      
      setHistoricalData(prev => {
        // Create new arrays with the latest data point
        const newTemp = [...prev.temperature, newData.temperature];
        const newHum = [...prev.humidity, newData.humidity];
        const newTimestamps = [...prev.timestamps, timestamp];
        
        // Keep only the last MAX_HISTORY_POINTS
        if (newTemp.length > MAX_HISTORY_POINTS) {
          return {
            temperature: newTemp.slice(-MAX_HISTORY_POINTS),
            humidity: newHum.slice(-MAX_HISTORY_POINTS),
            timestamps: newTimestamps.slice(-MAX_HISTORY_POINTS)
          };
        }
        
        return {
          temperature: newTemp,
          humidity: newHum,
          timestamps: newTimestamps
        };
      });
    }
  }, []);

  // Fetch motion history from the server
  const fetchMotionHistory = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_URL}/motion-history/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch motion history: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform the data to include detection type and confidence
      const transformedHistory = data.map(item => ({
        id: item.id,
        timestamp: new Date(item.timestamp).toLocaleString(),
        temperature: item.temperature,
        humidity: item.humidity,
        detection_type: item.detection_type || 'pir', // Default to 'pir' for backward compatibility
        confidence: item.confidence,
        is_active: item.is_active
      }));
      
      setMotionHistory(transformedHistory);
    } catch (error) {
      console.error('Error fetching motion history:', error);
    }
  }, []);

  const fetchData = useCallback(async () => {
    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

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
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed');
        }
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform and validate the data
      const transformedData = {
        temperature: typeof data.temperature === 'number' ? Number(data.temperature.toFixed(1)) : null,
        humidity: typeof data.humidity === 'number' ? Number(data.humidity.toFixed(1)) : null,
        motionDetected: Boolean(data.motionDetected),
        smokeDetected: Boolean(data.smokeDetected),
        lastUpdate: data.lastUpdate || null,
        connected: Boolean(data.connected),
        pirEnabled: Boolean(data.pirEnabled)
      };

      // Cache the last successful data
      lastDataRef.current = transformedData;
      
      // Update historical data
      updateHistoricalData(transformedData);
      
      // Use debounced update to prevent too frequent re-renders
      debouncedSetSensorData(transformedData);
      setLoading(false);
      setRetryCount(0);

      // If motion is detected, fetch the updated motion history
      if (transformedData.motionDetected && !sensorData.motionDetected) {
        fetchMotionHistory();
      }

      // Adjust polling interval based on smoke detection
      const newInterval = transformedData.smokeDetected ? SMOKE_POLLING_INTERVAL : POLLING_INTERVAL;
      if (intervalRef.current && newInterval !== intervalRef.current.interval) {
        clearInterval(intervalRef.current.id);
        startPolling(newInterval);
      }

    } catch (err) {
      if (err.name === 'AbortError') {
        return; // Ignore aborted requests
      }
      
      setError(err.message);
      setLoading(false);
      
      // Implement retry logic
      if (retryCount < MAX_RETRIES) {
        setRetryCount(prev => prev + 1);
        setTimeout(fetchData, RETRY_DELAY * (retryCount + 1));
      } else if (lastDataRef.current) {
        // If we have cached data, keep showing it even if we can't fetch new data
        debouncedSetSensorData(lastDataRef.current);
      }
    }
  }, [debouncedSetSensorData, fetchMotionHistory, retryCount, sensorData.motionDetected, updateHistoricalData]);

  const togglePirSensor = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(`${API_URL}/control-pir/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: !sensorData.pirEnabled }),
      });

      if (!response.ok) throw new Error('Failed to toggle PIR sensor');
      
      const data = await response.json();
      setSensorData(prev => ({ ...prev, pirEnabled: data.pirEnabled }));
    } catch (error) {
      console.error('Error toggling PIR sensor:', error);
      setError('Failed to toggle PIR sensor');
    }
  }, [sensorData.pirEnabled]);

  const clearMotionHistory = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(`${API_URL}/clear-motion-history/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to clear motion history');
      
      setMotionHistory([]);
    } catch (error) {
      console.error('Error clearing motion history:', error);
      setError('Failed to clear motion history');
    }
  }, []);

  const startPolling = useCallback((interval) => {
    const id = setInterval(fetchData, interval);
    intervalRef.current = { id, interval };
  }, [fetchData]);

  useEffect(() => {
    fetchData();
    fetchMotionHistory(); // Fetch motion history on initial load
    startPolling(POLLING_INTERVAL);

    return () => {
      // Cleanup
      if (intervalRef.current) {
        clearInterval(intervalRef.current.id);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      debouncedSetSensorData.cancel();
    };
  }, [fetchData, fetchMotionHistory, startPolling, debouncedSetSensorData]);

  return { 
    sensorData, 
    loading, 
    error, 
    refetch: fetchData,
    isRetrying: retryCount > 0,
    motionHistory,
    historicalData,
    togglePirSensor,
    clearMotionHistory,
    refreshMotionHistory: fetchMotionHistory
  };
};

export default useSensorData; 