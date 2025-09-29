import React, { createContext, useContext } from 'react';
import { useCanvas } from '../hooks/useCanvas';

// Crear contexto
const CanvasContext = createContext();

// Hook personalizado para usar el contexto
export const useCanvasContext = () => {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error('useCanvasContext debe ser usado dentro de un CanvasProvider');
  }
  return context;
};

// Proveedor del contexto
export const CanvasProvider = ({ children }) => {
  const canvasData = useCanvas();
  
  return (
    <CanvasContext.Provider value={canvasData}>
      {children}
    </CanvasContext.Provider>
  );
};