import React, { createContext, useCallback, useState } from 'react'
import { fetchConnToken, fetchSinToken } from '../helpers/fetch';

export const AuthContext = createContext();

const initialState = {
    uid: null,
    checking: true,
    logged: false,
    name: null,
    email: null,
};

export const AuthProvider = ({ children }) => {

   const [auth, setauth] = useState(initialState)

    const login = async( email, password ) => {

        const resp =  await fetchSinToken('login', { email, password}, 'POST');
        
        if ( resp.ok ) {
            localStorage.setItem('token', resp.token );

            const { usuario } = resp;
            setauth({
                uid: usuario.uid,
                checking: false,
                logged: true,
                name: usuario.nombre,
                email: usuario.email,
            })
        }
        return resp.ok;
    }

    const register = async( nombre, email, password ) => {
     
        const resp = await fetchSinToken('login/new', { email, password, nombre }, 'POST');

            if ( resp.ok ) {
                localStorage.setItem('token', resp.token);               
                const { usuario } = resp;
                setauth({
                    uid: usuario.uid,
                    checking: false,
                    logged: true,
                    name: usuario.nombre,
                    email: usuario.email,
                })
                console.log('autenticado!')
                return true;
            }
            return resp.msg;
    }

    const verificaToken =  useCallback( async() => {

        const token = localStorage.getItem('token');

        if ( !token ) {
            setauth({
                uid: null,
                checking: false,
                logged: false,
                name: null,
                email: null,
            })
            return false;
        }

        const resp = await fetchConnToken('login/renew');
        if ( resp.ok ) {
            localStorage.setItem('token', resp.token);               
            const { usuario } = resp;
            setauth({
                uid: usuario.uid,
                checking: false,
                logged: true,
                name: usuario.nombre,
                email: usuario.email,
            })
            return true;
        } else {
            setauth({
                uid: null,
                checking: false,
                logged: false,
                name: null,
                email: null,
            })
            return false;
        }
    },[])


    const logout = () => {
        localStorage.removeItem('token');
        setauth({
            checking: false,
            logged: false,
        })
    } 

    return (
        <AuthContext.Provider value={{
            auth,
            login,
            register,
            logout,
            verificaToken, 
        }}>
            { children }
        </AuthContext.Provider>
    )
}
