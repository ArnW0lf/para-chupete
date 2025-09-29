
const Usuario = require('../models/usuario');
const Mensaje = require('../models/mensaje');
const Grupo = require('../models/grupos')
const usuarioConectado = async (uid) => {

    const usuario = await Usuario.findById(uid);
    // Si el usuario no tiene nombre, es un registro inválido.
    if (usuario && !usuario.nombre) {
        console.log('Error: Usuario sin nombre encontrado en la BD, UID:', uid);
        return null;
    }
    if (!usuario) {
        // Si el usuario no existe, no lo creamos automáticamente
        return null;
    }
    usuario.online = true;
    await usuario.save();
    return usuario;
}

const usuarioDesconectado = async (uid) => {
    const usuario = await Usuario.findById(uid);
    if (!usuario) {
        // Si el usuario no existe, no lo creamos automáticamente
        return null;
    }
    usuario.online = false;
    await usuario.save();
    return usuario;
}

const getUsuaios = async () => {

    const usuarios = await Usuario
        .find()
        .sort('-online');

    return usuarios;
}

const grabarMensaje = async (payload) => {

    try {
        const mensaje = new Mensaje(payload);
        await mensaje.save();

        return mensaje;

    } catch (error) {
        console.log(error)
        return false;
    }
}
// Obtener todos los grupos activos
const getAllGrupos = async () => {
    const grupos = await Grupo.
        find().
        sort('-updatedAt');

    return grupos;
}
module.exports = {
    usuarioConectado,
    usuarioDesconectado,
    getUsuaios,
    grabarMensaje,
    getAllGrupos
}