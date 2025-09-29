import React, { useContext, useEffect } from 'react';
import { createContext } from 'react';
import { useSocket } from '../hooks/useSocket'
import { AuthContext } from '../auth/AuthContext';
import { ChatConext } from './chat/ChatContext';
import { types } from '../types/types';


export const SocketContext = createContext();


export const SocketProvider = ({ children }) => {

    const { socket, online, conectarSocket, desconectarSocket } = useSocket('http://localhost:8080');
    const { auth } = useContext( AuthContext );
    const { dispatch } = useContext( ChatConext );
    useEffect(() => {  
        if( auth.logged ) {
            conectarSocket(); 
            console.log('conectado')
        }
    }, [ auth, conectarSocket ]);

    useEffect(() => {
        
        if( !auth.logged ) {
            desconectarSocket(); 
        }
    }, [ auth, desconectarSocket ])
    
    useEffect(() => {
        // Escuchar los cambios en los usuarios conectados
        socket?.on('lista-usuarios', ( usuarios) => {
           dispatch({
                type: types.usuairiosCargados,
                payload: usuarios
           })
        })
    }, [ socket, dispatch ])

    useEffect(() => {
      socket?.on('mensaje-personal', ( mensaje ) => {
        dispatch({
            type : types.nuevoMensaje,
            payload: mensaje
        })     
        // TODO: Mover el scroll al final
      })
    }, [socket, dispatch])

    // useEffect(() => {
    //   socket?.on('canvas-grupo', ( id, components ) => {

    //   })
    // }, [socket, dispatch])
    

    // Dentro del SocketProvider, añadir nuevos useEffect para eventos de grupos

    // Cargar grupos
    useEffect(() => {
        socket?.on('lista-grupos', (grupos) => {
            dispatch({
                type: types.gruposCargados,
                payload: grupos
            });
        });
    }, [socket, dispatch]);
    
    
    return (
        <SocketContext.Provider value={{ socket, online }}>
            { children }
        </SocketContext.Provider>
    )
}