import React, { useContext, useState } from 'react'
import { SocketContext } from '../context/SocketContext';
import { AuthContext } from '../auth/AuthContext';
import { ChatConext } from '../context/chat/ChatContext';

export const SendMessage = () => {

    const [mensaje, setmensaje] = useState('');
    const { socket } = useContext(SocketContext);
    const { auth } = useContext(AuthContext)
    const {chatState} = useContext(ChatConext)
    const onChange = ({ target }) => {
      setmensaje( target.value)
    }

    const onSubmit = (ev) => {
      ev.preventDefault();
      
      if ( mensaje.length === 0 ) { return; }
      setmensaje('');

      // TODO: Emitir un evento de sockets para enviar el mensaje
      // {
      //   de: // UID del usuario enviando el mensaje
      //   para: // UID del usuario que recibe el mensaje
      //   mensaje: //lo que quieor enviar

      // }

      socket.emit('mensaje-personal', {
        de: auth.uid,
        para: chatState.chatActivo,
        mensaje
      });
      // TODO: hacer el dispatch de el mensaje...

    }
  return (
    <form onSubmit={ onSubmit }>
              <div className="type_msg row">
                  <div className="input_msg_write col-sm-9">
                      <input 
                      type="text" 
                      className="write_msg"
                      placeholder="Mensaje..." 
                      value={ mensaje }
                      onChange={ onChange }
                      />
                  </div>
                  <div className="col-sm-3 text-center">
                      <button
                       className="msg_send_btn mt-3" type="submit"
               
                       >
                          enviar
                      </button>
                  </div>
              </div>
    </form>
  )
}
;