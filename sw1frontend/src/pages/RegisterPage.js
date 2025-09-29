import React, { useContext, useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthContext } from '../auth/AuthContext';
import Swal from 'sweetalert2';

export const RegisterPage = () => {

  const { register } = useContext( AuthContext )

  const [form, setform] = useState({
    email: '',
    nombre: '',
    password: '',
  });

  const onChange = ({ target }) => {
      const { name, value } = target;
    setform({
      ...form,
      [name]: value
    });
  }

  const onSubmit = async( ev ) => {
      ev.preventDefault();
      // console.log(form)
      const { email, password, nombre} = form;
     const msg =  await register(nombre, email , password);
      if ( msg !== true ) {
        Swal.fire('error', msg,'error');
      }
  }
  const todoOk = () => {
    return (
      form.email.trim().length > 0 &&
      form.password.trim().length > 0 &&
      form.nombre.trim().length > 0
    );
  }
  

  return (
    <form
     className="login100-form validate-form flex-sb flex-w"
     onSubmit={ onSubmit }
     >
        <span className="login100-form-title mb-3">
          Chat - Registro
        </span>

        <div className="wrap-input100 validate-input mb-3">
          <input
           className="input100"
            type="text"
            name="nombre" 
            placeholder="Nombre" 
            value={ form.nombre }
            onChange={ onChange }
            />
          <span className="focus-input100"></span>
        </div>

        
        <div className="wrap-input100 validate-input mb-3">
          <input 
          className="input100"
           type="email" 
           name="email" 
           placeholder="Email" 
           value={ form.email }
           onChange={ onChange }
           />
          <span className="focus-input100"></span>
        </div>
        
        
        <div className="wrap-input100 validate-input mb-3">
          <input 
          className="input100"
          type="password"
          name="password"
          placeholder="Password" 
          value={ form.password }
          onChange={ onChange }          
          />
          <span className="focus-input100"></span>
        </div>
        
        <div className="row mb-3">
          <div className="col text-right">
            <Link to='/auth/login' className="txt1">
              Ya tienes cuenta?
            </Link>
          </div>
        </div>

        <div className="container-login100-form-btn m-t-17">
          <button 
          className="login100-form-btn"
          type='submit'
          disabled= { !todoOk()}
          >
            Crear cuenta
          </button>
        </div>

  </form>
  )
}
