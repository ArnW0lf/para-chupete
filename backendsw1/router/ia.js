const { Router } = require("express");
const { check } = require("express-validator");
const multer = require("multer");

const { validarCampos } = require("../middlewares/validar-campos");
const { validarJWT } = require("../middlewares/validar-jwt");
const {
  generarDiagramaUML,
  generarDiagramaUMLConImagen,
  agenteConversacionalUML,
} = require("../controllers/ia");

const router = Router();

// Configuración de Multer para guardar en memoria con límites y filtro de imágenes
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // máximo 10MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Solo se permiten archivos de imagen"));
    }
    cb(null, true);
  },
});

// Generar diagrama UML a partir de un prompt de texto
router.post(
  "/generar-diagrama",
  [
    validarJWT,
    check("prompt", "El prompt es obligatorio").not().isEmpty(),
    validarCampos,
  ],
  generarDiagramaUML
);

// Generar diagrama UML a partir de una imagen
router.post(
  "/generar-diagrama-imagen",
  [
    validarJWT,
    upload.single("diagramImage"), // 'diagramImage' debe coincidir con el nombre del campo en el FormData
    validarCampos,
  ],
  generarDiagramaUMLConImagen
);

// Agente conversacional para modificar diagramas
router.post(
  "/agente-conversacional",
  [
    validarJWT,
    check("comando", "El comando es obligatorio").not().isEmpty(),
    validarCampos,
  ],
  agenteConversacionalUML
);

module.exports = router;
