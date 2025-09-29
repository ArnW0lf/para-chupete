import { v4 as uuidv4 } from 'uuid';
import { COMPONENTS } from '../constants/componentTypes';

/**
 * Crea un nuevo componente del tipo especificado
 * @param {string} type - Tipo de componente
 * @param {number} zIndex - Índice Z del componente
 * @param {Object} overrideProps - Propiedades que sobrescriben las predeterminadas
 * @returns {Object} Nuevo componente
 */
export const createComponent = (type, zIndex, overrideProps = {}) => {
  const config = COMPONENTS[type];
  if (!config) {
    throw new Error(`Tipo de componente desconocido: ${type}`);
  }
  
  return {
    id: uuidv4(),
    type,
    x: overrideProps.x || 50,
    y: overrideProps.y || 50,
    width: overrideProps.width || config.width,
    height: overrideProps.height || config.height,
    props: { ...config.props, ...overrideProps.props },
    zIndex: zIndex,
  };
};

/**
 * Duplica un componente existente
 * @param {Object} component - Componente a duplicar
 * @param {number} zIndex - Nuevo índice Z
 * @returns {Object} Componente duplicado
 */
export const duplicateComponent = (component, zIndex) => {
  return {
    ...component,
    id: uuidv4(),
    x: component.x + 20,
    y: component.y + 20,
    zIndex,
  };
};