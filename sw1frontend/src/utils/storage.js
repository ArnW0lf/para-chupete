/**
 * Guarda el diseño actual en localStorage
 * @param {Array} components - Componentes para guardar
 */
export const saveDesign = (components) => {
    try {
      const design = JSON.stringify(components);
      localStorage.setItem('savedDesign', design);
      return { success: true, message: 'Diseño guardado correctamente' };
    } catch (error) {
      console.error('Error al guardar el diseño:', error);
      return { success: false, message: 'Error al guardar el diseño' };
    }
  };
  
  /**
   * Carga un diseño guardado desde localStorage
   * @returns {Object} Objeto con éxito, mensaje y componentes si existe
   */
  export const loadDesign = () => {
    try {
      const savedDesign = localStorage.getItem('savedDesign');
      if (savedDesign) {
        return { 
          success: true, 
          message: 'Diseño cargado correctamente',
          components: JSON.parse(savedDesign)
        };
      } else {
        return { success: false, message: 'No hay diseños guardados' };
      }
    } catch (error) {
      console.error('Error al cargar el diseño:', error);
      return { success: false, message: 'Error al cargar el diseño' };
    }
  };