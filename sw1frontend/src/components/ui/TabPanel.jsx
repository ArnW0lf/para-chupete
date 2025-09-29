import React from 'react';
import Button from './Button';

/**
 * Panel de pestañas para la barra lateral
 */
const TabPanel = ({ activePanel, onChangePanel, selectedComponentIndex }) => {
  return (
    <div className="panel-tabs">
      <button
        onClick={() => onChangePanel('components')}
        className={`tab-btn ${activePanel === 'components' ? 'active' : ''}`}
      >
        Componentes
      </button>
      <button
        onClick={() => onChangePanel('properties')}
        className={`tab-btn ${activePanel === 'properties' ? 'active' : ''}`}
        disabled={selectedComponentIndex === -1}
      >
        Propiedades
      </button>
      <button
        onClick={() => onChangePanel('layers')}
        className={`tab-btn ${activePanel === 'layers' ? 'active' : ''}`}
      >
        Capas
      </button>
      <button
        onClick={() => onChangePanel('code')}
        className={`tab-btn ${activePanel === 'code' ? 'active' : ''}`}
      >
        Código
      </button>
    </div>
  );
};

export default TabPanel;