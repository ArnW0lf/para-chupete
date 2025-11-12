const { response } = require("express");
const { GoogleGenAI } = require("@google/genai");

// Simulación de la función para parsear la respuesta de la IA
const parseIAResponseToDiagram = (iaResponse) => {
  console.log("Respuesta de la IA recibida para parsear:", iaResponse);

  const ensureIds = (diagram) => {
    diagram.tables.forEach((table) => {
      if (!table.id) table.id = `table-${Date.now()}-${Math.random()}`;
      if (!Array.isArray(table.columns)) {
        table.columns = [];
      }
      table.columns.forEach((col) => {
        if (!col.id) col.id = `col-${Date.now()}-${Math.random()}`;
        if (!Array.isArray(col.constraints)) {
          col.constraints = [];
        }
      });
    });

    diagram.relationships.forEach((rel) => {
      if (!rel.id) rel.id = `rel-${Date.now()}-${Math.random()}`;
    });
  };

  try {
    if (!iaResponse || typeof iaResponse !== "string") {
      throw new Error("La respuesta de la IA es vacía o no es texto.");
    }

    const trimmed = iaResponse.trim();
    let jsonPayload = null;

    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fencedMatch && fencedMatch[1]) {
      jsonPayload = fencedMatch[1].trim();
    } else if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      jsonPayload = trimmed;
    } else {
      const firstBrace = trimmed.indexOf("{");
      const lastBrace = trimmed.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonPayload = trimmed.slice(firstBrace, lastBrace + 1);
      }
    }

    if (!jsonPayload) {
      throw new Error(
        "No se encontró contenido JSON en la respuesta de la IA."
      );
    }

    const parsed = JSON.parse(jsonPayload);

    const diagram = {
      tables: Array.isArray(parsed.tables) ? parsed.tables : [],
      relationships: Array.isArray(parsed.relationships)
        ? parsed.relationships
        : [],
    };

    ensureIds(diagram);

    return diagram;
  } catch (error) {
    console.error("Error al parsear la respuesta de la IA:", error);
    return {
      tables: [
        {
          id: "error-1",
          name: "ErrorParseo",
          top: 50,
          left: 50,
          columns: [
            { id: "col-err-1", name: "mensaje", type: "VARCHAR" },
            { id: "col-err-2", name: "detalle", type: "TEXT" },
          ],
        },
      ],
      relationships: [],
    };
  }
};

const extractResponseText = (geminiResponse) => {
  if (!geminiResponse) {
    return "";
  }

  if (typeof geminiResponse.text === "string" && geminiResponse.text.trim()) {
    return geminiResponse.text;
  }

  if (
    typeof geminiResponse.output_text === "string" &&
    geminiResponse.output_text.trim()
  ) {
    return geminiResponse.output_text;
  }

  if (Array.isArray(geminiResponse.candidates)) {
    for (const candidate of geminiResponse.candidates) {
      const parts = candidate?.content?.parts;
      if (Array.isArray(parts)) {
        const text = parts
          .map((part) => part?.text)
          .filter((segment) => typeof segment === "string")
          .join("\n")
          .trim();
        if (text) {
          return text;
        }
      }
    }
  }

  return "";
};

const geminiClient = () =>
  new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

// Función helper para reintentar llamadas a la API con backoff exponencial
const retryWithBackoff = async (fn, maxRetries = 3, initialDelay = 1000) => {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Si es error 503 (servicio sobrecargado) o 429 (rate limit), reintentamos
      if (error.status === 503 || error.status === 429) {
        const delay = initialDelay * Math.pow(2, attempt); // Backoff exponencial
        console.log(
          `Intento ${
            attempt + 1
          }/${maxRetries} falló. Reintentando en ${delay}ms...`
        );

        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      // Si es otro tipo de error, o ya agotamos los reintentos, lanzamos el error
      throw error;
    }
  }

  throw lastError;
};

const generarDiagramaUML = async (req, res = response) => {
  const { prompt } = req.body;

  // Validar que la API Key de Gemini esté configurada
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      ok: false,
      msg: "La API Key de Gemini no está configurada en las variables de entorno.",
    });
  }

  try {
    const ai = geminiClient();
    const modelId = process.env.GEMINI_MODEL;

    const fullPrompt = `
            Basado en la siguiente descripción, genera una estructura JSON para un diagrama de clases UML.
            Descripción: "${prompt}".

            El JSON debe tener dos claves principales: "tables" y "relationships".

            1.  **"tables"**: Un array de objetos. Cada objeto representa una clase y debe tener:
                *   "id": Un identificador único (puedes usar un placeholder como "table-1").
                *   "name": El nombre de la clase (ej: "Usuario").
                *   "top": Una coordenada Y inicial (ej: 50).
                *   "left": Una coordenada X inicial (ej: 50).
                *   "columns": Un array de objetos, donde cada objeto es un atributo de la clase con:
                    *   "id": Un ID único para la columna (ej: "col-1").
                    *   "name": El nombre del atributo (ej: "nombre").
                    *   "type": El tipo de dato (ej: "VARCHAR(255)", "INT", "TEXT").
                    *   "constraints": Un array de strings para restricciones (ej: ["PK"] para Clave Primaria).

            2.  **"relationships"**: Un array de objetos. Cada objeto representa una relación y debe tener:
                *   "id": Un ID único para la relación (ej: "rel-1").
                *   "type": El tipo de relación (ej: "one-to-many", "inheritance", "composition").
                *   "fromTableId": El "id" de la tabla de origen.
                *   "toTableId": El "id" de la tabla de destino.

            Ejemplo de estructura de salida para "un sistema de blog con Usuarios y Posts":
            \`\`\`json
            {
              "tables": [
                {
                  "id": "table-1",
                  "name": "Usuario",
                  "top": 50,
                  "left": 50,
                  "columns": [
                    { "id": "col-1", "name": "id", "type": "INT", "constraints": ["PK"] },
                    { "id": "col-2", "name": "nombre", "type": "VARCHAR(255)", "constraints": [] }
                  ]
                },
                {
                  "id": "table-2",
                  "name": "Post",
                  "top": 50,
                  "left": 300,
                  "columns": [
                    { "id": "col-3", "name": "id", "type": "INT", "constraints": ["PK"] },
                    { "id": "col-4", "name": "titulo", "type": "VARCHAR(255)", "constraints": [] },
                    { "id": "col-5", "name": "contenido", "type": "TEXT", "constraints": [] }
                  ]
                }
              ],
              "relationships": [
                {
                  "id": "rel-1",
                  "type": "one-to-many",
                  "fromTableId": "table-1",
                  "toTableId": "table-2"
                }
              ]
            }
            \`\`\`
            
            Genera el JSON para la descripción proporcionada. No incluyas nada más que el bloque de código JSON en tu respuesta.
        `;

    const responseAI = await retryWithBackoff(async () => {
      return await ai.models.generateContent({
        model: modelId,
        contents: [
          {
            role: "user",
            parts: [{ text: fullPrompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.7,
        },
      });
    });

    const text = extractResponseText(responseAI);

    if (!text) {
      throw new Error(
        "La respuesta de Gemini no contiene contenido de texto utilizable."
      );
    }

    const diagramData = parseIAResponseToDiagram(text);

    res.json({
      ok: true,
      diagram: diagramData,
    });
  } catch (error) {
    console.error("Error al contactar la API de Gemini:", error);
    res.status(500).json({
      ok: false,
      msg: "Error al generar el diagrama con la IA.",
    });
  }
};

// Helper para convertir el buffer de la imagen a un formato que Gemini puede entender
const fileToGenerativePart = (buffer, mimeType) => {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType,
    },
  };
};

const generarDiagramaUMLConImagen = async (req, res = response) => {
  if (!req.file) {
    return res.status(400).json({
      ok: false,
      msg: "No se ha subido ninguna imagen.",
    });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      ok: false,
      msg: "La API Key de Gemini no está configurada.",
    });
  }

  try {
    const ai = geminiClient();
    // Usamos un modelo con capacidad de visión
    const modelId = process.env.GEMINI_VISION_MODEL || process.env.GEMINI_MODEL;

    if (!modelId) {
      return res.status(500).json({
        ok: false,
        msg: "Configura la variable GEMINI_VISION_MODEL con un modelo de visión válido (ej: gemini-1.5-pro-vision).",
      });
    }

    const imagePart = fileToGenerativePart(req.file.buffer, req.file.mimetype);

    const promptText = `Analiza la siguiente imagen de un diagrama de clases dibujado a mano y genera una estructura JSON para representarlo.
        
        El JSON debe tener dos claves principales: "tables" y "relationships".

        1.  **"tables"**: Un array de objetos. Cada objeto representa una clase y debe tener:
            *   "id": Un identificador único (puedes usar un placeholder como "table-1").
            *   "name": El nombre de la clase (ej: "Usuario").
            *   "top": Una coordenada Y inicial (ej: 50).
            *   "left": Una coordenada X inicial (ej: 50).
            *   "columns": Un array de objetos, donde cada objeto es un atributo de la clase con:
                *   "id": Un ID único para la columna (ej: "col-1").
                *   "name": El nombre del atributo (ej: "nombre").
                *   "type": El tipo de dato (ej: "VARCHAR", "INT", "TEXT").
                *   "constraints": Un array de strings para restricciones (ej: ["PK"]).

        2.  **"relationships"**: Un array de objetos. Cada objeto representa una relación y debe tener:
            *   "id": Un ID único para la relación (ej: "rel-1").
            *   "type": El tipo de relación (ej: "one-to-many", "inheritance", "composition").
            *   "fromTableId": El "id" de la tabla de origen.
            *   "toTableId": El "id" de la tabla de destino.

        Genera el JSON para el diagrama en la imagen. No incluyas nada más que el bloque de código JSON en tu respuesta.`;

    const promptParts = [{ text: promptText }, imagePart];

    const responseAI = await retryWithBackoff(async () => {
      return await ai.models.generateContent({
        model: modelId,
        contents: [{ role: "user", parts: promptParts }],
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.7,
        },
      });
    });

    const text = extractResponseText(responseAI);

    if (!text) {
      throw new Error("La respuesta de Gemini no contiene texto utilizable.");
    }

    const diagramData = parseIAResponseToDiagram(text);

    res.json({
      ok: true,
      diagram: diagramData,
    });
  } catch (error) {
    console.error("Error al contactar la API de Gemini con imagen:", error);
    res.status(500).json({
      ok: false,
      msg: "Error al generar el diagrama con la IA a partir de la imagen.",
    });
  }
};

// Nuevo: Agente conversacional para modificar diagramas existentes
const agenteConversacionalUML = async (req, res = response) => {
  const { comando, diagramaActual } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      ok: false,
      msg: "La API Key de Gemini no está configurada.",
    });
  }

  try {
    const ai = geminiClient();
    const modelId = process.env.GEMINI_MODEL;

    // Determinar si hay un diagrama existente
    const tieneDiagrama =
      diagramaActual &&
      diagramaActual.tables &&
      diagramaActual.tables.length > 0;

    // Construir el contexto del diagrama actual
    const contextoDiagrama = tieneDiagrama
      ? JSON.stringify(diagramaActual, null, 2)
      : "No hay diagrama actual (diagrama vacío)";

    const fullPrompt = `
Eres un asistente experto en diagramas UML de clases. Tu tarea es interpretar comandos en lenguaje natural y generar acciones específicas para trabajar con diagramas.

**DIAGRAMA ACTUAL:**
\`\`\`json
${contextoDiagrama}
\`\`\`

**COMANDO DEL USUARIO:**
"${comando}"

**ANÁLISIS DEL CONTEXTO:**
- ${
      tieneDiagrama
        ? `Existe un diagrama con ${diagramaActual.tables.length} tabla(s)`
        : "El diagrama está vacío"
    }
- Si el usuario pide "crear un diagrama de...", "genera un diagrama de...", o describe un sistema completo nuevo, usa la acción "reemplazar_diagrama"
- Si el usuario pide modificar, añadir, eliminar o ajustar elementos específicos del diagrama actual, usa acciones específicas
- Si el diagrama está vacío y el usuario describe un sistema, usa "reemplazar_diagrama"

**TU RESPUESTA DEBE SER UN JSON con la siguiente estructura:**

\`\`\`json
{
  "accion": "crear_tabla" | "modificar_tabla" | "eliminar_tabla" | "crear_relacion" | "modificar_relacion" | "eliminar_relacion" | "modificar_columna" | "añadir_columna" | "eliminar_columna" | "deshacer" | "rehacer" | "guardar" | "exportar_backend" | "sugerencia" | "reemplazar_diagrama",
  "explicacion": "Explicación clara de lo que vas a hacer",
  "datos": {
    // Datos específicos según la acción
  },
  "diagrama_nuevo": {
    // Solo si accion es "reemplazar_diagrama"
    "tables": [...],
    "relationships": [...]
  }
}
\`\`\`

**TIPOS DE ACCIONES Y SUS DATOS:**

1. **crear_tabla**: Crear una nueva tabla en el diagrama actual
   \`\`\`json
   {
     "tabla": {
       "name": "NombreTabla",
       "columns": [
         {"name": "id", "type": "INT", "constraints": ["PK"]},
         {"name": "campo", "type": "VARCHAR(255)", "constraints": []}
       ],
       "top": 100,
       "left": 100
     }
   }
   \`\`\`

2. **modificar_tabla**: Modificar una tabla existente
   \`\`\`json
   {
     "tableId": "id-de-la-tabla" | "nombre-de-la-tabla",
     "cambios": {
       "name": "NuevoNombre" (opcional),
       "top": 150 (opcional),
       "left": 200 (opcional)
     }
   }
   \`\`\`

3. **eliminar_tabla**: Eliminar una tabla del diagrama
   \`\`\`json
   {
     "tableId": "id-de-la-tabla" | "nombre-de-la-tabla"
   }
   \`\`\`

4. **crear_relacion**: Crear relación entre dos tablas
   \`\`\`json
   {
     "fromTable": "nombre-tabla-origen",
     "toTable": "nombre-tabla-destino",
     "type": "one-to-many" | "one-to-one" | "many-to-many" | "inheritance" | "composition" | "aggregation" | "association"
   }
   \`\`\`

5. **modificar_relacion**: Modificar el tipo o dirección de una relación existente
   \`\`\`json
   {
     "fromTable": "nombre-tabla-origen",
     "toTable": "nombre-tabla-destino",
     "nuevoTipo": "one-to-many" | "one-to-one" | "many-to-many" | "inheritance" | "composition" | "aggregation" | "association" (opcional),
     "invertirDireccion": true | false (opcional, default: false)
   }
   \`\`\`
   - Si "nuevoTipo" está presente, cambia el tipo de relación
   - Si "invertirDireccion" es true, invierte fromTable ↔ toTable
   - Puedes usar ambos parámetros simultáneamente

6. **eliminar_relacion**: Eliminar una relación
   \`\`\`json
   {
     "fromTable": "nombre-tabla-origen",
     "toTable": "nombre-tabla-destino"
   }
   \`\`\`

7. **añadir_columna**: Añadir columna a tabla existente
   \`\`\`json
   {
     "tableId": "nombre-de-la-tabla",
     "columna": {
       "name": "nuevoCampo",
       "type": "VARCHAR(255)",
       "constraints": []
     }
   }
   \`\`\`

8. **eliminar_columna**: Eliminar columna de tabla
   \`\`\`json
   {
     "tableId": "nombre-de-la-tabla",
     "columnName": "nombre-columna"
   }
   \`\`\`

9. **modificar_columna**: Modificar columna existente (nombre, tipo de dato o restricciones)
   \`\`\`json
   {
     "tableId": "nombre-de-la-tabla",
     "columnName": "nombre-columna-actual",
     "cambios": {
       "name": "nuevoNombre" (opcional),
       "type": "NUEVO_TIPO" (opcional),
       "constraints": ["PK"] (opcional)
     }
   }
   \`\`\`
   
   **Ejemplos de uso:**
   - Cambiar tipo de dato: \`"cambios": {"type": "VARCHAR(255)"}\`
   - Cambiar nombre: \`"cambios": {"name": "email"}\`
   - Añadir restricción: \`"cambios": {"constraints": ["PK", "NOT NULL"]}\`
   - Cambiar tipo y nombre: \`"cambios": {"name": "email", "type": "VARCHAR(255)"}\`

9. **sugerencia**: Dar recomendaciones sin modificar
   \`\`\`json
   {
     "mensaje": "Texto con la sugerencia o recomendación"
   }
   \`\`\`

10. **deshacer**: Deshacer el último cambio en el diagrama
    \`\`\`json
    {}
    \`\`\`

11. **rehacer**: Rehacer el último cambio deshecho
    \`\`\`json
    {}
    \`\`\`

12. **guardar**: Guardar el diagrama actual
    \`\`\`json
    {}
    \`\`\`

13. **exportar_backend**: Exportar código del backend (Spring Boot)
    \`\`\`json
    {}
    \`\`\`

14. **reemplazar_diagrama**: Crear o reemplazar diagrama completo
    \`\`\`json
    {
      "diagrama_nuevo": {
        "tables": [
          {
            "id": "table-1",
            "name": "Usuario",
            "top": 50,
            "left": 50,
            "columns": [
              {"id": "col-1", "name": "id", "type": "INT", "constraints": ["PK"]},
              {"id": "col-2", "name": "nombre", "type": "VARCHAR(255)", "constraints": []}
            ]
          },
          {
            "id": "table-2",
            "name": "Post",
            "top": 50,
            "left": 400,
            "columns": [...]
          },
          {
            "id": "table-3",
            "name": "Comentario",
            "top": 50,
            "left": 750,
            "columns": [...]
          },
          {
            "id": "table-4",
            "name": "Categoria",
            "top": 300,
            "left": 50,
            "columns": [...]
          }
        ],
        "relationships": [
          {
            "id": "rel-1",
            "type": "one-to-many",
            "fromTableId": "table-1",
            "toTableId": "table-2"
          }
        ]
      }
    }
    \`\`\`

**REGLAS IMPORTANTES:**
- Si el comando es "crea un diagrama de..." o "genera un diagrama de..." → usa "reemplazar_diagrama"
- Si el comando es "añade una tabla..." y ya existe un diagrama → usa "crear_tabla"
- Si el diagrama está vacío y el usuario describe un sistema completo → usa "reemplazar_diagrama"
- Si el comando es "limpiar", "limpiar pizarra", "borrar todo", "vaciar canvas", "eliminar todo", "resetear" → usa "reemplazar_diagrama" con diagrama_nuevo: {tables: [], relationships: []}
- Si el comando es vago o no claro → usa "sugerencia" para pedir clarificación
- Si el comando es "deshacer", "volver atrás", "undo" → usa "deshacer"
- Si el comando es "rehacer", "volver a hacer", "redo" → usa "rehacer"
- Si el comando es "guardar", "guarda el diagrama", "save" → usa "guardar"
- Si el comando es "exporta el backend", "genera el código Spring", "descarga el backend", "exportar código" → usa "exportar_backend"
- Si el comando es "cambia el tipo de dato de...", "modifica el tipo de...", "cambiar tipo...", "actualiza el tipo..." → usa "modificar_columna" con solo el campo "type" en cambios
- Si el comando es "renombra la columna...", "cambia el nombre de la columna..." → usa "modificar_columna" con solo el campo "name" en cambios
- Si el comando es "añade restricción...", "agrega constraint...", "marca como PK/FK..." → usa "modificar_columna" con solo el campo "constraints" en cambios
- Usa los nombres exactos de las tablas como aparecen en el diagrama actual
- Para "reemplazar_diagrama", genera IDs únicos para tables, columns y relationships
- **POSICIONAMIENTO INTELIGENTE**: Organiza las tablas en un grid de 3 columnas:
  * Primera fila: left 50, 400, 750 (top: 50)
  * Segunda fila: left 50, 400, 750 (top: 300)
  * Tercera fila: left 50, 400, 750 (top: 550)
  * Separación horizontal: 350px, vertical: 250px
- Para "crear_tabla", el frontend calculará la posición automáticamente
- No pongas todas las tablas en la misma posición (evita left: 50, top: 50 para todas)

**EJEMPLOS DE COMANDOS DE USUARIO:**
- "Cambia el tipo de dato de la columna nombre en Usuario a TEXT" → modificar_columna con cambios: {type: "TEXT"}
- "Modifica el tipo de la columna edad a INTEGER" → modificar_columna con cambios: {type: "INTEGER"}
- "Actualiza el tipo de dato de email a VARCHAR(255)" → modificar_columna con cambios: {type: "VARCHAR(255)"}
- "Cambia la columna precio de Producto a DECIMAL(10,2)" → modificar_columna con cambios: {type: "DECIMAL(10,2)"}
- "Renombra la columna user_name a username" → modificar_columna con cambios: {name: "username"}
- "Añade restricción NOT NULL a la columna email" → modificar_columna con cambios: {constraints: ["NOT NULL"]}
- "Exporta el backend", "Descarga el código Spring", "Genera el backend" → exportar_backend
- "Limpiar pizarra", "Borrar todo", "Vaciar canvas", "Eliminar todo", "Resetear" → reemplazar_diagrama con diagrama_nuevo: {tables: [], relationships: []}

Responde SOLO con el JSON de la acción, sin texto adicional.
`;

    // Usar reintentos con backoff exponencial para manejar errores 503
    const responseAI = await retryWithBackoff(async () => {
      return await ai.models.generateContent({
        model: modelId,
        contents: [
          {
            role: "user",
            parts: [{ text: fullPrompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 8192, // Aumentar límite de tokens de salida para respuestas completas
          temperature: 0.7,
        },
      });
    });

    const text = extractResponseText(responseAI);

    if (!text) {
      throw new Error("La respuesta de Gemini no contiene texto utilizable.");
    }

    // Parsear la respuesta JSON
    let accionData;
    try {
      const trimmed = text.trim();
      let jsonPayload = null;

      const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fencedMatch && fencedMatch[1]) {
        jsonPayload = fencedMatch[1].trim();
      } else if (trimmed.startsWith("{")) {
        jsonPayload = trimmed;
      } else {
        const firstBrace = trimmed.indexOf("{");
        const lastBrace = trimmed.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1) {
          jsonPayload = trimmed.slice(firstBrace, lastBrace + 1);
        }
      }

      accionData = JSON.parse(jsonPayload);
    } catch (parseError) {
      console.error("Error al parsear JSON de acción:", parseError);
      return res.status(500).json({
        ok: false,
        msg: "La IA no generó una respuesta válida",
        rawResponse: text,
      });
    }

    res.json({
      ok: true,
      accion: accionData,
    });
  } catch (error) {
    console.error("Error en agente conversacional:", error);

    // Mensajes de error más descriptivos según el tipo de error
    let errorMessage = "Error al procesar el comando con la IA.";
    let errorStatus = 500;

    if (error.status === 503) {
      errorMessage =
        "El servicio de IA está temporalmente sobrecargado. Por favor, intenta de nuevo en unos segundos.";
      errorStatus = 503;
    } else if (error.status === 429) {
      errorMessage =
        "Demasiadas solicitudes. Por favor, espera un momento antes de intentar de nuevo.";
      errorStatus = 429;
    } else if (error.message && error.message.includes("overloaded")) {
      errorMessage =
        "El modelo de IA está sobrecargado. Intenta nuevamente en unos segundos.";
      errorStatus = 503;
    }

    res.status(errorStatus).json({
      ok: false,
      msg: errorMessage,
      details: error.message,
    });
  }
};

module.exports = {
  generarDiagramaUML,
  generarDiagramaUMLConImagen,
  agenteConversacionalUML,
};
