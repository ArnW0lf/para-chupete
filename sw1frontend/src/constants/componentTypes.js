export const COMPONENTS = {
    text: { 
      width: 150, 
      height: 30, 
      props: { 
        text: "Texto de ejemplo", 
        fontSize: 18, 
        fontFamily: "Arial", 
        fill: "#000000",
        align: "left",
      } 
    },
    button: { 
      width: 150, 
      height: 40, 
      props: { 
        text: "Botón", 
        fill: "#007bff", 
        cornerRadius: 6,
        textColor: "#ffffff",
        fontSize: 14,
        fontFamily: "Arial",
      } 
    },
    input: { 
      width: 200, 
      height: 40, 
      props: { 
        placeholder: "Ingrese texto...", 
        fill: "#ffffff", 
        stroke: "#cccccc",
        cornerRadius: 4,
        fontSize: 14,
        fontFamily: "Arial",
        placeholderColor: "#888888"
      } 
    },
    rectangle: { 
      width: 100, 
      height: 100, 
      props: { 
        fill: "#cccccc", 
        stroke: "#999999",
        strokeWidth: 1,
        cornerRadius: 0,
        opacity: 1
      } 
    },
    image: {
      width: 150,
      height: 150,
      props: {
        fill: "#eeeeee",
        src: "/api/placeholder/150/150",
        cornerRadius: 0,
        opacity: 1
      }
    }
  };
  
  // Lista de propiedades comunes para todos los componentes
  export const COMMON_PROPERTIES = [
    { name: 'x', label: 'Posición X', type: 'number' },
    { name: 'y', label: 'Posición Y', type: 'number' },
    { name: 'width', label: 'Ancho', type: 'number' },
    { name: 'height', label: 'Alto', type: 'number' },
  ];
  
  // Mapeo de propiedades específicas por tipo de componente
  export const COMPONENT_SPECIFIC_PROPERTIES = {
    text: [
      { name: 'text', label: 'Texto', type: 'text' },
      { name: 'fontSize', label: 'Tamaño de fuente', type: 'number' },
      { name: 'fontFamily', label: 'Familia de fuente', type: 'select', options: ['Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia'] },
      { name: 'fill', label: 'Color', type: 'color' },
      { name: 'align', label: 'Alineación', type: 'select', options: [
        { value: 'left', label: 'Izquierda' },
        { value: 'center', label: 'Centro' },
        { value: 'right', label: 'Derecha' },
      ]},
    ],
    button: [
      { name: 'text', label: 'Texto', type: 'text' },
      { name: 'fill', label: 'Color de fondo', type: 'color' },
      { name: 'textColor', label: 'Color de texto', type: 'color' },
      { name: 'cornerRadius', label: 'Radio de esquinas', type: 'number' },
      { name: 'fontSize', label: 'Tamaño de fuente', type: 'number' },
      { name: 'fontFamily', label: 'Familia de fuente', type: 'select', options: ['Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia'] },
    ],
    input: [
      { name: 'placeholder', label: 'Placeholder', type: 'text' },
      { name: 'fill', label: 'Color de fondo', type: 'color' },
      { name: 'stroke', label: 'Color de borde', type: 'color' },
      { name: 'cornerRadius', label: 'Radio de esquinas', type: 'number' },
      { name: 'fontSize', label: 'Tamaño de fuente', type: 'number' },
      { name: 'fontFamily', label: 'Familia de fuente', type: 'select', options: ['Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia'] },
      { name: 'placeholderColor', label: 'Color del placeholder', type: 'color' },
    ],
    rectangle: [
      { name: 'fill', label: 'Color de relleno', type: 'color' },
      { name: 'stroke', label: 'Color de borde', type: 'color' },
      { name: 'strokeWidth', label: 'Grosor de borde', type: 'number' },
      { name: 'cornerRadius', label: 'Radio de esquinas', type: 'number' },
      { name: 'opacity', label: 'Opacidad', type: 'range', min: 0, max: 1, step: 0.01 },
    ],
    image: [
      { name: 'src', label: 'URL de la imagen', type: 'text' },
      { name: 'cornerRadius', label: 'Radio de esquinas', type: 'number' },
      { name: 'opacity', label: 'Opacidad', type: 'range', min: 0, max: 1, step: 0.01 },
    ]
  };