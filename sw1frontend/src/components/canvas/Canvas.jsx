import React from 'react';
import { Stage, Layer, Transformer } from 'react-konva';
import CanvasObject from './CanvasObject';
import '../../styles/bulder.css'

/**
 * Componente principal del canvas
 */
const Canvas = ({ 
  components = [], // Valor por defecto para evitar errores
  selectedId, 
  showPreview, 
  stageRef, 
  layerRef, 
  transformerRef,
  onSelect,
  onDragMove,
  onTransform 
}) => {
  // Modificar el handler de arrastre para limitar el movimiento dentro del canvas
  const handleDragMoveWithinBounds = (e, id) => {
    const stage = e.target.getStage();
    const target = e.target;
    
    // Obtener los límites del escenario
    const stageWidth = stage.width();
    const stageHeight = stage.height();
    
    // Obtener el ancho y alto del objeto
    const width = target.width() * target.scaleX();
    const height = target.height() * target.scaleY();
    
    // Limitar la posición dentro de los límites del escenario
    const newPos = {
      x: Math.max(0, Math.min(target.x(), stageWidth - width)),
      y: Math.max(0, Math.min(target.y(), stageHeight - height))
    };
    
    // Actualizar la posición y luego llamar al onDragMove original
    target.position(newPos);
    
    // Llamar al callback original con las coordenadas limitadas
    onDragMove(e, id);
  };

  // Asegurarse de que components sea un array antes de trabajar con él
  const safeComponents = Array.isArray(components) ? components : [];

  return (
    <div className="canvas-container">
      <Stage
        width={1000}
        height={1200} // Aumentado de 600 a 1200 para hacer el canvas más alto
        className={`design-canvas ${showPreview ? 'preview-mode' : ''}`}
        onMouseDown={(e) => {
          if (e.target === e.target.getStage() && !showPreview) {
            onSelect(null);
          }
        }}
        ref={stageRef}
      >
        <Layer ref={layerRef}>
          {safeComponents
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((comp) => (
              <CanvasObject
                key={comp.id}
                component={comp}
                isSelected={selectedId === comp.id}
                isPreview={showPreview}
                onSelect={onSelect}
                onDragMove={handleDragMoveWithinBounds}
                onTransform={onTransform}
              />
            ))}
          {selectedId && !showPreview && (
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                // Límite mínimo de tamaño
                if (newBox.width < 5 || newBox.height < 5) {
                  return oldBox;
                }
                
                // Limitar también el tamaño para que no salga del canvas
                const stage = stageRef.current;
                if (stage) {
                  const stageWidth = stage.width();
                  const stageHeight = stage.height();
                  
                  // Asegurarse de que el objeto no se agrande fuera del canvas
                  if (newBox.x < 0) newBox.width += newBox.x;
                  if (newBox.y < 0) newBox.height += newBox.y;
                  if (newBox.x + newBox.width > stageWidth) newBox.width = stageWidth - newBox.x;
                  if (newBox.y + newBox.height > stageHeight) newBox.height = stageHeight - newBox.y;
                }
                
                return newBox;
              }}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
};

export default Canvas;