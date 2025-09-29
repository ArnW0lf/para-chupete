import React, { useContext } from 'react'
import { ChatConext } from '../context/chat/ChatContext';
import { types } from '../types/types';
import { fetchConnToken } from '../helpers/fetch';

export const SidebrChantItem = ({ usuario }) => {

  const { chatState, dispatch } = useContext( ChatConext );
  const { chatActivo } = chatState;
  const onClick = async() => {
        dispatch({
          type: types.activarChat,
          payload: usuario.uid
        });

        //cargar los mensajes del chat
        const resp = await fetchConnToken(`mensajes/${ usuario.uid}`);
        console.log(resp);  
        dispatch({
          type: types.cargarMensajes,
          payload: resp.mensajes
        })

        // TODO: Mover el scroll
      }
  return (
    <div 
    className={`chat_list ${ (usuario.uid === chatActivo) && 'active_chat' }`}
    onClick={ onClick }
    >
        {/* actibe_chat */}
    <div className="chat_people">
        <div className="chat_img"> 
            <img src="https://img.freepik.com/premium-vector/person-with-blue-shirt-that-says-name-person_1029948-7040.jpg" alt="sunil" />
        </div>
        <div className="chat_ib">
            <h5>{ usuario.nombre }</h5>

            {
              ( usuario.online ) 
              ? <span className="text-success">Online</span>
              : <span className="text-danger">Offline</span>
            }
         
        </div>
    </div>
    </div>
  )
}
