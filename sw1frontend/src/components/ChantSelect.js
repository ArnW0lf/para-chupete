import React, { useState, useEffect, useRef, useContext } from "react";
import { v4 as uuidv4 } from "uuid";
import './dashboard.css';
import { SocketContext } from "../context/SocketContext";
import { ChatConext } from "../context/chat/ChatContext";
import { fetchConnToken } from "../helpers/fetch";

// Componente para representar una tabla (similar a UmlClass)
const TableComponent = ({
  tableData,
  isSelected,
  isRelationSource,
  onMouseDown,
  onDoubleClick,
  onNameChange,
  onColumnChange,
  onAddColumn,
  onDeleteColumn,
  onSetPrimaryKey,
  editingTarget,
  setEditingId
}) => {
  const nameInputRef = useRef(null);

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onMouseDown(e, tableData.id);
  };

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (nameInputRef.current && nameInputRef.current.value.trim()) {
      onNameChange(tableData.id, nameInputRef.current.value);
    }
  };

  const isEditingName = editingTarget === `${tableData.id}-name`;
  const isEditingColumn = (columnId) => editingTarget === `${tableData.id}-${columnId}`;

  // Tipos de datos comunes para base de datos
  const commonDataTypes = [
    'INT', 'VARCHAR(255)', 'TEXT', 'DATE', 'DATETIME',
    'DECIMAL(10,2)', 'BOOLEAN', 'FLOAT', 'TIMESTAMP'
  ];

  return (
    <div
      className={`uml-class-box ${isSelected ? 'active' : ''} ${isRelationSource ? 'relation-source' : ''}`}
      style={{
        position: 'absolute',
        top: `${tableData.top}px`,
        left: `${tableData.left}px`,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="uml-class-name" onDoubleClick={() => onDoubleClick('name')}>
        {isEditingName ? (
          <form onSubmit={handleNameSubmit} className="name-edit-form">
            <input
              ref={nameInputRef}
              type="text"
              name="nameInput"
              defaultValue={tableData.name}
              onBlur={handleNameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.target.blur();
                } else if (e.key === 'Escape') {
                  setEditingId(null);
                  e.target.blur();
                }
              }}
              className="uml-name-input"
              placeholder="Nombre de la tabla"
              autoFocus
            />
          </form>
        ) : (
          <span>{tableData.name}</span>
        )}
      </div>

      <div className="uml-table-columns">
        {tableData.columns.map(col => {
          const editingThisColumn = isEditingColumn(col.id);

          return (
            <div key={col.id} className="uml-table-column">
              {editingThisColumn ? (
                <div className="column-editing">
                  <input
                    type="text"
                    defaultValue={col.name}
                    className="uml-column-input name-input"
                    onBlur={(e) => onColumnChange(tableData.id, col.id, 'name', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.target.blur();
                      } else if (e.key === 'Escape') {
                        setEditingId(null);
                        e.target.blur();
                      }
                    }}
                    placeholder="Nombre de columna"
                    autoFocus
                  />

                  <select
                    value={col.type}
                    className="uml-column-input type-select"
                    onChange={(e) => onColumnChange(tableData.id, col.id, 'type', e.target.value)}
                    onBlur={() => setEditingId(null)}
                  >
                    {commonDataTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>

                  <div className="column-actions">
                    <button
                      type="button"
                      className={`set-pk-btn`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetPrimaryKey(tableData.id, col.id);
                      }}
                      title={col.constraints.includes('PK') ? 'Clave primaria' : 'Establecer como clave primaria'}
                    >
                      PK
                    </button>
                    {!col.constraints.includes('PK') && (
                      <button
                        className="delete-column-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteColumn(tableData.id, col.id);
                        }}
                        title="Eliminar columna"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className="column-display"
                  onDoubleClick={() => onDoubleClick(col.id)}
                >
                  <span className="column-name">{col.name || 'sin nombre'}</span>
                  <span className="column-type">{col.type || 'sin tipo'}</span>
                  <div className="column-actions">
                    {col.constraints.includes('PK') && (
                      <span className="column-pk" title="Clave primaria">PK</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div className="add-column-row">
          <button
            className="add-column-btn"
            onClick={(e) => {
              e.stopPropagation();
              onAddColumn(tableData.id);
            }}
            title="Añadir nueva columna"
          >
            + Añadir columna
          </button>
        </div>
      </div>

      {isRelationSource && <div className="relation-source-indicator"></div>}
    </div>
  );
};

// Función para calcular dimensiones de una tabla
const getTableDimensions = (tableData) => {
  const TABLE_WIDTH = 200;
  const TABLE_HEADER_HEIGHT = 30;
  const TABLE_ROW_HEIGHT = 25;
  const TABLE_HEIGHT = TABLE_HEADER_HEIGHT + (tableData.columns.length * TABLE_ROW_HEIGHT);

  return { width: TABLE_WIDTH, height: TABLE_HEIGHT };
};

// Función para calcular el centro de una tabla
const getTableCenter = (tableData) => {
  const { width, height } = getTableDimensions(tableData);
  return {
    x: tableData.left + width / 2,
    y: tableData.top + height / 2
  };
};

// Función para calcular punto de intersección con el borde de la tabla (MEJORADA)
const getIntersectionPoint = (tableData, fromX, fromY) => {
  const { width, height } = getTableDimensions(tableData);
  const left = tableData.left;
  const top = tableData.top;
  const right = left + width;
  const bottom = top + height;

  const centerX = left + width / 2;
  const centerY = top + height / 2;

  // Calcular dirección desde el centro de la tabla al punto externo
  const dx = fromX - centerX;
  const dy = fromY - centerY;

  // Calcular la intersección con el borde del rectángulo
  let intersectX, intersectY;

  if (Math.abs(dx) * height > Math.abs(dy) * width) {
    // La línea es más horizontal
    intersectX = dx > 0 ? right : left;
    intersectY = centerY + dy * (width / 2) / Math.abs(dx);
  } else {
    // La línea es más vertical
    intersectY = dy > 0 ? bottom : top;
    intersectX = centerX + dx * (height / 2) / Math.abs(dy);
  }

  return { x: intersectX, y: intersectY };
};

// Función para determinar la dirección normal al borde
const getBorderDirection = (tableData, intersectX, intersectY) => {
  const { width, height } = getTableDimensions(tableData);
  const tolerance = 1; // Tolerancia para detectar el borde
  if (Math.abs(intersectX - tableData.left) < tolerance) return 'left';
  if (Math.abs(intersectX - (tableData.left + width)) < tolerance) return 'right';
  if (Math.abs(intersectY - tableData.top) < tolerance) return 'up';
  if (Math.abs(intersectY - (tableData.top + height)) < tolerance) return 'down';
  return 'right'; // Fallback
};

// Componente para renderizar relaciones entre tablas CON LÍNEAS ORTOGONALES
const RelationshipLayer = ({ relationships, tables }) => {
  return (
    <svg className="relation-svg" style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none'
    }}>
      {relationships.map((rel) => {
        // CORRECCIÓN: Añadir compatibilidad para la estructura de datos antigua y nueva.
        const fromTableId = rel.fromTableId || rel.fromComponentId;
        const toTableId = rel.toTableId || rel.endComponentId;
        const fromTable = tables.find(t => t.id === fromTableId);
        const toTable = tables.find(t => t.id === toTableId);

        if (!fromTable || !toTable) return null;

        // Usar los centros para la lógica interna
        const startCenter = getTableCenter(fromTable);
        const endCenter = getTableCenter(toTable);

        // Calcular puntos de intersección reales con los bordes de las tablas
        const startIntersection = getIntersectionPoint(fromTable, endCenter.x, endCenter.y);
        const endIntersection = getIntersectionPoint(toTable, startCenter.x, startCenter.y);

        // Calcular puntos para la línea ortogonal (usando los puntos de intersección)
        const midX = (startIntersection.x + endIntersection.x) / 2;
        const points = [
          { x: startIntersection.x, y: startIntersection.y },
          { x: midX, y: startIntersection.y },
          { x: midX, y: endIntersection.y },
          { x: endIntersection.x, y: endIntersection.y }
        ];

        // Función para determinar la dirección del segmento en un punto específico
        const getSegmentDirection = (pointIndex) => {
          if (pointIndex >= points.length - 1) return 'right';

          const current = points[pointIndex];
          const next = points[pointIndex + 1];

          const dx = next.x - current.x;
          const dy = next.y - current.y;

          if (Math.abs(dx) > Math.abs(dy)) {
            return dx > 0 ? 'right' : 'left';
          } else {
            return dy > 0 ? 'down' : 'up';
          }
        };

        // Función para calcular la posición exacta del símbolo basado en la dirección del segmento
        const getSymbolPosition = (point, direction, offset = 0) => {
          switch (direction) {
            case 'right':
              return { x: point.x + offset, y: point.y };
            case 'left':
              return { x: point.x - offset, y: point.y };
            case 'down':
              return { x: point.x, y: point.y + offset };
            case 'up':
              return { x: point.x, y: point.y - offset };
            default:
              return point;
          }
        };

        // Función mejorada para dibujar símbolos de cardinalidad
        const getCardinalitySymbol = (position, direction, isMany) => {
          const { x, y } = position;

          if (isMany) {
            // Símbolo de "Muchos" (Pata de gallo)
            switch (direction) {
              case 'right':
                return (
                  <g transform={`translate(${x},${y})`}>
                    <line x1="0" y1="-6" x2="0" y2="6" stroke="black" strokeWidth="2" />
                    <line x1="0" y1="-6" x2="6" y2="0" stroke="black" strokeWidth="2" />
                    <line x1="0" y1="6" x2="6" y2="0" stroke="black" strokeWidth="2" />
                  </g>
                );
              case 'left':
                return (
                  <g transform={`translate(${x},${y})`}>
                    <line x1="0" y1="-6" x2="0" y2="6" stroke="black" strokeWidth="2" />
                    <line x1="0" y1="-6" x2="-6" y2="0" stroke="black" strokeWidth="2" />
                    <line x1="0" y1="6" x2="-6" y2="0" stroke="black" strokeWidth="2" />
                  </g>
                );
              case 'down':
                return (
                  <g transform={`translate(${x},${y})`}>
                    <line x1="-6" y1="0" x2="6" y2="0" stroke="black" strokeWidth="2" />
                    <line x1="-6" y1="0" x2="0" y2="6" stroke="black" strokeWidth="2" />
                    <line x1="6" y1="0" x2="0" y2="6" stroke="black" strokeWidth="2" />
                  </g>
                );
              case 'up':
                return (
                  <g transform={`translate(${x},${y})`}>
                    <line x1="-6" y1="0" x2="6" y2="0" stroke="black" strokeWidth="2" />
                    <line x1="-6" y1="0" x2="0" y2="-6" stroke="black" strokeWidth="2" />
                    <line x1="6" y1="0" x2="0" y2="-6" stroke="black" strokeWidth="2" />
                  </g>
                );
              default:
                return null;
            }
          } else {
            // Símbolo de "Uno" (Línea simple)
            switch (direction) {
              case 'right':
              case 'left':
                return <line x1={x} y1={y - 6} x2={x} y2={y + 6} stroke="black" strokeWidth="2" />;
              case 'up':
              case 'down':
                return <line x1={x - 6} y1={y} x2={x + 6} y2={y} stroke="black" strokeWidth="2" />;
              default:
                return null;
            }
          }
        };

        // Obtener direcciones de los segmentos inicial y final
        const startDirection = getSegmentDirection(0); // Dirección del primer segmento
        const endDirection = getSegmentDirection(points.length - 2); // Dirección del último segmento

        // CORRECCIÓN: Acortar la línea para que el símbolo se dibuje en el borde.
        // El símbolo se dibujará en el punto de intersección real.
        const symbolOffset = 15; // Espacio que ocupará el símbolo.
        const startSymbolPos = points[0]; // El símbolo va en el borde.
        const endSymbolPos = points[points.length - 1]; // El símbolo va en el borde.
        points[0] = getSymbolPosition(points[0], startDirection, -symbolOffset); // Acortar la línea.
        points[points.length - 1] = getSymbolPosition(points[points.length - 1], endDirection, -symbolOffset); // Acortar la línea.

        // Determinar qué símbolos usar según el tipo de relación
        let startSymbol, endSymbol;

        if (rel.type === 'one-to-one') {
          startSymbol = getCardinalitySymbol(startSymbolPos, startDirection, false);
          endSymbol = getCardinalitySymbol(endSymbolPos, endDirection, false);
        } else if (rel.type === 'one-to-many') {
          startSymbol = getCardinalitySymbol(startSymbolPos, startDirection, false);
          endSymbol = getCardinalitySymbol(endSymbolPos, endDirection, true);
        } else if (rel.type === 'many-to-many') {
          startSymbol = getCardinalitySymbol(startSymbolPos, startDirection, true);
          endSymbol = getCardinalitySymbol(endSymbolPos, endDirection, true);
        } else {
          // Lógica para nuevos tipos de relación UML
          const isDashed = rel.type === 'dependency' || rel.type === 'realization';
          const strokeDasharray = isDashed ? "8, 8" : "none";

          // El símbolo de inicio (origen) para Agregación y Composición
          if (rel.type === 'aggregation' || rel.type === 'composition') {
            startSymbol = (
              <g transform={`translate(${startSymbolPos.x}, ${startSymbolPos.y}) rotate(${getRotationAngle(startDirection)})`}>
                <polygon
                  points="-10,0 0,6 10,0 0,-6"
                  fill={rel.type === 'composition' ? 'black' : 'white'}
                  stroke="black"
                  strokeWidth="2"
                />
              </g>
            );
          }

          // El símbolo de fin (destino) para Herencia, Dependencia y Asociación
          if (['generalization', 'realization', 'dependency', 'association'].includes(rel.type)) {
            endSymbol = (
              <g transform={`translate(${endSymbolPos.x}, ${endSymbolPos.y}) rotate(${getRotationAngle(endDirection)})`}>
                <polygon
                  points={rel.type === 'generalization' || rel.type === 'realization' ? "-12,7 0,0 -12,-7" : "-10,5 0,0 -10,-5"}
                  fill={rel.type === 'generalization' ? 'white' : 'none'}
                  stroke="black"
                  strokeWidth="2"
                />
              </g>
            );
          }

          // Sobrescribir el return para manejar líneas punteadas y símbolos UML
          return <UmlRelationship key={rel.id} points={points} strokeDasharray={strokeDasharray} startSymbol={startSymbol} endSymbol={endSymbol} />;
        }

        return (
          <g key={rel.id}>
            {/* Línea principal ORTOGONAL */}
            <polyline
              points={points.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="black"
              strokeWidth="2"
              strokeDasharray={rel.type === 'dependency' ? "8, 8" : "none"}
            />

            {/* Símbolos de cardinalidad en las posiciones correctas */}
            {startSymbol}
            {endSymbol}

            {/* Puntos de referencia para debugging (opcional) */}
            <circle cx={startIntersection.x} cy={startIntersection.y} r="3" fill="blue" opacity="0.3" />
            <circle cx={endIntersection.x} cy={endIntersection.y} r="3" fill="red" opacity="0.3" />
          </g>
        );
      })}
    </svg>
  );
};

// Componente específico para relaciones UML para mayor claridad
const UmlRelationship = ({ key, points, strokeDasharray, startSymbol, endSymbol }) => {
  return (
    <g key={key}>
      <polyline
        points={points.map(p => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke="black"
        strokeWidth="2"
        strokeDasharray={strokeDasharray}
      />
      {startSymbol}
      {endSymbol}
    </g>
  );
};

// Función para obtener el ángulo de rotación para los símbolos
const getRotationAngle = (direction) => {
  switch (direction) {
    case 'left':
      return 180;
    case 'down':
      return 90;
    case 'up':
      return 270;
    case 'right':
    default:
      return 0;
  }
};

// Función para generar una previsualización del código Spring Boot
const generateSpringBootCodePreview = (tables, relationships) => {
  if (!tables || tables.length === 0) {
    return "// No hay tablas para generar código.";
  }

  let code = "// Previsualización de Código Spring Boot (Entidades)\n\n";
  const tableMap = new Map(tables.map(t => [t.id, t]));

  // Mapa para construir el contenido de cada entidad
  const entityContents = new Map();

  // 1. Primera pasada: Generar atributos base de cada entidad
  for (const table of tables) {
    const entityName = table.name;
    let imports = new Set(['import javax.persistence.*;']);
    let attributes = '';
    const pkColumn = table.columns.find(c => c.constraints.includes('PK'));

    if (pkColumn) {
      attributes += `    @Id\n`;
      attributes += `    @GeneratedValue(strategy = GenerationType.IDENTITY)\n`;
      attributes += `    private Long ${pkColumn.name};\n\n`;
    } else {
      attributes += `    // ADVERTENCIA: No se ha definido una Clave Primaria (PK).\n`;
    }

    for (const col of table.columns) {
      if (!col.constraints.includes('PK')) {
        // Simplificación para el tipo de dato
        const javaType = col.type.includes('VARCHAR') || col.type.includes('TEXT') ? 'String' :
          col.type.includes('INT') ? 'Integer' :
            col.type.includes('DECIMAL') || col.type.includes('FLOAT') ? 'Double' :
              col.type.includes('DATE') ? 'java.time.LocalDate' :
                col.type.includes('BOOLEAN') ? 'Boolean' : 'Object';

        if (javaType.includes('LocalDate')) {
          imports.add('import java.time.LocalDate;');
        }

        attributes += `    private ${javaType} ${col.name};\n`;
      }
    }
    entityContents.set(entityName, { imports, attributes, relations: '' });
  }

  // 2. Segunda pasada: Añadir relaciones
  for (const rel of relationships) {
    const fromTable = tableMap.get(rel.fromTableId);
    const toTable = tableMap.get(rel.toTableId);

    if (fromTable && toTable) {
      const startEntity = entityContents.get(fromTable.name);
      const endEntityName = toTable.name;
      const endEntityNameLower = endEntityName.charAt(0).toLowerCase() + endEntityName.slice(1);

      if (startEntity) {
        let annotation = '';
        switch (rel.type) {
          case 'one-to-one':
            annotation = `\n    @OneToOne\n    private ${endEntityName} ${endEntityNameLower};`;
            break;
          case 'one-to-many':
            startEntity.imports.add('import java.util.List;');
            annotation = `\n    @OneToMany\n    private List<${endEntityName}> ${endEntityNameLower}s;`;
            break;
          case 'many-to-many':
            startEntity.imports.add('import java.util.List;');
            annotation = `\n    @ManyToMany\n    private List<${endEntityName}> ${endEntityNameLower}s;`;
            break;
          // --- INICIO DE LA CORRECCIÓN ---
          // Añadir lógica UML a la vista previa para consistencia.
          case 'association':
          case 'aggregation':
          case 'composition':
            // Tratar como One-to-Many por defecto en la vista previa.
            startEntity.imports.add('import java.util.List;');
            annotation = `\n    @OneToMany\n    private List<${endEntityName}> ${endEntityNameLower}s;`;
            break;
          case 'generalization':
            // La herencia no añade un campo, pero se podría añadir un comentario.
            // Por ahora, no se hace nada para mantenerlo simple.
            break;
          // --- FIN DE LA CORRECCIÓN ---
          default:
            // El 'default' anterior para many-to-one era incorrecto. Se elimina.
            console.log(`Tipo de relación no manejado en la vista previa: ${rel.type}`);
        }
        startEntity.relations += annotation;
      }
    }
  }

  // 3. Tercera pasada: Construir el string final
  for (const [entityName, content] of entityContents.entries()) {
    const importStatements = Array.from(content.imports).map(i => `${i};`).join('\n');
    code += `${importStatements}\n\n@Entity\npublic class ${entityName} {\n\n${content.attributes}${content.relations}\n}\n\n`;
  }

  return code;
};

// Componente principal modificado
export const ChantSelect = () => {
  const { socket } = useContext(SocketContext);
  const { chatState } = useContext(ChatConext);

  const [tables, setTables] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [activePanel, setActivePanel] = useState('components');
  const [relationshipStartPoint, setRelationshipStartPoint] = useState(null);
  const [activeTool, setActiveTool] = useState('select');
  const [showPreview, setShowPreview] = useState(false);
  const [editingTarget, setEditingTarget] = useState(null);
  const [relationType, setRelationType] = useState('one-to-many');

  const [mode, setMode] = useState({ name: 'IDLE' });
  const initialPos = useRef({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  // Cargar datos del grupo activo
  useEffect(() => {
    if (chatState.grupoActivo && chatState.contenidoGrupo) {
      const savedContent = chatState.contenidoGrupo;
      setTables(savedContent.tables || savedContent.components || []);
      setRelationships(savedContent.relationships || []);
    } else {
      setTables([]);
      setRelationships([]);
    }
  }, [chatState.grupoActivo, chatState.contenidoGrupo]);

  // Escuchar cambios de otros usuarios
  useEffect(() => {
    if (socket) {
      const handleDiagramUpdate = (data) => {
        // Asegurarse de que la actualización es para el grupo activo y no es un eco del propio cliente.
        if (data.groupId === chatState.grupoActivo && data.senderId !== socket.id) {
          setTables(data.tables || []);
          setRelationships(data.relationships || []);
        }
      };
      socket.on('diagram:updated', handleDiagramUpdate);
    }
    return () => {
      if (socket) {
        socket.off('diagram:updated');
      }
    };
  }, [socket, chatState.grupoActivo]);

  // Historial
  const history = useRef([{ tables: [], relationships: [] }]);
  const historyIndex = useRef(0);

  const updateDesignAndHistory = (newTables, newRelationships, isIntermediate = false) => {
    const currentDesign = history.current[historyIndex.current];
    if (JSON.stringify(newTables) === JSON.stringify(currentDesign.tables) &&
      JSON.stringify(newRelationships) === JSON.stringify(currentDesign.relationships)) {
      return;
    }

    setTables(newTables);
    setRelationships(newRelationships);

    if (!isIntermediate) {
      const newHistory = history.current.slice(0, historyIndex.current + 1);
      newHistory.push({ tables: newTables, relationships: newRelationships });
      history.current = newHistory;
      historyIndex.current = newHistory.length - 1;
    }

    // Transmitir por socket si hay un grupo activo
    if (chatState.grupoActivo && !isIntermediate) {
      setTimeout(() => {
        socket.emit('diagram:update', {
          groupId: chatState.grupoActivo,
          tables: newTables,
          relationships: newRelationships,
          senderId: socket.id // Incluir senderId para evitar ecos
        });
      }, 0);
    }
  };

  const undo = () => {
    if (historyIndex.current > 0) {
      historyIndex.current--;
      const design = history.current[historyIndex.current];
      setTables(design.tables);
      setRelationships(design.relationships);
    }
  };

  const redo = () => {
    if (historyIndex.current < history.current.length - 1) {
      historyIndex.current++;
      const design = history.current[historyIndex.current];
      setTables(design.tables);
      setRelationships(design.relationships);
    }
  };

  // Añadir nueva tabla
  const addTable = (position) => {
    const newTable = {
      id: `table-${Date.now()}`,
      name: `NuevaTabla${tables.length + 1}`,
      columns: [
        {
          id: `col-${Date.now()}`,
          name: 'id',
          type: 'INT',
          constraints: ['PK']
        },
        {
          id: `col-${Date.now() + 1}`,
          name: 'nombre',
          type: 'VARCHAR(255)',
          constraints: []
        },
      ],
      top: position.y,
      left: position.x,
    };

    updateDesignAndHistory([...tables, newTable], relationships);
    setSelectedId(newTable.id);
    setActiveTool('select');
    setEditingTarget(`${newTable.id}-name`);
  };

  // Manejar creación de relaciones
  const handleStartRelation = () => {
    if (selectedId && tables.find(t => t.id === selectedId)) {
      setMode({ name: 'DRAWING_RELATION', startTableId: selectedId });
      setActiveTool('relationship');
    }
  };

  const handleRelationshipCreation = (endTable) => {
    if (!mode.startTableId || mode.startTableId === endTable.id) {
      setMode({ name: 'IDLE' });
      return;
    }

    const startTable = tables.find(t => t.id === mode.startTableId);
    if (!startTable) return;

    const startCenter = getTableCenter(startTable);
    const endCenter = getTableCenter(endTable);

    const newRelationship = {
      id: `rel-${Date.now()}`,
      type: relationType,
      fromTableId: startTable.id,
      toTableId: endTable.id,
      x1: startCenter.x,
      y1: startCenter.y,
      x2: endCenter.x,
      y2: endCenter.y
    };

    updateDesignAndHistory(tables, [...relationships, newRelationship]);
    setMode({ name: 'IDLE' });
    setActiveTool('select');
    setSelectedId(newRelationship.id);
  };

  // Manejar eventos del canvas
  const handleCanvasClick = (e) => {
    if (e.target === canvasRef.current) {
      if (activeTool === 'class') {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        addTable({ x, y });
      }

      if (activeTool === 'relationship') {
        setMode({ name: 'IDLE' });
        setActiveTool('select');
      }

      if (activeTool === 'select') {
        setSelectedId(null);
        setEditingTarget(null);
        setMode({ name: 'IDLE' });
      }
    }
  };

  // Manejar arrastre de tablas
  const handleMouseDownOnTable = (e, tableId) => {
    e.stopPropagation();

    if (mode.name === 'DRAWING_RELATION') {
      if (mode.startTableId && mode.startTableId !== tableId) {
        handleRelationshipCreation(tables.find(t => t.id === tableId));
      }
    } else {
      setMode({ name: 'DRAGGING', tableId });
      const canvasRect = canvasRef.current.getBoundingClientRect();
      initialPos.current = {
        x: e.clientX - canvasRect.left,
        y: e.clientY - canvasRect.top,
      };
      setSelectedId(tableId);
    }
  };

  const handleMouseMove = (e) => {
    if (mode.name !== 'DRAGGING') return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - canvasRect.left;
    const currentY = e.clientY - canvasRect.top;

    const deltaX = currentX - initialPos.current.x;
    const deltaY = currentY - initialPos.current.y;

    const newTables = tables.map(table => {
      if (table.id === mode.tableId) {
        return {
          ...table,
          left: table.left + deltaX,
          top: table.top + deltaY
        };
      }
      return table;
    });

    setTables(newTables);
    initialPos.current = { x: currentX, y: currentY };
  };

  const handleMouseUp = () => {
    if (mode.name === 'DRAGGING') {
      setMode({ name: 'TABLE_SELECTED', tableId: mode.tableId });
      // Guardar en historial y emitir al soltar
      updateDesignAndHistory(tables, relationships);
    }
  };

  // Funciones para modificar tablas (se mantienen igual)
  const handleNameChange = (tableId, newName) => {
    const newTables = tables.map(table =>
      table.id === tableId ? { ...table, name: newName } : table
    );
    updateDesignAndHistory(newTables, relationships);
    setEditingTarget(null);
  };

  const handleColumnChange = (tableId, columnId, field, newValue) => {
    const newTables = tables.map(table => {
      if (table.id === tableId) {
        const newColumns = table.columns.map(col =>
          col.id === columnId ? { ...col, [field]: newValue } : col
        );
        return { ...table, columns: newColumns };
      }
      return table;
    });
    updateDesignAndHistory(newTables, relationships);
  };

  const handleAddColumn = (tableId) => {
    const newTables = tables.map(table => {
      if (table.id === tableId) {
        const newColumn = {
          id: `col-${Date.now()}`,
          name: 'nueva_columna',
          type: 'VARCHAR(255)',
          constraints: []
        };
        return { ...table, columns: [...table.columns, newColumn] };
      }
      return table;
    });
    updateDesignAndHistory(newTables, relationships);
    setEditingTarget(`${tableId}-col-${Date.now()}`);
  };

  const handleDeleteColumn = (tableId, columnId) => {
    const newTables = tables.map(table => {
      if (table.id === tableId) {
        const newColumns = table.columns.filter(col =>
          !(col.id === columnId && !col.constraints.includes('PK'))
        );
        return { ...table, columns: newColumns };
      }
      return table;
    });
    updateDesignAndHistory(newTables, relationships);
  };

  const handleSetPrimaryKey = (tableId, columnId) => {
    const newTables = tables.map(table => {
      if (table.id === tableId) {
        const newColumns = table.columns.map(col => ({
          ...col,
          constraints: col.constraints.filter(c => c !== 'PK')
        }));

        const column = newColumns.find(col => col.id === columnId);
        if (column) {
          column.constraints.push('PK');
        }

        return { ...table, columns: newColumns };
      }
      return table;
    });
    updateDesignAndHistory(newTables, relationships);
  };

  const handleDeleteTable = () => {
    if (selectedId) {
      const newTables = tables.filter(t => t.id !== selectedId);
      const newRelationships = relationships.filter(rel =>
        rel.fromTableId !== selectedId && rel.toTableId !== selectedId
      );
      updateDesignAndHistory(newTables, newRelationships);
      setSelectedId(null);
      setMode({ name: 'IDLE' });
    }
  };

  const duplicateTable = () => {
    if (selectedId) {
      const tableToDuplicate = tables.find(t => t.id === selectedId);
      if (tableToDuplicate) {
        const newTable = {
          ...tableToDuplicate,
          id: `table-${Date.now()}`,
          top: tableToDuplicate.top + 20,
          left: tableToDuplicate.left + 20
        };
        updateDesignAndHistory([...tables, newTable], relationships);
        setSelectedId(newTable.id);
      }
    }
  };

  const handleSaveDiagram = async () => {
    if (!chatState.grupoActivo) return alert('No hay grupo seleccionado');

    try {
      const payload = {
        contenidoCanvas: {
          tables: tables,
          relationships: relationships,
          canvasWidth: 1000,
          canvasHeight: 2000
        }
      };

      const token = localStorage.getItem('token') || '';
      const url = `${process.env.REACT_APP_API_URL}/grupos/${chatState.grupoActivo}/canvas`;

      console.log('Enviando datos al servidor:', payload);

      const resp = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-token': token
        },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(`Error ${resp.status}: ${errorText}`);
      }

      const body = await resp.json();

      if (body.ok) {
        alert('¡Diagrama guardado!');
      } else {
        alert(`Error: ${body.msg}`);
      }
    } catch (error) {
      console.error('Error de conexión al guardar:', error);
      alert(`Error de conexión al guardar: ${error.message}`);
    }
  };

  const handleExportCode = async () => {
    if (!chatState.grupoActivo) {
      return alert('Por favor, seleccione un grupo para generar el código.');
    }

    try {
      const token = localStorage.getItem('token') || '';
      const resp = await fetch(`${process.env.REACT_APP_API_URL}/grupos/${chatState.grupoActivo}/generar`, {
        method: 'GET',
        headers: {
          'x-token': token,
        },
      });

      if (!resp.ok) {
        // Leer el cuerpo del error una sola vez como texto.
        const errorText = await resp.text();
        try {
          // Intentar parsear el texto como JSON.
          const jsonError = JSON.parse(errorText);
          throw new Error(jsonError.msg || 'Error desconocido en el servidor.');
        } catch (e) {
          // Si falla el parseo, es porque el error no era JSON (probablemente HTML).
          throw new Error(`Error del servidor: ${errorText.substring(0, 100)}...`);
        }
      }

      // Obtener el nombre del archivo desde los headers si está disponible
      const contentDisposition = resp.headers.get('content-disposition');
      let filename = 'proyecto.zip';
      if (contentDisposition && contentDisposition.indexOf('attachment') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(contentDisposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error al exportar el código:', error);
      alert(`No se pudo exportar el código: ${error.message}`);
    }
  };

  return (
    <div className="page-builder">
      <div className="toolbar">
        <div className="logo">🎨 PageBuilder Pro</div>
        <div className="toolbar-actions">
          <button onClick={undo} disabled={historyIndex.current === 0} className="toolbar-btn">
            ↩️ Deshacer
          </button>
          <button onClick={redo} disabled={historyIndex.current >= history.current.length - 1} className="toolbar-btn">
            ↪️ Rehacer
          </button>
          <div className="separator"></div>
          <button onClick={duplicateTable} disabled={!selectedId} className="toolbar-btn">
            📋 Duplicar
          </button>
          <button onClick={handleDeleteTable} disabled={!selectedId} className="toolbar-btn">
            🗑️ Eliminar
          </button>
          <div className="separator"></div>
          <button onClick={handleSaveDiagram} className="toolbar-btn">
            💾 Guardar
          </button>
          <button onClick={() => alert('Funcionalidad de carga no implementada.')} className="toolbar-btn">
            📂 Cargar
          </button>
          <div className="separator"></div>
          <button onClick={() => setShowPreview(!showPreview)} className={`toolbar-btn ${showPreview ? 'active' : ''}`}>
            👁️ {showPreview ? "Editar" : "Vista previa"}
          </button>
        </div>
      </div>

      <div className="main-container">
        <div className="left-panel">
          <div className="panel-tabs">
            <button onClick={() => setActivePanel('components')} className={`tab-btn ${activePanel === 'components' ? 'active' : ''}`}>
              Componentes
            </button>
            <button onClick={() => setActivePanel('properties')} className={`tab-btn ${activePanel === 'properties' ? 'active' : ''}`}>
              Propiedades
            </button>
            <button onClick={() => setActivePanel('code')} className={`tab-btn ${activePanel === 'code' ? 'active' : ''}`}>
              Código
            </button>
          </div>
          <div className="panel-content">
            {activePanel === 'components' && (
              <div className="components-panel">
                <h4>Componentes</h4>
                <div className="component-buttons">
                  <button onClick={() => setActiveTool('select')} className={`btn ${activeTool === 'select' ? 'active' : ''}`}>
                    Seleccionar
                  </button>
                  <button onClick={() => setActiveTool('class')} className={`btn ${activeTool === 'class' ? 'active' : ''}`}>
                    Tabla
                  </button>
                  <button onClick={handleStartRelation}
                    className={`btn ${mode.name === 'DRAWING_RELATION' ? 'active' : ''}`}
                    disabled={!selectedId}>
                    {mode.name === 'DRAWING_RELATION' ? 'Selecciona destino' : 'Crear Relación'}
                  </button>
                </div>

                <div className="mt-3">
                  <h6>Tipo de Relación</h6>
                  <div className="btn-group d-flex" role="group">
                    <button type="button" className={`btn btn-sm ${relationType === 'one-to-one' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setRelationType('one-to-one')}>1 a 1</button>
                    <button type="button" className={`btn btn-sm ${relationType === 'one-to-many' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setRelationType('one-to-many')}>1 a N</button>
                    <button type="button" className={`btn btn-sm ${relationType === 'many-to-many' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setRelationType('many-to-many')}>N a M</button>
                  </div>
                </div>

                <div className="mt-3">
                  <h6>Relaciones UML</h6>
                  <div className="btn-group d-flex" role="group">
                    <button type="button" className={`btn btn-sm ${relationType === 'association' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setRelationType('association')}>Asociación</button>
                    <button type="button" className={`btn btn-sm ${relationType === 'aggregation' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setRelationType('aggregation')}>Agregación</button>
                    <button type="button" className={`btn btn-sm ${relationType === 'composition' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setRelationType('composition')}>Composición</button>
                    <button type="button" className={`btn btn-sm ${relationType === 'generalization' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setRelationType('generalization')}>Herencia</button>
                  </div>
                </div>
              </div>
            )}

            {activePanel === 'properties' && (
              <div className="properties-panel">
                <h4>Propiedades</h4>
                <p>Seleccione un componente para editar sus propiedades</p>
              </div>
            )}

            {activePanel === 'code' && (
              <div className="code-panel">
                <h4>Código Spring Boot</h4>
                <pre className="code-preview">
                  {generateSpringBootCodePreview(tables, relationships)}
                </pre>
                <button onClick={handleExportCode} className="btn">Exportar código</button>
              </div>
            )}
          </div>
        </div>

        <div className="canvas-container">
          <div
            className="main-content-canvas"
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={handleCanvasClick}
            onMouseLeave={handleMouseUp}
            style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', cursor: mode.name === 'DRAWING_RELATION' ? 'crosshair' : 'default' }}
          >
            <RelationshipLayer relationships={relationships} tables={tables} />

            {tables.map(table => (
              <TableComponent
                key={table.id}
                tableData={table}
                isSelected={selectedId === table.id}
                isRelationSource={mode.name === 'DRAWING_RELATION' && mode.startTableId === table.id}
                onMouseDown={handleMouseDownOnTable}
                onDoubleClick={(target) => setEditingTarget(`${table.id}-${target}`)}
                onNameChange={handleNameChange}
                onColumnChange={handleColumnChange}
                onAddColumn={handleAddColumn}
                onDeleteColumn={handleDeleteColumn}
                onSetPrimaryKey={handleSetPrimaryKey}
                editingTarget={editingTarget}
                setEditingId={setEditingTarget}
              />
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .page-builder {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
        }

        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 15px;
          background-color: #333;
          color: white;
        }

        .logo {
          font-size: 20px;
          font-weight: bold;
        }

        .toolbar-actions {
          display: flex;
          align-items: center;
        }

        .toolbar-btn {
          background: transparent;
          border: none;
          color: white;
          font-size: 14px;
          margin: 0 5px;
          padding: 5px 10px;
          cursor: pointer;
          border-radius: 4px;
        }

        .toolbar-btn:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }

        .toolbar-btn.active {
          background-color: rgba(255, 255, 255, 0.2);
        }

        .toolbar-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .separator {
          width: 1px;
          height: 20px;
          background-color: rgba(255, 255, 255, 0.3);
          margin: 0 10px;
        }

        .main-container {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .left-panel {
          width: 300px;
          background-color: #f5f5f5;
          display: flex;
          flex-direction: column;
          border-right: 1px solid #ddd;
        }

        .panel-tabs {
          display: flex;
          border-bottom: 1px solid #ddd;
        }

        .tab-btn {
          flex: 1;
          padding: 10px;
          text-align: center;
          background: none;
          border: none;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .tab-btn:hover {
          background-color: #e9e9e9;
        }

        .tab-btn.active {
          background-color: #fff;
          border-bottom: 2px solid #007bff;
          font-weight: bold;
        }

        .panel-content {
          flex: 1;
          padding: 15px;
          overflow-y: auto;
        }

        .component-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 15px;
        }

        .btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;
          background-color: #f8f9fa;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn:hover {
          background-color: #e9ecef;
          border-color: #ced4da;
        }

        .btn.active {
          background-color: #cce5ff;
          border-color: #b8daff;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .canvas-container {
          flex: 1;
          padding: 20px;
          background-color: #e9e9e9;
          overflow: auto;
        }

        .main-content-canvas {
          background-color: #fff;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          height: 100%;
          min-height: 500px;
        }

        .code-preview {
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 4px;
          font-family: monospace;
          white-space: pre-wrap;
          max-height: 400px;
          overflow-y: auto;
          font-size: 12px;
          border: 1px solid #ddd;
        }

        .mt-3 {
          margin-top: 15px;
        }

        .btn-group {
          display: flex;
        }

        .btn-group .btn {
          flex: 1;
        }

        .d-flex {
          display: flex;
        }

        .btn-sm {
          padding: 0.25rem 0.5rem;
          font-size: 0.875rem;
        }

        .btn-primary {
          background-color: #007bff;
          border-color: #007bff;
          color: white;
        }

        .btn-outline-primary {
          background-color: transparent;
          border-color: #007bff;
          color: #007bff;
        }

        .btn-outline-primary:hover {
          background-color: #007bff;
          color: white;
        }
      `}</style>
    </div>
  );
};

export default ChantSelect;