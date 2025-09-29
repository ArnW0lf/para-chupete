import React, { use, useContext } from 'react'
import { SidebrChantItem } from './SidebrChantItem'
import { ChatConext } from '../context/chat/ChatContext'
import { AuthContext } from '../auth/AuthContext';
import { SidebarGroupItem } from './SidebarGroupItem';

export const Sidebar = () => {
    // const chats = [1,2,3,4,5,6];
    const { chatState } = useContext( ChatConext );
    // console.log(chatState.grupos)
    const { auth } = useContext( AuthContext );

  return (
        <div className="inbox_chat">
            {
                chatState.usuarios
                .filter( usuario => usuario.uid !==auth.uid)
                .map( (usuario) => (<SidebrChantItem
                     key={ usuario.uid }
                     usuario={ usuario }
                     />
                    ))
            }
             {
                chatState.grupos && chatState.grupos.length > 0 ? 
                chatState.grupos.map((grupo) => (
                    <SidebarGroupItem
                        key={grupo._id}
                        grupo={grupo}
                    />
                ))
                : <div className="no-groups">No hay grupos disponibles</div>
            }
            
           {/* <!-- Espacio extra para scroll --> */}
            <div className="extra_space"></div>
        </div>
  )
}
