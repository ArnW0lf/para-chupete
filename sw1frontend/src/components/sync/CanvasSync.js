import React, { useContext, useEffect, useRef, useState } from 'react';
import { useCanvasContext } from '../../context/CanvasContext';
import { ChatConext } from '../../context/chat/ChatContext';
import { types } from '../../types/types';
import { fetchConnToken } from '../../helpers/fetch';
import { SocketContext } from '../../context/SocketContext';

const CanvasSync = () => {
  const { chatState, dispatch } = useContext(ChatConext);
  const { actions, components } = useCanvasContext();
  const [lastGrupoActivo, setLastGrupoActivo] = useState(null);
  const { socket } = useContext(SocketContext);
  const debounceTimerRef = useRef(null);


  // Para cargar el canvas inicial al unirse a un grupo
  useEffect(() => {
    const cargarCanvasInicial = async () => {
      if (chatState.grupoActivo && chatState.grupoActivo !== lastGrupoActivo) {
        setLastGrupoActivo(chatState.grupoActivo);

        try {
          // Cargar el canvas del grupo desde el servidor
          const resp = await fetchConnToken(`grupos/${chatState.grupoActivo}`, {}, 'GET');

          if (resp.ok && resp.grupo.contenidoCanvas) {
            // Actualizar el estado del canvas con los datos del servidor
            actions.setComponents(resp.grupo.contenidoCanvas.components || []);
          }

          // Unirse a la sala de socket del grupo
          if (socket) {
            socket.emit('join-grupo', chatState.grupoActivo);
          }
        } catch (error) {
          console.error('Error al cargar canvas inicial:', error);
        }
      }
    };

    cargarCanvasInicial();
  }, [chatState.grupoActivo, lastGrupoActivo, actions, socket]);

  // Para emitir cambios cuando el canvas cambia
  useEffect(() => {
    const emitirCambiosCanvas = () => {
      if (socket && chatState.grupoActivo && Array.isArray(components)) {
        // Cancelar cualquier timer pendiente para evitar múltiples emisiones
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        // Emitir cambios en tiempo real a través de socket
        socket.emit('canvas:update', {
          groupId: chatState.grupoActivo,
          components: components
        });

        // Programar guardado en la base de datos con un debounce
        debounceTimerRef.current = setTimeout(async () => {
          try {
            const contenidoCanvas = {
              components,
              canvasWidth: 1000,
              canvasHeight: 2000,
            };

            await fetchConnToken(`grupos/${chatState.grupoActivo}/canvas`, {
              contenidoCanvas,
            }, 'PUT');
          } catch (error) {
            console.error('Error al guardar canvas:', error);
          }
        }, 500); // Guardar en la BD después de 500ms sin cambios
      }
    };

    emitirCambiosCanvas();

    // Limpieza del timer cuando el componente se desmonte
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [components, socket, chatState.grupoActivo]);


  // useEffect(() => {
  //   const guardarYEmitirCanvas = async () => {
  //     if (socket && chatState.grupoActivo && Array.isArray(components)) {
  //       const contenidoCanvas = {
  //         components,
  //         canvasWidth: 1000,
  //         canvasHeight: 2000,
  //       };
  //       try {
  //         await fetchConnToken(`grupos/${chatState.grupoActivo}/canvas`, {
  //           contenidoCanvas,
  //         }, 'PUT');
  //       } catch (error) {
  //         console.error('Error al guardar canvas automáticamente:', error);
  //       }
  //     }
  //   };

  //   guardarYEmitirCanvas();
  // }, [components, socket, chatState.grupoActivo]);



  // Para escuchar actualizaciones de otros usuarios
  useEffect(() => {
    const escucharCambiosCanvas = () => {
      if (socket && chatState.grupoActivo) {
        socket.on('canvas:update', (data) => {
          // Solo actualizar si es del grupo activo y si los componentes son diferentes
          // **LA CLAVE**: Asegurarse de que la actualización no provenga de este mismo socket.
          if (data.groupId === chatState.grupoActivo && data.senderId !== socket.id) {
            // Evitar bucles infinitos comparando los componentes
            const componentsString = JSON.stringify(components);
            const newComponentsString = JSON.stringify(data.components);

            if (componentsString !== newComponentsString) {
              console.log('Recibiendo actualización del canvas desde otro usuario.');
              actions.setComponents(data.components);
            }
          }
        });
      }

      return () => {
        // Limpiar listener al desmontar el componente
        if (socket) {
          socket.off('canvas:update');
        }
      };
    };

    return escucharCambiosCanvas();
  }, [socket, chatState.grupoActivo, actions]);

  return null;
};

export default CanvasSync;