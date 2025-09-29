import React from 'react';

/**
 * Componente Button reutilizable
 * @param {Object} props - Props del componente
 * @param {string} props.className - Clases adicionales
 * @param {string} props.variant - Variante del botón (default, primary, etc)
 * @param {boolean} props.disabled - Si el botón está deshabilitado
 * @param {Function} props.onClick - Función al hacer clic
 * @param {React.ReactNode} props.children - Contenido del botón
 * @param {string} props.title - Tooltip del botón
 */
const Button = ({ 
  className = '',
  variant = 'default',
  disabled = false,
  onClick,
  children,
  title,
  ...rest
}) => {
  // Definir clases base según la variante
  const baseClass = 'btn';
  
  let variantClass = '';
  switch (variant) {
    case 'primary':
      variantClass = 'btn-primary';
      break;
    case 'toolbar':
      variantClass = 'toolbar-btn';
      break;
    case 'sm':
      variantClass = 'btn-sm';
      break;
    case 'theme':
      variantClass = 'btn-theme';
      break;
    default:
      variantClass = '';
      break;
  }
  
  const buttonClass = `${baseClass} ${variantClass} ${className}`;
  
  return (
    <button
      className={buttonClass}
      disabled={disabled}
      onClick={onClick}
      title={title}
      {...rest}
    >
      {children}
    </button>
  );
};

export default Button;