
import React, { useContext, useState, useEffect } from 'react'

import '../css/chat.css';
import { InboxPeople } from '../components/InboxPeople';
import { Message } from '../components/Message';
import { ChatConext } from '../context/chat/ChatContext';
import Builder from './Builder';
import { types } from '../types/types';
import { fetchConnToken } from '../helpers/fetch';
// En ChatPage.js


export const ChatPage = () => {

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { chatState, dispatch } = useContext(ChatConext);

  useEffect(() => {
    const cargarGrupos = async () => {
      const resp = await fetchConnToken('grupos');
      const grupos = resp.grupos || [];
      dispatch({
        type: types.gruposCargados,
        payload: grupos
      });

      // Si hay grupos y no hay ninguno activo, activa el primero automáticamente.
      if (grupos.length > 0 && !chatState.grupoActivo) {
        const primerGrupo = grupos[0];
        const respGrupo = await fetchConnToken(`grupos/${primerGrupo._id}`);
        if (respGrupo.ok) {
          dispatch({
            type: types.activarGrupo,
            payload: primerGrupo._id
          });
          dispatch({
            type: types.cargarGrupo,
            payload: respGrupo.grupo.contenidoCanvas || { tables: [], relationships: [] }
          });
        }
      }
    }
    cargarGrupos();
  }, [dispatch, chatState.grupoActivo]);

  return (
    <div className="messaging">
      <div className={`inbox_msg ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>

        <button
          className="sidebar-toggle-btn"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        >
          {isSidebarCollapsed ? '»' : '«'}
        </button>

        <InboxPeople />
        {
          (chatState.chatActivo)
            ? <Message />
            : <Builder />
        }

      </div>


    </div>

  )
}
