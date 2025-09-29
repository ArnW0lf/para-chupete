import React, { useContext, useState, useEffect } from 'react';
import Button from '../ui/Button';
import { generateAngularPreview } from '../../utils/codeGenerartor';
import { ChatConext } from '../../context/chat/ChatContext';
import { types } from '../../types/types';

/**
 * Panel de código que muestra el código generado
 */
const CodePanel = ({ components, onExportCode }) => {
  const { dispatch, descargarComponenteAngular } = useContext(ChatConext);
  const [preview, setPreview] = useState('// Generando código...');
  const [isGenerating, setIsGenerating] = useState(false);

  // Generar la vista previa cuando cambian los componentes
  useEffect(() => {
    if (components && components.length > 0) {
      const codePreview = generateAngularPreview(components, "header");
      setPreview(codePreview);
    } else {
      setPreview('// No hay componentes para generar código');
    }
  }, [components]);

  // Función para generar el código Angular y actualizar el estado
  const handleGenerateAngular = () => {
    setIsGenerating(true);
    
    try {
      // Importar las funciones de manera dinámica para evitar problemas de circularidad
      import('../../utils/codeGenerartor').then(({ generateAngularCode }) => {
        generateAngularCode(components, "header", dispatch, types);
        setTimeout(() => {
          setIsGenerating(false);
        }, 500);
      });
    } catch (error) {
      console.error('Error al generar código Angular:', error);
      setIsGenerating(false);
    }
  };

  // Función para exportar (descargar como ZIP)
  const handleExportAngular = () => {
    descargarComponenteAngular();
  };

  return (
    <div className="code-panel">
      <h4>Código Angular generado</h4>
      <pre className="code-preview">
        {preview}
      </pre>
      <div className="buttons">
        <Button 
          onClick={handleGenerateAngular}
          className="btn"
          disabled={isGenerating || !components || components.length === 0}
        >
          {isGenerating ? 'Generando...' : 'Generar componente Angular'}
        </Button>
        <Button 
          onClick={handleExportAngular}
          className="btn"
        >
          Descargar como ZIP
        </Button>
        {onExportCode && (
          <Button onClick={onExportCode} className="btn">
            Exportar código
          </Button>
        )}
      </div>
    </div>
  );
};

export default CodePanel;