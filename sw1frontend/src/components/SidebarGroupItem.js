import { useContext } from "react";
import { ChatConext } from "../context/chat/ChatContext";
import { types } from "../types/types";
import { fetchConnToken } from "../helpers/fetch";

export const SidebarGroupItem = ({ grupo }) => {
    const { chatState, dispatch } = useContext(ChatConext);
    const activarGrupo = async () => {
        dispatch({
            type: types.activarGrupo,
            payload: grupo._id
        });
        const resp = await fetchConnToken(`grupos/${grupo._id}`);
        if (resp.ok && resp.grupo) {
            const contenido = resp.grupo.contenidoCanvas || { tables: [], relationships: [] };

            // Aseguramos que el payload tenga la estructura que el lienzo espera
            const payload = {
                tables: contenido.tables || contenido.components || [],
                relationships: contenido.relationships || []
            };

            dispatch({
                type: types.cargarGrupo,
                payload: payload
            });
        }
    }


    return (
        <div
            className={`chat_list ${(chatState.grupoActivo === grupo._id) && 'active_chat'}`}
            onClick={activarGrupo}
        >
            <div className="chat_people">
                <div className="chat_img">
                    <img src="https://previews.123rf.com/images/plahotya/plahotya1709/plahotya170900012/85239556-dise%C3%B1o-de-logotipo-del-grupo-de-personas-ilustraci%C3%B3n-del-icono-de-vector-trabajo-en-equipo-s%C3%ADmbolo.jpg" alt="sunil" />
                </div>
                <div className="chat_ib">
                    <h5>{grupo.nombre}</h5>
                </div>
            </div>
        </div>
    )
}