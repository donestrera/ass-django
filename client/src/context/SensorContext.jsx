import React, { createContext, useContext } from 'react';
import useSensorData from '../hooks/useSensorData';

const SensorContext = createContext(null);

export const useSensor = () => {
  const context = useContext(SensorContext);
  if (!context) {
    throw new Error('useSensor must be used within a SensorProvider');
  }
  return context;
};

export const SensorProvider = ({ children }) => {
  const sensorData = useSensorData();

  return (
    <SensorContext.Provider value={sensorData}>
      {children}
    </SensorContext.Provider>
  );
};

export default SensorContext; 