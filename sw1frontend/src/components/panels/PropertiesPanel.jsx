import React from 'react';
import { useComponentProps } from '../../hooks/useComponentProps';

/**
 * Panel de propiedades para editar componentes seleccionados
 */
const PropertiesPanel = ({ selectedComponent, updateCommonProp, updateSpecificProp }) => {
  const { renderCommonProps, renderSpecificProps } = useComponentProps(
    selectedComponent, 
    updateCommonProp, 
    updateSpecificProp
  );
  
  if (!selectedComponent) {
    return <p>Seleccione un componente para editar sus propiedades</p>;
  }
  
  const componentTypeNames = {
    text: 'texto',
    button: 'botón',
    input: 'campo de entrada',
    rectangle: 'rectángulo',
    image: 'imagen'
  };

  return (
    <div className="properties-panel">
      <h4>Propiedades del {componentTypeNames[selectedComponent.type] || 'componente'}</h4>
      <div className="form">
        {renderCommonProps()}
        <hr />
        {renderSpecificProps()}
      </div>
    </div>
  );
};

export default PropertiesPanel;