const express = require('express');
const cors = require('cors');
const { dbConnection } = require('./database/config');
require('dotenv').config();

// Crear el servidor de express
const app = express();

// Base de datos
dbConnection();

// CORS
app.use(cors());

// Directorio Público (si lo necesitas en el futuro)
// app.use( express.static('public') );

// Lectura y parseo del body
app.use(express.json());

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/grupos', require('./routes/grupo'));

// =================================================================
// Configuración de Sockets
// =================================================================
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: "*", // En producción, deberías restringirlo a tu dominio del frontend
        methods: ["GET", "POST"]
    }
});

require('./socketController')(io); // Importamos y ejecutamos la lógica de sockets

// Escuchar peticiones
server.listen(process.env.PORT, () => {
    console.log(`Servidor corriendo en puerto ${process.env.PORT}`);
});