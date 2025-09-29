import React, { useContext, useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '../pages/LoginPage'
import { RegisterPage } from '../pages/RegisterPage'
import '../css/login-register.css';
import { AuthContext } from '../auth/AuthContext';
export const AuthRouter = () => {

    const { auth, verificaToken} = useContext( AuthContext );

     
    useEffect(() => {
       verificaToken();
    }, [verificaToken])
    

  if ( auth.checking ) {
    return <h1>Espere porfavor</h1>
  }

  return (
   
      <div className="limiter">
	     	<div className="container-login100">
		  	<div className="wrap-login100 p-t-50 p-b-90">     
        <Routes>
          <Route path='login' element={ <LoginPage/> } />
          <Route path='register' element={ <RegisterPage/> } />
          <Route path='*' element={ <Navigate to='login' replace={true}/> } />
        </Routes>
         </div>
          </div>
      </div>
   
  )
}
