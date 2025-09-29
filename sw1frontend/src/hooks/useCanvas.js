import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { COMPONENTS } from '../constants/componentTypes';
import { useHistory } from './useHistory';

/**
 * Hook que maneja la lógica principal del canvas
 */
export const useCanvas = () => {
  const [components, setComponents, undo, redo, historyControls] = useHistory([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedComponentIndex, setSelectedComponentIndex] = useState(-1);
  const [showPreview, setShowPreview] = useState(false);
  const transformerRef = useRef();
  const stageRef = useRef();
  const layerRef = useRef();

  // Método seguro para setear componentes que asegura que sea siempre un array
  const setSafeComponents = (newComponents) => {
    // Asegurarnos de que siempre estamos guardando un array
    const safeComponents = Array.isArray(newComponents) ? newComponents : [];
    setComponents(safeComponents);
  };

  // Actualizar índice del componente seleccionado cuando cambia el ID seleccionado
  useEffect(() => {
    if (selectedId && Array.isArray(components)) {
      const index = components.findIndex(c => c.id === selectedId);
      setSelectedComponentIndex(index);
    } else {
      setSelectedComponentIndex(-1);
    }
  }, [selectedId, components]);

  // Actualizar transformer cuando cambia la selección
  useEffect(() => {
    if (selectedId && transformerRef.current && layerRef.current) {
      const selectedNode = layerRef.current.findOne(node => node.id() === selectedId);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedId]);

  // Agregar nuevo componente
  const addComponent = (type) => {
    const config = COMPONENTS[type];
    const safeComponents = Array.isArray(components) ? components : [];
    
    const newComponent = {
      id: uuidv4(),
      type,
      x: 50,
      y: 50 + (safeComponents.length % 5) * 60,
      width: config.width,
      height: config.height,
      props: { ...config.props },
      zIndex: safeComponents.length,
    };
    
    setSafeComponents([...safeComponents, newComponent]);
    setSelectedId(newComponent.id);
  };

  // Manejar movimiento de componentes
  const handleDragMove = (e, id) => {
    const { x, y } = e.target.position();
    
    if (!Array.isArray(components)) {
      console.warn("components no es un array en handleDragMove");
      return;
    }
    
    setSafeComponents(
      components.map((comp) => (comp.id === id ? { ...comp, x, y } : comp))
    );
  };

  // Manejar cambio de tamaño
  const handleTransform = (e, id) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    
    // Restablecer la escala del nodo
    node.scaleX(1);
    node.scaleY(1);
    
    if (!Array.isArray(components)) {
      console.warn("components no es un array en handleTransform");
      return;
    }
    
    setSafeComponents(
      components.map((comp) =>
        comp.id === id
          ? {
              ...comp,
              x: node.x(),
              y: node.y(),
              width: Math.max(5, node.width() * scaleX),
              height: Math.max(5, node.height() * scaleY),
            }
          : comp
      )
    );
  };

  // Actualizar propiedades del componente
  const updateComponentProps = (propName, value) => {
    if (selectedId && selectedComponentIndex !== -1 && Array.isArray(components)) {
      setSafeComponents(
        components.map((comp, index) =>
          index === selectedComponentIndex
            ? {
                ...comp,
                props: { ...comp.props, [propName]: value },
              }
            : comp
        )
      );
    }
  };

  // Actualizar propiedades comunes del componente (x, y, width, height)
  const updateComponentCommonProps = (propName, value) => {
    if (selectedId && selectedComponentIndex !== -1 && Array.isArray(components)) {
      setSafeComponents(
        components.map((comp, index) =>
          index === selectedComponentIndex
            ? { ...comp, [propName]: value }
            : comp
        )
      );
    }
  };

  // Duplicar componente
  const duplicateComponent = () => {
    if (selectedComponentIndex !== -1 && Array.isArray(components)) {
      const comp = components[selectedComponentIndex];
      const newComponent = {
        ...comp,
        id: uuidv4(),
        x: comp.x + 20,
        y: comp.y + 20,
        zIndex: components.length,
      };
      setSafeComponents([...components, newComponent]);
      setSelectedId(newComponent.id);
    }
  };

  // Eliminar componente
  const deleteComponent = () => {
    if (selectedComponentIndex !== -1 && Array.isArray(components)) {
      setSafeComponents(components.filter((_, index) => index !== selectedComponentIndex));
      setSelectedId(null);
    }
  };

  // Mover capa
  const moveLayer = (direction) => {
    if (selectedComponentIndex !== -1 && Array.isArray(components)) {
      const newIndex = direction === 'up' 
        ? Math.min(components.length - 1, selectedComponentIndex + 1)
        : Math.max(0, selectedComponentIndex - 1);
      
      if (newIndex !== selectedComponentIndex) {
        const newComponents = [...components];
        const [removed] = newComponents.splice(selectedComponentIndex, 1);
        newComponents.splice(newIndex, 0, removed);
        
        // Actualizar zIndex
        const updatedComponents = newComponents.map((comp, idx) => ({
          ...comp,
          zIndex: idx,
        }));
        
        setSafeComponents(updatedComponents);
      }
    }
  };

  return {
    components,
    selectedId,
    selectedComponentIndex,
    showPreview,
    transformerRef,
    stageRef,
    layerRef,
    historyControls: { ...historyControls, undo, redo },
    actions: {
      setSelectedId,
      setShowPreview,
      addComponent,
      handleDragMove,
      handleTransform,  
      updateComponentProps,
      updateComponentCommonProps,
      duplicateComponent,
      deleteComponent,
      moveLayer,
      setComponents: setSafeComponents
    }
  };
};