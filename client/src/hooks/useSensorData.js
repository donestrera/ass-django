import { useState, useEffect, useCallback } from 'react';

const API_URL = `${import.meta.env.VITE_API_URL}/api`;

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
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchData = useCallback(async () => {
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
        temperature: typeof data.temperature === 'number' ? data.temperature : null,
        humidity: typeof data.humidity === 'number' ? data.humidity : null,
        motionDetected: Boolean(data.motionDetected),
        smokeDetected: Boolean(data.smokeDetected),
        lastUpdate: new Date().toISOString(),
        connected: true,
        pirEnabled: Boolean(data.pirEnabled)
      };

      setSensorData(transformedData);

      // Update motion history if motion is detected
      if (transformedData.motionDetected) {
        const newMotionEvent = {
          timestamp: new Date().toLocaleString(),
          temperature: transformedData.temperature?.toFixed(1),
          humidity: transformedData.humidity?.toFixed(1)
        };
        setMotionHistory(prev => [newMotionEvent, ...prev].slice(0, 50));
      }

      // Update historical data for charts
      setHistoricalData(prev => {
        const newDataPoint = {
          timestamp: new Date().toLocaleString(),
          temperature: transformedData.temperature,
          humidity: transformedData.humidity
        };
        return [...prev, newDataPoint].slice(-50); // Keep last 50 data points
      });

      setLoading(false);
      setRetryCount(0);
    } catch (error) {
      console.error('Error fetching sensor data:', error);
      setError(error.message);
      setLoading(false);

      // Implement exponential backoff for retries
      if (retryCount < 3) {
        const backoffTime = Math.pow(2, retryCount) * 1000;
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchData();
        }, backoffTime);
      }
    }
  }, [retryCount]);

  const togglePirSensor = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_URL}/sensor-data/toggle-pir/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to toggle PIR sensor: ${response.status}`);
      }

      const data = await response.json();
      setSensorData(prev => ({
        ...prev,
        pirEnabled: data.pirEnabled
      }));
    } catch (error) {
      console.error('Error toggling PIR sensor:', error);
      setError(error.message);
    }
  }, []);

  const clearMotionHistory = useCallback(() => {
    setMotionHistory([]);
  }, []);

  // Set up polling interval for real-time updates
  useEffect(() => {
    fetchData(); // Initial fetch

    const intervalId = setInterval(fetchData, 5000); // Poll every 5 seconds

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchData]);

  return {
    sensorData,
    motionHistory,
    historicalData,
    loading,
    error,
    togglePirSensor,
    clearMotionHistory,
    refetch: fetchData
  };
};

export default useSensorData; 