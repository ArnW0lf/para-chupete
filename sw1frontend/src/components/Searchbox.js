import React, { useContext, useState } from 'react'
import { AuthContext } from '../auth/AuthContext'
import { ChatConext } from '../context/chat/ChatContext'
import { types } from '../types/types'
import '../styles/bulder.css'
import { fetchConnToken } from '../helpers/fetch'
import '../styles/bulder.css'
import { SocketContext } from '../context/SocketContext'

export const Searchbox = () => {
    const { auth, logout } = useContext(AuthContext);
    const { dispatch,chatState } = useContext(ChatConext);
    // Estado para controlar el modal
    const [showModal, setShowModal] = useState(false);
    const [nombreGrupo, setNombreGrupo] = useState('');
    const [isLoading, setIsLoading] = useState(false);
      const { socket } = useContext(SocketContext);
    // Abrir modal para crear grupo
    const openNewGroupModal = () => {
        setShowModal(true);
    }
    // Cerrar modal
    const closeModal = () => {
        setShowModal(false);
        setNombreGrupo('');
    }
    // Manejar cambio en el input
    const handleInputChange = (e) => {
        setNombreGrupo(e.target.value);
    }
    // Crear el grupo
    const createGroup = async () => {
        console.log(nombreGrupo)
        if (nombreGrupo.trim().length === 0) return;
        setIsLoading(true);
        try {
            const resp = await fetchConnToken('grupos', { nombre: nombreGrupo }, 'POST');
            
            if (resp.ok) {
                // Añadir el nuevo grupo al estado
                dispatch({
                    type: types.gruposCargados,
                     payload: [ resp.grupo, ...chatState.grupos ] // Esto añadiría solo el nuevo grupo
                });
                
                 // Emitir evento al servidor para que notifique a todos los usuarios
                 socket.emit('crear-grupo', resp.grupo);

                // Cerrar el modal
                closeModal();
            } else {
                console.log('Error al crear grupo:', resp);
            }
        } catch (error) {
            console.log('Error al crear grupo:', error);
        } finally {
            setIsLoading(false);
        }
    }

    // Manejar tecla Enter para crear grupo
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !isLoading && nombreGrupo.trim() !== '') {
            createGroup();
        }
    }

    return (  
        <>
            <div className="headind_srch">
                <div className="recent_heading mt-2">
                    <h4>{auth.name}</h4>
                </div>
                <div className="srch_bar">
                    <div className="stylish-input-group">
                        <button className='btn' onClick={openNewGroupModal}>
                            New Group
                        </button>
                        <button
                            className="btn text-danger"
                            onClick={logout}
                        >
                            close
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Modal para crear grupo */}
            {showModal && (
                <div className="grupo-modal-backdrop" onClick={closeModal}>
                    <div className="grupo-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="grupo-modal-header">
                            <h5>Nuevo Grupo</h5>
                            <button className="grupo-close-button" onClick={closeModal}>×</button>
                        </div>
                        <div className="grupo-modal-body">
                            <input 
                                type="text" 
                                className="form-control" 
                                placeholder="Nombre del grupo"
                                value={nombreGrupo}
                                onChange={handleInputChange}
                                onKeyPress={handleKeyPress}
                                autoFocus
                            />
                        </div>
                        <div className="grupo-modal-footer">
                            <button 
                                className="btn btn-primary btn-sm" 
                                onClick={createGroup}
                                disabled={isLoading || nombreGrupo.trim() === ''}
                            >
                                {isLoading ? 'Creando...' : 'Crear'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}