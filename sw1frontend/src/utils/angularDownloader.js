/**
 * Crea y descarga un archivo ZIP con los archivos del componente Angular
 * @param {Object} componenteAngular - Objeto con el nombre y archivos del componente Angular
 */
export const downloadAngularComponentAsZip = async (componenteAngular) => {
    try {
      // Importar JSZip (asegúrate de tenerlo instalado con: npm install jszip file-saver)
      const JSZip = (await import('jszip')).default;
      const FileSaver = (await import('file-saver')).default;
      
      // Verificar que tengamos todos los archivos necesarios
      if (!componenteAngular.nombre || 
          !componenteAngular.archivoTS || 
          !componenteAngular.archivoHTML || 
          !componenteAngular.archivoCSS || 
          !componenteAngular.archivoSpec) {
        console.error('Faltan archivos del componente Angular');
        return;
      }
      
      // Crear el ZIP
      const zip = new JSZip();
      
      // Crear una carpeta con el nombre del componente
      const carpeta = zip.folder(componenteAngular.nombre);
      
      // Añadir los archivos
      carpeta.file(`${componenteAngular.nombre}.component.ts`, componenteAngular.archivoTS);
      carpeta.file(`${componenteAngular.nombre}.component.html`, componenteAngular.archivoHTML);
      carpeta.file(`${componenteAngular.nombre}.component.css`, componenteAngular.archivoCSS);
      carpeta.file(`${componenteAngular.nombre}.component.spec.ts`, componenteAngular.archivoSpec);
      
      // Generar el contenido ZIP como blob
      const contenidoZip = await zip.generateAsync({ type: 'blob' });
      
      // Descargar el archivo
      FileSaver.saveAs(contenidoZip, `${componenteAngular.nombre}.zip`);
      
      console.log(`Componente '${componenteAngular.nombre}' descargado como ZIP`);
      
    } catch (error) {
      console.error('Error al crear o descargar el ZIP:', error);
    }
  };