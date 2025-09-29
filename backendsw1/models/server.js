// Servidor de Express
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');
const cors = require('cors'); // Verifica que esta línea esté presente
const { dbConecction } = require('../database/config');
const Sockets = require('./sockets');

class Server {

    constructor() {

        this.app = express();
        this.port = process.env.PORT;

        // Conectar a DB
        dbConecction();
        // Http server
        this.server = http.createServer(this.app);

        // Configuraciones de sockets
        this.io = socketio(this.server, { /* configuraciones */ });
    }

    middlewares() {
        // Desplegar el directorio público
        this.app.use(express.static(path.resolve(__dirname, '../public')));

        this.app.use(cors({
            origin: '*',  // O especifica los orígenes permitidos
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'x-token']  // Agrega 'x-token' aquí
        }));
        // Inyectar 'io' en el request para que esté disponible en los controladores
        this.app.use((req, res, next) => {
            req.io = this.io;
            next();
        });
        //TODO: CORS
        this.app.use(express.json())
        // API ENDPoints
        this.app.use('/api/login', require('../router/auth'));
        this.app.use('/api/mensajes', require('../router/mensajes'));
        this.app.use('/api/grupos', require('../router/grupo'));
    }

    // Esta configuración se puede tener aquí o como propieda de clase
    // depende mucho de lo que necesites
    configurarSockets() {
        new Sockets(this.io);
    }

    execute() {

        // Inicializar Middlewares
        this.middlewares();

        // Inicializar sockets
        this.configurarSockets();

        // Inicializar Server
        this.server.listen(this.port, () => {
            console.log('Server corriendo en puerto:', this.port);
        });
    }

}


module.exports = Server;