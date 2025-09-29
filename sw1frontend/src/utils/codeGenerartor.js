/**
 * Funciones para generar código React y Angular a partir de componentes del canvas
 */

/**
 * Genera código React a partir de los componentes del canvas
 * @param {Array} components - Lista de componentes
 * @returns {string} Código React generado
 */
export const generateReactCode = (components) => {
  if (!components || !Array.isArray(components) || components.length === 0) {
    console.error('Componentes no válidos');
    return '// No hay componentes para generar código';
  }

  let imports = `import React from 'react';\n\n`;
  let componentCode = `const GeneratedComponent = () => {\n  return (\n    <div className="container">\n`;
  
  components.forEach(comp => {
    const baseStyle = {
      position: 'absolute',
      left: `${comp.x}px`,
      top: `${comp.y}px`,
      width: `${comp.width}px`,
      height: `${comp.height}px`
    };
  
    let style = { ...baseStyle };
    switch (comp.type) {
      case 'text':
        style = {
          ...style,
          fontSize: `${comp.props.fontSize}px`,
          fontFamily: comp.props.fontFamily,
          color: comp.props.fill,
          textAlign: comp.props.align,
        };
        componentCode += `      <p style={${JSON.stringify(style)}}>${comp.props.text}</p>\n`;
        break;
      case 'button':
        style = {
          ...style,
          backgroundColor: comp.props.fill,
          borderRadius: `${comp.props.cornerRadius}px`,
          color: comp.props.textColor,
          fontSize: `${comp.props.fontSize}px`,
          fontFamily: comp.props.fontFamily,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          border: 'none',
        };
        componentCode += `      <button style={${JSON.stringify(style)}}>${comp.props.text}</button>\n`;
        break;
      case 'input':
        style = {
          ...style,
          backgroundColor: comp.props.fill,
          borderRadius: `${comp.props.cornerRadius}px`,
          fontSize: `${comp.props.fontSize}px`,
          fontFamily: comp.props.fontFamily,
          border: `1px solid ${comp.props.stroke}`,
          padding: '0 10px',
        };
        componentCode += `      <input style={${JSON.stringify(style)}} placeholder="${comp.props.placeholder}" />\n`;
        break;
      case 'rectangle':
        style = {
          ...style,
          backgroundColor: comp.props.fill,
          borderRadius: `${comp.props.cornerRadius}px`,
          border: `${comp.props.strokeWidth}px solid ${comp.props.stroke}`,
          opacity: comp.props.opacity
        };
        componentCode += `      <div style={${JSON.stringify(style)}}></div>\n`;
        break;
      case 'image':
        style = {
          ...style,
          borderRadius: `${comp.props.cornerRadius}px`,
          opacity: comp.props.opacity,
          objectFit: 'cover',
        };
        componentCode += `      <img style={${JSON.stringify(style)}} src="${comp.props.src}" alt="Imagen" />\n`;
        break;
      default:
        break;
    }
  });
  
  componentCode += `    </div>\n  );\n};\n\nexport default GeneratedComponent;`;
  
  return imports + componentCode;
};

/**
 * Genera solo una vista previa del código Angular
 * @param {Array} components - Lista de componentes
 * @param {string} componentName - Nombre del componente
 * @returns {string} Vista previa del código TypeScript
 */
export const generateAngularPreview = (components, componentName = "header") => {
  if (!components || !Array.isArray(components) || components.length === 0) {
    return '// No hay componentes para generar código';
  }

  // Normalizar el nombre del componente
  const normalizedName = componentName
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
  
  // Generar archivo TypeScript para previsualización
  return generateTypeScriptFile(components, normalizedName);
};

/**
 * Genera código Angular y actualiza el estado (usar con useEffect o manejadores de eventos)
 * @param {Array} components - Lista de componentes
 * @param {string} componentName - Nombre del componente a generar
 * @param {Function} dispatch - Función dispatch del contexto
 * @param {Object} types - Objeto con los tipos de acciones
 */
export const generateAngularCode = (components, componentName, dispatch, types) => {
  // Verificar si tenemos los parámetros necesarios
  if (!components || !Array.isArray(components) || components.length === 0) {
    console.error('Componentes no válidos');
    return generateAngularPreview([], componentName); // Retornar una vista previa vacía
  }
  
  if (!dispatch || !types) {
    console.log('Falta dispatch o types, retornando solo vista previa');
    return generateAngularPreview(components, componentName);
  }

  try {
    // Normalizar el nombre del componente
    const normalizedName = componentName
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();

    // Generar todos los archivos
    const tsCode = generateTypeScriptFile(components, normalizedName);
    const htmlCode = generateHTMLFile(components);
    const cssCode = generateCSSFile(components);
    const specCode = generateSpecFile(normalizedName);
    
    // Hacer la actualización del estado en un timeout para evitar el error
    setTimeout(() => {
      // Actualizar el estado con los archivos generados
      dispatch({
        type: types.actualizarNombreComponenteAngular,
        payload: normalizedName
      });
      
      dispatch({
        type: types.actualizarComponenteAngularTS,
        payload: tsCode
      });
      
      dispatch({
        type: types.actualizarComponenteAngularHTML,
        payload: htmlCode
      });
      
      dispatch({
        type: types.actualizarComponenteAngularCSS,
        payload: cssCode
      });
      
      dispatch({
        type: types.actualizarComponenteAngularSpec,
        payload: specCode
      });
      
      console.log(`Componente Angular '${normalizedName}' generado con éxito`);
    }, 0);
    
    // Retornar una vista previa para mostrar inmediatamente
    return tsCode;
  } catch (error) {
    console.error('Error al generar código Angular:', error);
    return '// Error al generar código Angular';
  }
};

/**
 * Genera el archivo TypeScript (.component.ts) del componente Angular
 * @param {Array} components - Lista de componentes
 * @param {string} componentName - Nombre normalizado del componente
 * @returns {string} Contenido del archivo TypeScript
 */
function generateTypeScriptFile(components, componentName) {
  const className = componentName
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  // Verificar si hay inputs para determinar si necesitamos FormsModule
  const hasInputs = components.some(comp => comp.type === 'input');

  let imports = `import { Component, OnInit } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n`;
  
  if (hasInputs) {
    imports += `import { FormsModule } from '@angular/forms';\n\n`;
  } else {
    imports += '\n';
  }
  
  let componentCode = `@Component({\n  selector: 'app-${componentName}',\n  templateUrl: './${componentName}.component.html',\n  styleUrls: ['./${componentName}.component.css'],\n  standalone: true,\n  imports: [CommonModule${hasInputs ? ', FormsModule' : ''}]\n})\nexport class ${className}Component implements OnInit {\n`;

  // Añadir propiedades basadas en los componentes
  const inputVars = new Set();
  
  components.forEach(comp => {
    if (comp.type === 'input') {
      const varName = comp.props.name || 'inputValue';
      if (!inputVars.has(varName)) {
        componentCode += `  ${varName}: string = '';\n`;
        inputVars.add(varName);
      }
    }
  });
  
  // Añadir método para botones (solo uno general)
  componentCode += `\n  onButtonClick(): void {\n    // Implementar lógica del botón\n    console.log('Botón clickeado');\n  }\n\n`;

  // Añadir métodos del ciclo de vida
  componentCode += `  constructor() { }\n\n  ngOnInit(): void {\n    // Inicialización del componente\n  }\n`;
  
  componentCode += `}\n`;
  
  return imports + componentCode;
}

/**
 * Genera el archivo HTML (.component.html) del componente Angular
 * @param {Array} components - Lista de componentes
 * @returns {string} Contenido del archivo HTML
 */
function generateHTMLFile(components) {
  if (!components || components.length === 0) {
    return '<div class="container"></div>';
  }
  
  let html = '<div class="container">';
  
  components.forEach(comp => {
    switch (comp.type) {
      case 'text':
        html += ` <p [ngStyle]="{ 'position': 'absolute', 'left.px': ${comp.x}, 'top.px': ${comp.y}, 'width.px': ${comp.width}, 'height.px': ${comp.height}, 'font-size.px': ${comp.props.fontSize || 16}, 'font-family': '${comp.props.fontFamily || 'Arial'}', 'color': '${comp.props.fill || '#000000'}', 'text-align': '${comp.props.align || 'left'}' }">${comp.props.text || 'Texto de ejemplo'}</p>`;
        break;
      case 'button':
        html += ` <button (click)="onButtonClick()" [ngStyle]="{ 'position': 'absolute', 'left.px': ${comp.x}, 'top.px': ${comp.y}, 'width.px': ${comp.width}, 'height.px': ${comp.height}, 'background-color': '${comp.props.fill || '#007bff'}', 'border-radius.px': ${comp.props.cornerRadius || 4}, 'color': '${comp.props.textColor || '#ffffff'}', 'font-size.px': ${comp.props.fontSize || 14}, 'font-family': '${comp.props.fontFamily || 'Arial'}' }">${comp.props.text || 'Botón'}</button>`;
        break;
      case 'input':
        html += ` <input [(ngModel)]="${comp.props.name || 'inputValue'}" placeholder="${comp.props.placeholder || 'Ingrese texto...'}" [ngStyle]="{ 'position': 'absolute', 'left.px': ${comp.x}, 'top.px': ${comp.y}, 'width.px': ${comp.width}, 'height.px': ${comp.height}, 'background-color': '${comp.props.fill || '#ffffff'}', 'border-radius.px': ${comp.props.cornerRadius || 4}, 'font-size.px': ${comp.props.fontSize || 14}, 'font-family': '${comp.props.fontFamily || 'Arial'}', 'border': '1px solid ${comp.props.stroke || '#cccccc'}', 'padding': '0 10px' }" />`;
        break;
      case 'rectangle':
        html += ` <div [ngStyle]="{ 'position': 'absolute', 'left.px': ${comp.x}, 'top.px': ${comp.y}, 'width.px': ${comp.width}, 'height.px': ${comp.height}, 'background-color': '${comp.props.fill || '#f0f0f0'}', 'border-radius.px': ${comp.props.cornerRadius || 0}, 'border': '${comp.props.strokeWidth || 0}px solid ${comp.props.stroke || 'transparent'}', 'opacity': ${comp.props.opacity || 1} }"></div>`;
        break;
      case 'image':
        html += ` <img [src]="'${comp.props.src || 'assets/placeholder.jpg'}'" alt="Imagen" [ngStyle]="{ 'position': 'absolute', 'left.px': ${comp.x}, 'top.px': ${comp.y}, 'width.px': ${comp.width}, 'height.px': ${comp.height}, 'border-radius.px': ${comp.props.cornerRadius || 0}, 'opacity': ${comp.props.opacity || 1}, 'object-fit': 'cover' }" />`;
        break;
      default:
        break;
    }
  });
  
  html += ' </div>';
  
  return html;
}

/**
 * Genera el archivo CSS (.component.css) del componente Angular
 * @param {Array} components - Lista de componentes
 * @returns {string} Contenido del archivo CSS
 */
function generateCSSFile(components) {
  return `.container {
  position: relative;
  width: 100%;
  height: 100%;
}`;
}

/**
 * Genera el archivo de pruebas (.component.spec.ts) del componente Angular
 * @param {string} componentName - Nombre normalizado del componente
 * @returns {string} Contenido del archivo de pruebas
 */
function generateSpecFile(componentName) {
  const className = componentName
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  return `import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ${className}Component } from './${componentName}.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

describe('${className}Component', () => {
  let component: ${className}Component;
  let fixture: ComponentFixture<${className}Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [${className}Component, CommonModule, FormsModule]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(${className}Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});`;
}