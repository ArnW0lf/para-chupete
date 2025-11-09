/*
  path: /api/grupos
*/
const { Router } = require('express');
const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
const {
  crearGrupo,
  obtenerGrupos,
  obtenerGrupo,
  actualizarCanvas,
  generarBackend,
  generarFrontendFlutter,
} = require('../controllers/grupos');

const router = Router();

// Aplicar middleware JWT a todas las rutas
router.use(validarJWT);

// Crear un nuevo grupo
router.post('/', check('nombre', 'El nombre es obligatorio').not().isEmpty(), crearGrupo);

// Obtener todos los grupos del usuario
router.get('/', obtenerGrupos);

// Obtener un grupo específico
router.get('/:id', obtenerGrupo);

// Actualizar el canvas de un grupo
router.put('/:id/canvas', actualizarCanvas);

router.get('/:id/generar', generarBackend);

// NUEVA RUTA PARA FLUTTER
router.get('/:id/generar-flutter', generarFrontendFlutter);

module.exports = router;
