import React, { createContext, useReducer } from "react";
import { ChatReducer } from "./Chateducer";
import JSZip from 'jszip';
import FileSaver from 'file-saver';

export const ChatConext = createContext();

const initialState = {
    uid: '',
    chatActivo: null, //UID del usuario al q yo quiero enviar mensajes
    grupoActivo: null, // ID del grupo activo
    modoGrupo: false,  // Indica si estamos en modo grupo o chat
    // entonces chat_activo tiene q ser el grupo al q yo quiero enviar
    usuarios: [], // Todos los usuarios de la base de datos
    grupos: [],        // Todos los grupos disponibles
    mensajes: [], // Chat seleccionado
    contenidoCanvas: [], // Contenido del canvas del grupo activo (inicializado como array vacío)
    
    // Nuevo campo para componentes Angular
    componenteAngular: {
        nombre: '',       // Nombre del componente (kebab-case)
        archivoTS: '',    // Archivo TypeScript (.component.ts)
        archivoHTML: '',  // Archivo HTML (.component.html)
        archivoCSS: '',   // Archivo CSS (.component.css)
        archivoSpec: ''   // Archivo de pruebas (.component.spec.ts)
    }
};

export const ChatProvider = ({ children }) => {
    const [chatState, dispatch] = useReducer(ChatReducer, initialState);

    // Función para descargar el ZIP con los archivos del componente
    const descargarComponenteAngular = async () => {
        // Verificar que el componente Angular está generado
        if (!chatState.componenteAngular.nombre || 
            !chatState.componenteAngular.archivoTS) {
            console.error('No hay componente Angular generado para descargar');
            return;
        }

        try {
            // Crear el ZIP
            const zip = new JSZip();
            
            // Crear una carpeta con el nombre del componente
            const folder = zip.folder(chatState.componenteAngular.nombre);
            
            // Añadir los archivos
            folder.file(
                `${chatState.componenteAngular.nombre}.component.ts`, 
                chatState.componenteAngular.archivoTS
            );
            folder.file(
                `${chatState.componenteAngular.nombre}.component.html`, 
                chatState.componenteAngular.archivoHTML
            );
            folder.file(
                `${chatState.componenteAngular.nombre}.component.css`, 
                chatState.componenteAngular.archivoCSS
            );
            folder.file(
                `${chatState.componenteAngular.nombre}.component.spec.ts`, 
                chatState.componenteAngular.archivoSpec
            );
            
            // Generar el blob
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            
            // Descargar el archivo usando FileSaver
            FileSaver.saveAs(zipBlob, `${chatState.componenteAngular.nombre}.zip`);
            
            console.log(`Componente Angular '${chatState.componenteAngular.nombre}' descargado`);
            
        } catch (error) {
            console.error('Error al crear o descargar el ZIP:', error);
        }
    };

    return (
        <ChatConext.Provider value={{
            chatState,
            dispatch,
            descargarComponenteAngular
        }}>
            {children}
        </ChatConext.Provider>
    );
};