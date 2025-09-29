import React from 'react';
import Button from '../ui/Button';

/**
 * Controles adicionales para el canvas (zoom, etc.)
 */
const CanvasControls = ({ zoom, onZoomIn, onZoomOut, onResetZoom }) => {
  return (
    <div className="canvas-controls">
      <div className="zoom-controls">
        <Button 
          variant="sm" 
          onClick={onZoomOut}
          title="Reducir zoom"
        >
          -
        </Button>
        <span className="zoom-level">{zoom}%</span>
        <Button 
          variant="sm" 
          onClick={onZoomIn}
          title="Aumentar zoom"
        >
          +
        </Button>
        <Button 
          variant="sm" 
          onClick={onResetZoom}
          title="Restablecer zoom"
        >
          Reset
        </Button>
      </div>
    </div>
  );
};

export default CanvasControls;