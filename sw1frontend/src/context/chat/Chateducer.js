import { types } from "../../types/types";

export const ChatReducer = (state, action) => {
    switch (action.type) {
        case types.usuairiosCargados:
            return {
                ...state,
                usuarios: [...action.payload]
            };

        case types.activarChat:
            if (state.chatActivo === action.payload) return state;
            return {
                ...state,
                chatActivo: action.payload,
                mensajes: []
            };

        case types.nuevoMensaje:
            if (state.chatActivo === action.payload.de ||
                state.chatActivo === action.payload.para
            ) {
                return {
                    ...state,
                    mensajes: [...state.mensajes, action.payload]
                };
            } else {
                return state;
            }

        case types.cargarMensajes:
            return {
                ...state,
                mensajes: [...action.payload]
            };

        // Nuevos casos para grupos
        case types.gruposCargados:
            return {
                ...state,
                grupos: [...action.payload]
            };

        case types.agregarGrupo:
            return {
                ...state,
                grupos: [...action.payload]
            };

        case types.activarGrupo:
            return {
                ...state,
                grupoActivo: action.payload
            };

        case types.cargarGrupo:
            return {
                ...state,
                contenidoCanvas: action.payload
            };

        // Casos para componentes Angular
        case types.actualizarNombreComponenteAngular:
            return {
                ...state,
                componenteAngular: {
                    ...state.componenteAngular || {},
                    nombre: action.payload
                }
            };

        case types.actualizarComponenteAngularTS:
            return {
                ...state,
                componenteAngular: {
                    ...state.componenteAngular || {},
                    archivoTS: action.payload
                }
            };

        case types.actualizarComponenteAngularHTML:
            return {
                ...state,
                componenteAngular: {
                    ...state.componenteAngular || {},
                    archivoHTML: action.payload
                }
            };

        case types.actualizarComponenteAngularCSS:
            return {
                ...state,
                componenteAngular: {
                    ...state.componenteAngular || {},
                    archivoCSS: action.payload
                }
            };

        case types.actualizarComponenteAngularSpec:
            return {
                ...state,
                componenteAngular: {
                    ...state.componenteAngular || {},
                    archivoSpec: action.payload
                }
            };

        default:
            return state;
    }
};