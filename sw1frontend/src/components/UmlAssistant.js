import React, { useState, useCallback, useRef, useEffect } from "react";

export const UmlAssistant = ({
  onDiagramGenerated,
  currentDiagram,
  onUndo,
  onRedo,
  onSave,
  onExportBackend,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("text"); // 'text' o 'image'
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Estados para el chat conversacional
  const [chatMessages, setChatMessages] = useState([]);
  const [commandInput, setCommandInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Inicializar reconocimiento de voz
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "es-ES"; // Español

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setCommandInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Error de reconocimiento de voz:", event.error);
        setError(`Error de reconocimiento de voz: ${event.error}`);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Auto-scroll al final del chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validar tamaño del archivo (máximo 10 MB)
      const maxSizeInBytes = 10 * 1024 * 1024; // 10 MB
      if (file.size > maxSizeInBytes) {
        setError("El archivo es demasiado grande. El tamaño máximo es 10 MB.");
        setSelectedFile(null);
        setPreviewUrl(null);
        event.target.value = ""; // Limpiar el input
        return;
      }

      // Validar que sea una imagen
      if (!file.type.startsWith("image/")) {
        setError("El archivo seleccionado no es una imagen válida.");
        setSelectedFile(null);
        setPreviewUrl(null);
        event.target.value = ""; // Limpiar el input
        return;
      }

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          // Validar resolución mínima
          if (img.width < 300 || img.height < 300) {
            setError(
              "La imagen es demasiado pequeña. Usa una imagen de al menos 300x300 píxeles para mejores resultados."
            );
            setSelectedFile(null);
            setPreviewUrl(null);
            event.target.value = "";
            return;
          }

          // Advertir si es muy grande (opcional, no bloqueante)
          if (img.width > 4096 || img.height > 4096) {
            console.warn(
              "Imagen muy grande, podría tardar más en procesarse:",
              `${img.width}x${img.height}`
            );
          }

          setPreviewUrl(reader.result);
          setError(null);
        };
        img.onerror = () => {
          setError("Error al cargar la imagen. Intenta con otra imagen.");
          setSelectedFile(null);
          setPreviewUrl(null);
          event.target.value = "";
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  // Funciones para reconocimiento de voz
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setError(null);
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error("Error al iniciar reconocimiento:", error);
        setIsListening(false);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Nueva función para el agente conversacional
  const handleConversationalCommand = async () => {
    if (!commandInput.trim()) {
      setError("Por favor, escribe un comando.");
      return;
    }

    const userMessage = {
      id: Date.now(),
      type: "user",
      text: commandInput,
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setCommandInput("");
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token") || "";
      const resp = await fetch(
        `${process.env.REACT_APP_API_URL}/ia/agente-conversacional`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-token": token,
          },
          body: JSON.stringify({
            comando: commandInput,
            diagramaActual: currentDiagram || { tables: [], relationships: [] },
          }),
        }
      );

      if (!resp.ok) {
        const errBody = await resp.json();
        throw new Error(errBody.msg || "Error del servidor");
      }

      const body = await resp.json();

      if (body.ok && body.accion) {
        const { accion, explicacion, datos, diagrama_nuevo } = body.accion;

        // Mensaje de respuesta de la IA
        const aiMessage = {
          id: Date.now() + 1,
          type: "ai",
          text: explicacion,
          action: accion,
          data: datos,
          timestamp: new Date(),
        };

        setChatMessages((prev) => [...prev, aiMessage]);

        // Ejecutar la acción
        executeAction(accion, datos, diagrama_nuevo);
      } else {
        throw new Error("Respuesta inválida de la IA");
      }
    } catch (err) {
      setError(err.message || "Error al procesar el comando");
      const errorMessage = {
        id: Date.now() + 2,
        type: "error",
        text: err.message || "Error al procesar el comando",
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Ejecutor de acciones basado en la respuesta de la IA
  const executeAction = (action, data, diagramaNuevo) => {
    // Helper: Buscar tabla por ID o nombre
    const findTable = (tableId) => {
      return currentDiagram?.tables?.find(
        (t) => t.id === tableId || t.name === tableId
      );
    };

    // Helper: Buscar índice de tabla
    const findTableIndex = (tableId) => {
      return currentDiagram?.tables?.findIndex(
        (t) => t.id === tableId || t.name === tableId
      );
    };

    // Helper: Generar ID único
    const generateId = (prefix) =>
      `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Helper: Agregar mensaje de éxito al chat
    const addSuccessMessage = (message) => {
      const successMessage = {
        id: Date.now() + Math.random(),
        type: "ai",
        text: `✅ ${message}`,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, successMessage]);
    };

    // Helper: Validar diagrama actual existe
    const validateDiagram = () => {
      if (!currentDiagram || !currentDiagram.tables) {
        setError("No hay diagrama actual para modificar");
        return false;
      }
      return true;
    };

    // Helper: Calcular posición automática para nueva tabla
    const calculateAutoPosition = (existingTables, tableData) => {
      const TABLE_WIDTH = 300;
      const TABLE_MIN_HEIGHT = 150;
      const HORIZONTAL_GAP = 100;
      const VERTICAL_GAP = 80;
      const MARGIN = 50;
      const TABLES_PER_ROW = 3;

      // Si hay posición especificada en los datos, usarla
      if (tableData?.top !== undefined && tableData?.left !== undefined) {
        return { top: tableData.top, left: tableData.left };
      }

      // Si no hay tablas existentes, empezar en la posición inicial
      if (!existingTables || existingTables.length === 0) {
        return { top: MARGIN, left: MARGIN };
      }

      // Calcular posición en grid (filas y columnas)
      const tableIndex = existingTables.length;
      const row = Math.floor(tableIndex / TABLES_PER_ROW);
      const col = tableIndex % TABLES_PER_ROW;

      // Calcular la altura máxima de la fila anterior para evitar superposiciones
      let maxHeightInPreviousRow = TABLE_MIN_HEIGHT;
      if (row > 0) {
        const previousRowStart = (row - 1) * TABLES_PER_ROW;
        const previousRowEnd = Math.min(
          row * TABLES_PER_ROW,
          existingTables.length
        );

        for (let i = previousRowStart; i < previousRowEnd; i++) {
          const table = existingTables[i];
          const tableHeight = (table.columns?.length || 3) * 40 + 60; // Altura estimada
          maxHeightInPreviousRow = Math.max(
            maxHeightInPreviousRow,
            tableHeight
          );
        }
      }

      // Calcular coordenadas
      const left = MARGIN + col * (TABLE_WIDTH + HORIZONTAL_GAP);
      const top =
        row === 0
          ? MARGIN
          : MARGIN + row * (maxHeightInPreviousRow + VERTICAL_GAP);

      return { top, left };
    };

    switch (action) {
      case "reemplazar_diagrama":
        if (!diagramaNuevo) {
          setError("Datos del diagrama nuevo no proporcionados");
          return;
        }
        if (!diagramaNuevo.tables || !Array.isArray(diagramaNuevo.tables)) {
          setError("Estructura de diagrama inválida");
          return;
        }
        onDiagramGenerated(diagramaNuevo);

        // Mensaje especial cuando se limpia el canvas (0 tablas)
        if (diagramaNuevo.tables.length === 0) {
          addSuccessMessage(
            "🧹 Canvas limpiado correctamente. La pizarra está vacía y lista para crear un nuevo diagrama."
          );
        } else {
          addSuccessMessage(
            `Diagrama ${
              currentDiagram?.tables?.length > 0 ? "reemplazado" : "creado"
            } con ${diagramaNuevo.tables.length} tabla(s) y ${
              diagramaNuevo.relationships?.length || 0
            } relación(es)`
          );
        }
        break;

      case "crear_tabla": {
        if (!validateDiagram()) return;

        if (!data || !data.tabla) {
          setError("Datos de tabla inválidos");
          return;
        }

        if (!data.tabla.name || !data.tabla.name.trim()) {
          setError("El nombre de la tabla es obligatorio");
          return;
        }

        // Validar que no exista una tabla con el mismo nombre
        const existingTable = findTable(data.tabla.name);
        if (existingTable) {
          setError(`Ya existe una tabla con el nombre "${data.tabla.name}"`);
          return;
        }

        // Calcular posición automática inteligente
        const existingTables = currentDiagram?.tables || [];
        const { top, left } = calculateAutoPosition(existingTables, data.tabla);

        const newTable = {
          id: generateId("table"),
          ...data.tabla,
          name: data.tabla.name.trim(),
          top,
          left,
          columns: (data.tabla.columns || []).map((col) => ({
            id: generateId("col"),
            ...col,
            name: col.name?.trim() || "",
            constraints: col.constraints || [],
          })),
        };

        onDiagramGenerated({
          ...currentDiagram,
          tables: [...existingTables, newTable],
        });

        addSuccessMessage(
          `Tabla "${newTable.name}" creada con ${
            newTable.columns.length
          } columna(s) en posición (${Math.round(top)}, ${Math.round(left)})`
        );
        break;
      }

      case "modificar_tabla": {
        if (!validateDiagram()) return;

        if (!data || !data.tableId) {
          setError("ID de tabla no especificado");
          return;
        }

        if (!data.cambios || Object.keys(data.cambios).length === 0) {
          setError("No se especificaron cambios para la tabla");
          return;
        }

        const tableIndex = findTableIndex(data.tableId);
        if (tableIndex === -1) {
          setError(
            `Tabla "${data.tableId}" no encontrada en el diagrama actual`
          );
          return;
        }

        const currentTable = currentDiagram.tables[tableIndex];

        // Si se está cambiando el nombre, validar que no exista otro con ese nombre
        if (data.cambios.name && data.cambios.name !== currentTable.name) {
          const nameExists = currentDiagram.tables.some(
            (t, idx) => idx !== tableIndex && t.name === data.cambios.name
          );
          if (nameExists) {
            setError(
              `Ya existe otra tabla con el nombre "${data.cambios.name}"`
            );
            return;
          }
        }

        const updatedTables = [...(currentDiagram?.tables || [])];
        updatedTables[tableIndex] = {
          ...updatedTables[tableIndex],
          ...data.cambios,
        };

        onDiagramGenerated({
          ...currentDiagram,
          tables: updatedTables,
        });

        const cambiosRealizados = Object.keys(data.cambios).join(", ");
        addSuccessMessage(
          `Tabla "${currentTable.name}" modificada: ${cambiosRealizados}`
        );
        break;
      }

      case "eliminar_tabla": {
        if (!validateDiagram()) return;

        if (!data || !data.tableId) {
          setError("ID de tabla no especificado");
          return;
        }

        const tableToDelete = findTable(data.tableId);
        if (!tableToDelete) {
          setError(
            `Tabla "${data.tableId}" no encontrada en el diagrama actual`
          );
          return;
        }

        // Verificar relaciones asociadas
        const relatedRelationships = (
          currentDiagram?.relationships || []
        ).filter(
          (rel) =>
            rel.fromTableId === tableToDelete.id ||
            rel.toTableId === tableToDelete.id
        );

        // Confirmación con información de relaciones
        const confirmMessage =
          relatedRelationships.length > 0
            ? `¿Eliminar la tabla "${tableToDelete.name}"?\n\nEsto también eliminará ${relatedRelationships.length} relación(es) asociada(s).`
            : `¿Eliminar la tabla "${tableToDelete.name}"?`;

        if (!window.confirm(confirmMessage)) {
          addSuccessMessage("Eliminación de tabla cancelada");
          return;
        }

        const updatedTables = (currentDiagram?.tables || []).filter(
          (t) => t.id !== tableToDelete.id
        );

        // Eliminar también relaciones asociadas
        const updatedRelationships = (
          currentDiagram?.relationships || []
        ).filter(
          (rel) =>
            rel.fromTableId !== tableToDelete.id &&
            rel.toTableId !== tableToDelete.id
        );

        onDiagramGenerated({
          ...currentDiagram,
          tables: updatedTables,
          relationships: updatedRelationships,
        });

        addSuccessMessage(
          `Tabla "${tableToDelete.name}" eliminada${
            relatedRelationships.length > 0
              ? ` junto con ${relatedRelationships.length} relación(es)`
              : ""
          }`
        );
        break;
      }

      case "crear_relacion": {
        if (!validateDiagram()) return;

        if (!data || !data.fromTable || !data.toTable || !data.type) {
          setError(
            "Datos de relación incompletos (fromTable, toTable, type requeridos)"
          );
          return;
        }

        const fromTable = findTable(data.fromTable);
        const toTable = findTable(data.toTable);

        if (!fromTable) {
          setError(
            `Tabla origen "${data.fromTable}" no encontrada en el diagrama`
          );
          return;
        }
        if (!toTable) {
          setError(
            `Tabla destino "${data.toTable}" no encontrada en el diagrama`
          );
          return;
        }

        // No permitir relación de una tabla consigo misma
        if (fromTable.id === toTable.id) {
          setError("No se puede crear una relación de una tabla consigo misma");
          return;
        }

        // Verificar si ya existe una relación entre estas tablas
        const existingRel = (currentDiagram?.relationships || []).find(
          (rel) =>
            (rel.fromTableId === fromTable.id &&
              rel.toTableId === toTable.id) ||
            (rel.fromTableId === toTable.id && rel.toTableId === fromTable.id)
        );

        if (existingRel) {
          setError(
            `Ya existe una relación ${existingRel.type} entre "${fromTable.name}" y "${toTable.name}"`
          );
          return;
        }

        const newRelationship = {
          id: generateId("rel"),
          type: data.type,
          fromTableId: fromTable.id,
          toTableId: toTable.id,
        };

        onDiagramGenerated({
          ...currentDiagram,
          relationships: [
            ...(currentDiagram?.relationships || []),
            newRelationship,
          ],
        });

        addSuccessMessage(
          `Relación "${data.type}" creada: ${fromTable.name} → ${toTable.name}`
        );
        break;
      }

      case "modificar_relacion": {
        if (!validateDiagram()) return;

        if (!data || !data.fromTable || !data.toTable) {
          setError(
            "Datos de relación incompletos (fromTable y toTable requeridos)"
          );
          return;
        }

        // Validar que al menos uno de los cambios esté presente
        if (!data.nuevoTipo && !data.invertirDireccion) {
          setError(
            "Debe especificar al menos 'nuevoTipo' o 'invertirDireccion'"
          );
          return;
        }

        const fromTable = findTable(data.fromTable);
        const toTable = findTable(data.toTable);

        if (!fromTable) {
          setError(
            `Tabla origen "${data.fromTable}" no encontrada en el diagrama`
          );
          return;
        }
        if (!toTable) {
          setError(
            `Tabla destino "${data.toTable}" no encontrada en el diagrama`
          );
          return;
        }

        // Buscar la relación existente (bidireccional)
        const relationIndex = (currentDiagram?.relationships || []).findIndex(
          (rel) =>
            (rel.fromTableId === fromTable.id &&
              rel.toTableId === toTable.id) ||
            (rel.fromTableId === toTable.id && rel.toTableId === fromTable.id)
        );

        if (relationIndex === -1) {
          setError(
            `No se encontró relación entre "${fromTable.name}" y "${toTable.name}"`
          );
          return;
        }

        const oldRelation = currentDiagram.relationships[relationIndex];
        const updatedRelationships = [...currentDiagram.relationships];

        // Preparar la relación actualizada
        let updatedRelation = { ...oldRelation };

        // Aplicar cambio de tipo si se especificó
        if (data.nuevoTipo) {
          updatedRelation.type = data.nuevoTipo;
        }

        // Aplicar inversión de dirección si se especificó
        if (data.invertirDireccion === true) {
          const tempFrom = updatedRelation.fromTableId;
          updatedRelation.fromTableId = updatedRelation.toTableId;
          updatedRelation.toTableId = tempFrom;
        }

        updatedRelationships[relationIndex] = updatedRelation;

        onDiagramGenerated({
          ...currentDiagram,
          relationships: updatedRelationships,
        });

        // Construir mensaje de éxito
        let successMessage = "Relación modificada: ";
        const changes = [];

        if (data.nuevoTipo && data.nuevoTipo !== oldRelation.type) {
          changes.push(`tipo: "${oldRelation.type}" → "${data.nuevoTipo}"`);
        }

        if (data.invertirDireccion === true) {
          changes.push(`dirección invertida`);
        }

        successMessage += changes.join(", ");
        successMessage += ` (${fromTable.name} ↔ ${toTable.name})`;

        addSuccessMessage(successMessage);
        break;
      }

      case "eliminar_relacion": {
        if (!validateDiagram()) return;

        if (!data || !data.fromTable || !data.toTable) {
          setError(
            "Datos de relación incompletos (fromTable y toTable requeridos)"
          );
          return;
        }

        const fromTable = findTable(data.fromTable);
        const toTable = findTable(data.toTable);

        if (!fromTable) {
          setError(`Tabla origen "${data.fromTable}" no encontrada`);
          return;
        }
        if (!toTable) {
          setError(`Tabla destino "${data.toTable}" no encontrada`);
          return;
        }

        const relationToDelete = (currentDiagram?.relationships || []).find(
          (rel) =>
            (rel.fromTableId === fromTable.id &&
              rel.toTableId === toTable.id) ||
            (rel.fromTableId === toTable.id && rel.toTableId === fromTable.id)
        );

        if (!relationToDelete) {
          setError(
            `No se encontró relación entre "${fromTable.name}" y "${toTable.name}"`
          );
          return;
        }

        const updatedRelationships = (
          currentDiagram?.relationships || []
        ).filter((rel) => rel.id !== relationToDelete.id);

        onDiagramGenerated({
          ...currentDiagram,
          relationships: updatedRelationships,
        });

        addSuccessMessage(
          `Relación "${relationToDelete.type}" eliminada entre ${fromTable.name} y ${toTable.name}`
        );
        break;
      }

      case "añadir_columna": {
        if (!validateDiagram()) return;

        if (!data || !data.tableId || !data.columna) {
          setError(
            "Datos incompletos para añadir columna (tableId y columna requeridos)"
          );
          return;
        }

        if (!data.columna.name || !data.columna.name.trim()) {
          setError("El nombre de la columna es obligatorio");
          return;
        }

        const tableIndex = findTableIndex(data.tableId);
        if (tableIndex === -1) {
          setError(`Tabla "${data.tableId}" no encontrada`);
          return;
        }

        const updatedTables = [...(currentDiagram?.tables || [])];
        const table = updatedTables[tableIndex];

        // Verificar si la columna ya existe
        const columnExists = table.columns?.some(
          (col) =>
            col.name.toLowerCase() === data.columna.name.trim().toLowerCase()
        );
        if (columnExists) {
          setError(
            `La columna "${data.columna.name}" ya existe en la tabla "${table.name}"`
          );
          return;
        }

        const newColumn = {
          id: generateId("col"),
          ...data.columna,
          name: data.columna.name.trim(),
          constraints: data.columna.constraints || [],
        };

        updatedTables[tableIndex] = {
          ...table,
          columns: [...(table.columns || []), newColumn],
        };

        onDiagramGenerated({
          ...currentDiagram,
          tables: updatedTables,
        });

        addSuccessMessage(
          `Columna "${newColumn.name}" (${newColumn.type}) añadida a tabla "${table.name}"`
        );
        break;
      }

      case "eliminar_columna": {
        if (!validateDiagram()) return;

        if (!data || !data.tableId || !data.columnName) {
          setError(
            "Datos incompletos para eliminar columna (tableId y columnName requeridos)"
          );
          return;
        }

        const tableIndex = findTableIndex(data.tableId);
        if (tableIndex === -1) {
          setError(`Tabla "${data.tableId}" no encontrada`);
          return;
        }

        const updatedTables = [...(currentDiagram?.tables || [])];
        const table = updatedTables[tableIndex];

        if (!table.columns || table.columns.length === 0) {
          setError(`La tabla "${table.name}" no tiene columnas`);
          return;
        }

        const columnIndex = table.columns?.findIndex(
          (col) => col.name === data.columnName
        );

        if (columnIndex === -1 || columnIndex === undefined) {
          setError(
            `Columna "${data.columnName}" no encontrada en tabla "${table.name}"`
          );
          return;
        }

        // Validar que no sea la última columna
        if (table.columns.length === 1) {
          setError(
            `No se puede eliminar la única columna de la tabla "${table.name}". Considera eliminar la tabla completa.`
          );
          return;
        }

        updatedTables[tableIndex] = {
          ...table,
          columns: table.columns.filter((col) => col.name !== data.columnName),
        };

        onDiagramGenerated({
          ...currentDiagram,
          tables: updatedTables,
        });

        addSuccessMessage(
          `Columna "${data.columnName}" eliminada de tabla "${table.name}"`
        );
        break;
      }

      case "modificar_columna": {
        if (!validateDiagram()) return;

        if (!data || !data.tableId || !data.columnName || !data.cambios) {
          setError(
            "Datos incompletos para modificar columna (tableId, columnName y cambios requeridos)"
          );
          return;
        }

        if (Object.keys(data.cambios).length === 0) {
          setError("No se especificaron cambios para la columna");
          return;
        }

        const tableIndex = findTableIndex(data.tableId);
        if (tableIndex === -1) {
          setError(`Tabla "${data.tableId}" no encontrada`);
          return;
        }

        const updatedTables = [...(currentDiagram?.tables || [])];
        const table = updatedTables[tableIndex];

        const columnIndex = table.columns?.findIndex(
          (col) => col.name === data.columnName
        );

        if (columnIndex === -1 || columnIndex === undefined) {
          setError(
            `Columna "${data.columnName}" no encontrada en tabla "${table.name}"`
          );
          return;
        }

        // Si se está cambiando el nombre, validar que no exista otra con ese nombre
        if (data.cambios.name && data.cambios.name !== data.columnName) {
          const nameExists = table.columns.some(
            (col, idx) =>
              idx !== columnIndex &&
              col.name.toLowerCase() === data.cambios.name.toLowerCase()
          );
          if (nameExists) {
            setError(
              `Ya existe otra columna con el nombre "${data.cambios.name}" en la tabla "${table.name}"`
            );
            return;
          }
        }

        updatedTables[tableIndex].columns[columnIndex] = {
          ...updatedTables[tableIndex].columns[columnIndex],
          ...data.cambios,
        };

        onDiagramGenerated({
          ...currentDiagram,
          tables: updatedTables,
        });

        const cambiosRealizados = Object.keys(data.cambios).join(", ");
        addSuccessMessage(
          `Columna "${data.columnName}" modificada en tabla "${table.name}": ${cambiosRealizados}`
        );
        break;
      }

      case "deshacer":
        if (onUndo) {
          onUndo();
          addSuccessMessage("Cambio deshecho correctamente");
        } else {
          setError("La función deshacer no está disponible");
        }
        break;

      case "rehacer":
        if (onRedo) {
          onRedo();
          addSuccessMessage("Cambio rehecho correctamente");
        } else {
          setError("La función rehacer no está disponible");
        }
        break;

      case "guardar":
        if (onSave) {
          onSave();
          addSuccessMessage("Diagrama guardado correctamente");
        } else {
          setError("La función guardar no está disponible");
        }
        break;

      case "exportar_backend":
        if (onExportBackend) {
          onExportBackend();
          addSuccessMessage("Exportando código del backend (Spring Boot)...");
        } else {
          setError("La función de exportación no está disponible");
        }
        break;

      case "sugerencia":
        // Mostrar el mensaje de sugerencia detallado
        if (data && data.mensaje) {
          addSuccessMessage(data.mensaje);
        }
        break;

      default:
        console.warn("Acción no implementada:", action);
        setError(`Acción "${action}" no está implementada aún`);
    }
  };

  const handleGenerateFromImage = async () => {
    if (!selectedFile) {
      setError("Por favor, selecciona una imagen para generar el diagrama.");
      return;
    }

    // 1. Mensaje de inicio en el chat
    const uploadMessage = {
      id: Date.now(),
      type: "user",
      text: `📸 Imagen cargada: ${selectedFile.name} (${(
        selectedFile.size / 1024
      ).toFixed(1)} KB)`,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, uploadMessage]);

    // 2. Preparar FormData
    const formData = new FormData();
    formData.append("diagramImage", selectedFile);

    setIsLoading(true);
    setError(null);

    try {
      // 3. Llamar al backend
      const token = localStorage.getItem("token") || "";
      const resp = await fetch(
        `${process.env.REACT_APP_API_URL}/ia/generar-diagrama-imagen`,
        {
          method: "POST",
          headers: {
            "x-token": token,
            // NO incluir Content-Type - FormData lo maneja automáticamente
          },
          body: formData,
        }
      );

      if (!resp.ok) {
        const errBody = await resp.json();
        throw new Error(errBody.msg || "Error al analizar la imagen");
      }

      const body = await resp.json();

      if (body.ok && body.diagram) {
        // 4. Generar diagrama
        onDiagramGenerated(body.diagram);

        // 5. Calcular métricas
        const totalTables = body.diagram.tables?.length || 0;
        const totalRelationships = body.diagram.relationships?.length || 0;
        const totalColumns =
          body.diagram.tables?.reduce(
            (acc, t) => acc + (t.columns?.length || 0),
            0
          ) || 0;

        // 6. Mensaje de éxito con métricas detalladas
        const successMessage = {
          id: Date.now() + 1,
          type: "ai",
          text: `✅ Diagrama generado exitosamente desde la imagen

📊 Resultados del análisis:
• Tablas detectadas: ${totalTables}
• Relaciones detectadas: ${totalRelationships}
• Columnas totales: ${totalColumns}

El diagrama ha sido generado y está listo para editar.`,
          timestamp: new Date(),
        };
        setChatMessages((prev) => [...prev, successMessage]);

        // 7. Limpiar estado después del éxito
        setSelectedFile(null);
        setPreviewUrl(null);

        // Limpiar input file
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) fileInput.value = "";
      } else {
        throw new Error(body.msg || "Respuesta inválida del servidor");
      }
    } catch (err) {
      // 8. Mensaje de error en el chat
      const errorMessage = {
        id: Date.now() + 2,
        type: "error",
        text: `❌ Error al procesar la imagen: ${err.message}

💡 Sugerencias:
• Verifica que la imagen sea clara y legible
• Asegúrate que los nombres de clases sean visibles
• Intenta con una imagen de mejor calidad o resolución
• Formatos recomendados: PNG, JPG (min. 300x300 px)`,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="uml-assistant-container">
      {/* Overlay de carga */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div
              className="spinner-border text-primary"
              role="status"
              style={{ width: "3rem", height: "3rem" }}
            >
              <span className="visually-hidden">Cargando...</span>
            </div>
            <p className="mt-3 mb-0">
              {activeTab === "text"
                ? "🤖 Procesando tu comando..."
                : "Analizando imagen y generando diagrama..."}
            </p>
            <small className="text-muted">
              El asistente IA está trabajando en tu solicitud
            </small>
          </div>
        </div>
      )}

      <h4>Asistente IA para UML</h4>

      <ul className="nav nav-tabs">
        <li className="nav-item">
          <a
            className={`nav-link ${activeTab === "text" ? "active" : ""}`}
            href="#!"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab("text");
              setError(null);
            }}
          >
            Texto
          </a>
        </li>
        <li className="nav-item">
          <a
            className={`nav-link ${activeTab === "image" ? "active" : ""}`}
            href="#!"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab("image");
              setError(null);
            }}
          >
            Subir Imagen
          </a>
        </li>
      </ul>

      <div className="tab-content mt-3">
        {activeTab === "text" && (
          <div className="tab-pane active">
            {/* Interfaz conversacional */}
            <div className="chat-container">
              <div className="chat-messages">
                {chatMessages.length === 0 && (
                  <div className="welcome-message">
                    <i
                      className="bi bi-chat-dots"
                      style={{ fontSize: "2rem" }}
                    ></i>
                    <p className="mt-2 mb-1">
                      <strong>¡Hola! Soy tu Asistente de IA UML</strong>
                    </p>
                    <small>Puedo ayudarte a:</small>
                    <ul
                      className="text-start mt-2"
                      style={{ fontSize: "0.85rem" }}
                    >
                      <li>Crear diagramas completos desde cero</li>
                      <li>Analizar imágenes de diagramas dibujados a mano</li>
                      <li>Añadir, modificar o eliminar tablas</li>
                      <li>Crear y gestionar relaciones entre tablas</li>
                      <li>Añadir, modificar o eliminar columnas</li>
                      <li>Cambiar tipos de datos de columnas</li>
                      <li>Limpiar la pizarra completamente</li>
                      <li>Deshacer, rehacer y guardar cambios</li>
                      <li>Exportar código del backend (Spring Boot)</li>
                      <li>Sugerir mejoras a tu diagrama</li>
                    </ul>
                    <small className="text-muted">
                      Escribe un comando, usa el 🎤 para voz, o sube una imagen
                      en la pestaña "Subir Imagen"...
                    </small>
                  </div>
                )}

                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`message ${msg.type}-message`}>
                    <div className="message-header">
                      <strong>
                        {msg.type === "user" ? (
                          <>
                            <i className="bi bi-person-circle me-1"></i>Tú
                          </>
                        ) : msg.type === "ai" ? (
                          <>
                            <i className="bi bi-robot me-1"></i>Asistente IA
                          </>
                        ) : (
                          <>
                            <i className="bi bi-exclamation-triangle me-1"></i>
                            Error
                          </>
                        )}
                      </strong>
                      <small className="text-muted ms-2">
                        {msg.timestamp.toLocaleTimeString()}
                      </small>
                    </div>
                    <div className="message-content">{msg.text}</div>
                    {msg.action && (
                      <div className="message-action">
                        <small>
                          <i className="bi bi-lightning-fill me-1"></i>
                          Acción: <code>{msg.action}</code>
                        </small>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="chat-input-container">
                <div className="input-wrapper">
                  <textarea
                    className="form-control chat-input"
                    rows="2"
                    value={commandInput}
                    onChange={(e) => setCommandInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleConversationalCommand();
                      }
                    }}
                    placeholder="Ej: Crea un diagrama de un sistema de biblioteca..."
                    disabled={isLoading || isListening}
                  ></textarea>
                  <button
                    className={`voice-btn ${isListening ? "listening" : ""}`}
                    onClick={isListening ? stopListening : startListening}
                    disabled={isLoading}
                    title={
                      isListening
                        ? "Detener grabación"
                        : "Grabar comando de voz"
                    }
                  >
                    <i
                      className={`bi ${
                        isListening ? "bi-mic-fill" : "bi-mic"
                      } voice-icon`}
                    ></i>
                  </button>
                </div>
                <div className="button-group mt-2">
                  <button
                    className="btn btn-primary flex-grow-1"
                    onClick={handleConversationalCommand}
                    disabled={isLoading || !commandInput.trim() || isListening}
                  >
                    {isLoading ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        ></span>
                        Procesando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-send-fill me-2"></i>
                        Enviar Comando
                      </>
                    )}
                  </button>
                </div>
                <small className="text-muted d-block mt-1">
                  {isListening ? (
                    <span className="listening-indicator">
                      <i className="bi bi-record-circle-fill me-1"></i>
                      Escuchando... Habla ahora
                    </span>
                  ) : (
                    "Presiona Enter para enviar • Shift+Enter para nueva línea • 🎤 para voz"
                  )}
                </small>
              </div>
            </div>
          </div>
        )}

        {activeTab === "image" && (
          <div
            className="tab-pane active"
            style={{ overflowY: "auto", maxHeight: "100%" }}
          >
            <div className="alert alert-info" role="alert">
              <strong>💡 Tips para mejores resultados:</strong>
              <ul className="mb-0 mt-2" style={{ fontSize: "0.85rem" }}>
                <li>Usa imágenes claras con buena iluminación</li>
                <li>Asegúrate que el texto sea legible</li>
                <li>Incluye nombres de clases y atributos visibles</li>
                <li>Marca claramente las relaciones entre clases</li>
                <li>Formato: PNG o JPG (mínimo 300x300 píxeles)</li>
              </ul>
            </div>

            <p>Sube una imagen de tu diagrama hecho a mano:</p>
            <input
              type="file"
              className="form-control"
              accept="image/*"
              onChange={handleFileChange}
            />
            {previewUrl && (
              <div className="mt-3 mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <small className="text-muted">
                    <strong>Vista previa:</strong>
                  </small>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      const fileInput =
                        document.querySelector('input[type="file"]');
                      if (fileInput) fileInput.value = "";
                    }}
                  >
                    <i className="bi bi-trash"></i> Cancelar
                  </button>
                </div>
                <div className="preview-container text-center">
                  <img
                    src={previewUrl}
                    alt="Vista previa"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "250px",
                      border: "2px solid #dee2e6",
                      borderRadius: "8px",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <div className="mt-2 mb-2">
                    <small className="text-muted">
                      <i className="bi bi-file-image"></i> {selectedFile.name} •{" "}
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </small>
                  </div>
                </div>
              </div>
            )}
            <div className="d-grid gap-2 mt-3 mb-3">
              <button
                className="btn btn-primary"
                onClick={handleGenerateFromImage}
                disabled={isLoading || !selectedFile}
              >
                {isLoading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    Analizando imagen...
                  </>
                ) : (
                  <>
                    <i className="bi bi-image me-2"></i>
                    Generar desde Imagen
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-danger mt-2">{error}</p>}

      <style jsx>{`
        .uml-assistant-container {
          position: relative;
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 8px;
          margin: 15px;
          background-color: #f9f9f9;
          height: calc(100vh - 115px);
          display: flex;
          flex-direction: column;
        }
        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(255, 255, 255, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          z-index: 1000;
          backdrop-filter: blur(2px);
        }
        .loading-content {
          text-align: center;
          padding: 20px;
        }
        .loading-content p {
          font-weight: 500;
          color: #333;
          font-size: 1.1rem;
        }
        .loading-content small {
          display: block;
          margin-top: 8px;
        }
        h4 {
          margin-top: 0;
          margin-bottom: 15px;
        }
        textarea {
          resize: vertical;
        }
        .nav-tabs .nav-link {
          cursor: pointer;
        }
        .w-100 {
          width: 100%;
        }
        .tab-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .tab-pane {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* Estilos del chat */
        .chat-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: white;
          border-radius: 8px;
          overflow: hidden;
        }
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 15px;
          background: #f8f9fa;
        }
        .welcome-message {
          text-align: center;
          padding: 20px 20px;
          color: #6c757d;
        }
        .welcome-message ul {
          display: inline-block;
          text-align: left;
          color: #495057;
        }
        .message {
          margin-bottom: 15px;
          padding: 12px;
          border-radius: 8px;
          animation: fadeIn 0.3s ease-in;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .user-message {
          background: #e3f2fd;
          border-left: 4px solid #2196f3;
          margin-left: 20px;
        }
        .ai-message {
          background: #f1f8e9;
          border-left: 4px solid #8bc34a;
          margin-right: 20px;
        }
        .error-message {
          background: #ffebee;
          border-left: 4px solid #f44336;
        }
        .message-header {
          display: flex;
          align-items: center;
          margin-bottom: 6px;
          font-size: 0.9rem;
        }
        .message-content {
          color: #212529;
          line-height: 1.5;
          white-space: pre-wrap;
        }
        .message-action {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(0, 0, 0, 0.1);
        }
        .message-action code {
          background: rgba(0, 0, 0, 0.05);
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 0.85rem;
        }
        .chat-input-container {
          padding: 15px;
          background: white;
          border-top: 1px solid #dee2e6;
        }
        .input-wrapper {
          position: relative;
          display: flex;
          align-items: flex-end;
          gap: 8px;
        }
        .chat-input {
          flex: 1;
          resize: none;
          border: 2px solid #dee2e6;
          transition: border-color 0.2s;
          padding-right: 10px;
        }
        .chat-input:focus {
          border-color: #2196f3;
          box-shadow: 0 0 0 0.2rem rgba(33, 150, 243, 0.15);
        }
        .voice-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          color: white;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
          transition: all 0.3s;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }
        .voice-icon {
          font-size: 1.5rem;
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
        }
        .voice-btn.listening .voice-icon {
          font-size: 1.6rem;
          animation: micPulse 0.6s ease-in-out infinite;
        }
        @keyframes micPulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.15);
          }
        }
        .voice-btn:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);
        }
        .voice-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .voice-btn.listening {
          background: linear-gradient(135deg, #f44336 0%, #e91e63 100%);
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0%,
          100% {
            box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);
          }
          50% {
            box-shadow: 0 4px 20px rgba(244, 67, 54, 0.7);
          }
        }
        .button-group {
          display: flex;
          gap: 8px;
        }
        .flex-grow-1 {
          flex-grow: 1;
        }
        .listening-indicator {
          color: #f44336;
          font-weight: 500;
          animation: blink 1s infinite;
        }
        @keyframes blink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
};
