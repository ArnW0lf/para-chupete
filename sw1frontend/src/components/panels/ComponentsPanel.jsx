import React from 'react';
import Button from '../ui/Button';
import { COLOR_THEMES } from '../../constants/themes';

/**
 * Panel de selección de componentes
 */
const ComponentsPanel = ({ onAddComponent, currentTheme, onChangeTheme }) => {
  return (
    <div className="components-panel">
      <h4>Componentes</h4>
      <div className="component-buttons">
        <Button onClick={() => onAddComponent("text")} className="btn">
          Texto
        </Button>
        <Button onClick={() => onAddComponent("button")} className="btn">
          Botón
        </Button>
        <Button onClick={() => onAddComponent("input")} className="btn">
          Input
        </Button>
        <Button onClick={() => onAddComponent("rectangle")} className="btn">
          Rectángulo
        </Button>
        <Button onClick={() => onAddComponent("image")} className="btn">
          Imagen
        </Button>
      </div>
      <hr />
      <h4>Temas de colores</h4>
      <div className="theme-selection">
        {Object.keys(COLOR_THEMES).map(theme => (
          <Button
            key={theme}
            onClick={() => onChangeTheme(theme)}
            className={currentTheme === theme ? 'active' : ''}
            variant="theme"
          >
            {theme.charAt(0).toUpperCase() + theme.slice(1)}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default ComponentsPanel;