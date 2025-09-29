import React from 'react';
import Button from './Button';

/**
 * Barra de herramientas principal
 */
const Toolbar = ({ 
  canUndo, 
  canRedo, 
  hasSelection, 
  showPreview,
  onUndo, 
  onRedo, 
  onDuplicate, 
  onDelete, 
  onSave, 
  onLoad, 
  onTogglePreview 
}) => {
  return (
    <div className="toolbar">
      <div className="logo">🎨 PageBuilder Pro</div>
      <div className="toolbar-actions">
        <Button
          variant="toolbar"
          onClick={onUndo}
          disabled={!canUndo}
          title="Deshacer"
        >
          ↩️ Deshacer
        </Button>
        <Button
          variant="toolbar"
          onClick={onRedo}
          disabled={!canRedo}
          title="Rehacer"
        >
          ↪️ Rehacer
        </Button>
        <div className="separator"></div>
        <Button
          variant="toolbar"
          onClick={onDuplicate}
          disabled={!hasSelection}
          title="Duplicar componente"
        >
          📋 Duplicar
        </Button>
        <Button
          variant="toolbar"
          onClick={onDelete}
          disabled={!hasSelection}
          title="Eliminar componente"
        >
          🗑️ Eliminar
        </Button>
        <div className="separator"></div>
        <Button
          variant="toolbar"
          onClick={onSave}
          title="Guardar diseño"
        >
          💾 Guardar
        </Button>
        <Button
          variant="toolbar"
          onClick={onLoad}
          title="Cargar diseño"
        >
          📂 Cargar
        </Button>
        <div className="separator"></div>
        <Button
          variant="toolbar"
          onClick={onTogglePreview}
          title={showPreview ? "Editar" : "Vista previa"}
          className={showPreview ? 'active' : ''}
        >
          👁️ {showPreview ? "Editar" : "Vista previa"}
        </Button>
      </div>
    </div>
  );
};

export default Toolbar;