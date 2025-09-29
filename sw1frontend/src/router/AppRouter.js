import React, { useContext, useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ChatPage } from '../pages/ChatPage'
import { LoginPage } from '../pages/LoginPage'
import { RegisterPage } from '../pages/RegisterPage'
import { AuthRouter } from './AuthRouter'
import { AuthContext } from '../auth/AuthContext'
import { PublicRoute } from './PublicRoute'
import { PrivateRoute } from './PrivateRoute'
import CanvasSync from '../components/sync/CanvasSync'

export const AppRouter = () => {
     const { auth, verificaToken} = useContext( AuthContext );
       
     useEffect(() => {
         verificaToken();
     }, [verificaToken])
      
     if ( auth.checking ) {
       return <h1>Espere porfavor</h1>
     }
  
     return (
       <>
         {/* Colocamos CanvasSync fuera de Routes, envuelto en un Fragment */}
         {auth.logged && <CanvasSync />}
         
         <Routes>
           <Route path="/auth/*" element={
             <PublicRoute isAuthenticated={auth.logged}>
               <AuthRouter />
             </PublicRoute>
           } />
           
           <Route path="/" element={
             <PrivateRoute isAuthenticated={auth.logged}>
               <ChatPage />
             </PrivateRoute>
           } />

           {/* Ruta por defecto */}
           <Route path="*" element={<Navigate to="/" replace />} />
         </Routes>
       </>
     )
}