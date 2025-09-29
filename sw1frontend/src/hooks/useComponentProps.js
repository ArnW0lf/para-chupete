
  import { useMemo } from 'react';
  import { COMMON_PROPERTIES, COMPONENT_SPECIFIC_PROPERTIES } from '../constants/componentTypes';

  /**
   * Hook para manejar las propiedades de los componentes
   * @param {Object} selectedComponent - Componente seleccionado
   * @param {Function} updateCommonProp - Función para actualizar propiedad común
   * @param {Function} updateSpecificProp - Función para actualizar propiedad específica
   */
  export const useComponentProps = (selectedComponent, updateCommonProp, updateSpecificProp) => {
    // Obtener propiedades específicas según el tipo de componente
    const specificProperties = useMemo(() => {
      if (!selectedComponent) return [];
      return COMPONENT_SPECIFIC_PROPERTIES[selectedComponent.type] || [];
    }, [selectedComponent]);

    // Generar renderizadores de propiedades
    const renderCommonProps = () => {
      if (!selectedComponent) return null;
      
      return COMMON_PROPERTIES.map(prop => (
        <div className="form-group" key={prop.name}>
          <label>{prop.label}:</label>
          <input
            type={prop.type}
            value={selectedComponent[prop.name]}
            onChange={(e) => updateCommonProp(prop.name, Number(e.target.value))}
            className="form-control"
          />
        </div>
      ));
    };

    const renderSpecificProps = () => {
      if (!selectedComponent) return null;
      
      return specificProperties.map(prop => {
        if (prop.type === 'select') {
          return (
            <div className="form-group" key={prop.name}>
              <label>{prop.label}:</label>
              <select
                value={selectedComponent.props[prop.name]}
                onChange={(e) => updateSpecificProp(prop.name, e.target.value)}
                className="form-control"
              >
                {prop.options.map(option => 
                  typeof option === 'string' ? (
                    <option key={option} value={option}>{option}</option>
                  ) : (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  )
                )}
              </select>
            </div>
          );
        }
        
        if (prop.type === 'range') {
          return (
            <div className="form-group" key={prop.name}>
              <label>{prop.label}:</label>
              <input
                type="range"
                min={prop.min || 0}
                max={prop.max || 100}
                step={prop.step || 1}
                value={selectedComponent.props[prop.name]}
                onChange={(e) => updateSpecificProp(prop.name, Number(e.target.value))}
                className="form-control"
              />
            </div>
          );
        }
        
        return (
          <div className="form-group" key={prop.name}>
            <label>{prop.label}:</label>
            <input
              type={prop.type}
              value={selectedComponent.props[prop.name]}
              onChange={(e) => {
                const value = prop.type === 'number' ? Number(e.target.value) : e.target.value;
                updateSpecificProp(prop.name, value);
              }}
              className="form-control"
            />
          </div>
        );
      });
    };

    return {
      renderCommonProps,
      renderSpecificProps
    };
  };