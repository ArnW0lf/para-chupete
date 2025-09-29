import React from 'react';
import Button from '../ui/Button';

/**
 * Panel de gestión de capas
 */
const LayersPanel = ({ components, selectedComponentIndex, onSelectComponent, onMoveLayer }) => {
  // Componentes ordenados por índice de capa (de arriba hacia abajo)
  const sortedComponents = [...components].reverse();
  
  const getLayerIcon = (type) => {
    switch (type) {
      case 'text': return 'T';
      case 'button': return 'B';
      case 'input': return 'I';
      case 'rectangle': return 'R';
      case 'image': return 'IMG';
      default: return '▢';
    }
  };
  
  const getLayerName = (comp, index) => {
    const actualIndex = components.length - index - 1;
    
    switch (comp.type) {
      case 'text':
        return `Texto: "${comp.props.text.substring(0, 15)}${comp.props.text.length > 15 ? '...' : ''}"`;
      case 'button':
        return `Botón: "${comp.props.text}"`;
      case 'input':
        return `Input: "${comp.props.placeholder}"`;
      case 'rectangle':
        return `Rectángulo ${actualIndex + 1}`;
      case 'image':
        return `Imagen ${actualIndex + 1}`;
      default:
        return `Componente ${actualIndex + 1}`;
    }
  };

  return (
    <div className="layers-panel">
      <h4>Capas</h4>
      <div className="layer-actions">
        <Button 
          variant="sm"
          onClick={() => onMoveLayer('up')} 
          disabled={selectedComponentIndex === components.length - 1 || selectedComponentIndex === -1}
        >
          Subir capa
        </Button>
        <Button 
          variant="sm"
          onClick={() => onMoveLayer('down')} 
          disabled={selectedComponentIndex === 0 || selectedComponentIndex === -1}
        >
          Bajar capa
        </Button>
      </div>
      <div className="layer-list">
        {sortedComponents.map((comp, index) => {
          const actualIndex = components.length - index - 1;
          return (
            <div 
              key={comp.id} 
              className={`layer-item ${selectedComponentIndex === actualIndex ? 'active' : ''}`}
              onClick={() => onSelectComponent(comp.id)}
            >
              <span className="layer-icon">
                {getLayerIcon(comp.type)}
              </span>
              <span className="layer-name">
                {getLayerName(comp, index)}
              </span>
              <span className="layer-visibility">👁️</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LayersPanel;