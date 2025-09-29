import { useCallback, useEffect, useMemo, useState } from 'react';
import io from 'socket.io-client';


export const useSocket = ( serverPath ) => {
    
    // const socket = useMemo(() => io.connect( serverPath, {transports: ['websocket']} ), [ serverPath ] );
    const [socket, setsocket] = useState(null);
    const [ online, setOnline ] = useState(false);

    const conectarSocket = useCallback( () => {

        const token = localStorage.getItem('token');

         const socketTemp = io.connect( serverPath,{
                transports: ['websocket'],
                autoConnect: true,
                forceNew: true,
                query: {
                    'x-token': token
                }
            } )
        setsocket( socketTemp );
      },[serverPath]);

    const desconectarSocket = useCallback(() => {
         socket?.disconnect(); 
        },[socket]);
    

    useEffect(() => {
        setOnline( socket?.connected );
    }, [socket])

    useEffect(() => {
        socket?.on('connect', () => setOnline( true ));
    }, [ socket ])

    useEffect(() => {
        socket?.on('disconnect', () => setOnline( false ));
    }, [ socket ])

    // aqui imprimo el socket para q sirva
    // console.log(socket)
    return {
        socket,
        online,
        conectarSocket,
        desconectarSocket
        
    }
}


