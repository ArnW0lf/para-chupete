const { usuarioConectado, usuarioDesconectado, getUsuaios, grabarMensaje, getAllGrupos } = require("../controllers/sockets");
const { comprobarJWT } = require("../helpers/jwt");

class Sockets {
    constructor(io) {
        this.io = io;
        // Mejorar el mapa de salas de grupo
        this.grupoRooms = new Map();
        this.userRooms = new Map(); // userId -> Set de groupIds
        this.operationQueue = new Map();
        this.socketEvents();
    }

    socketEvents() {
        const self = this;

        this.io.on('connection', async (socket) => {
            const [valido, uid] = comprobarJWT(socket.handshake.query['x-token']);

            if (!valido) {
                console.log('Socket no identificado');
                return socket.disconnect();
            }

            await usuarioConectado(uid);

            // Unir al usuario a una sala de socket.io con su UID
            socket.join(uid);

            // Inicializar las salas del usuario
            if (!this.userRooms.has(uid)) {
                this.userRooms.set(uid, new Set());
            }

            this.io.emit('lista-usuarios', await getUsuaios());
            this.io.emit('lista-grupos', await getAllGrupos());

            // ===== EVENTOS DE GRUPOS CORREGIDOS =====

            // Evento para unirse a la sala de un grupo (CORREGIDO)
            socket.on('join-grupo', (groupId) => {
                console.log(`Usuario ${uid} unido al grupo ${groupId}`);

                // Unir al usuario a la sala del grupo
                socket.join(groupId);

                // Registrar usuario en la sala del grupo
                if (!self.grupoRooms.has(groupId)) {
                    self.grupoRooms.set(groupId, new Set());
                    self.operationQueue.set(groupId, []);
                }
                self.grupoRooms.get(groupId).add(uid);

                // Registrar grupo en el usuario
                self.userRooms.get(uid).add(groupId);

                console.log(`Usuario ${uid} registrado en grupo ${groupId}. Usuarios en grupo:`,
                    Array.from(self.grupoRooms.get(groupId)));
            });

            // Evento para salir de la sala de un grupo (CORREGIDO)
            socket.on('leave-grupo', (groupId) => {
                console.log(`Usuario ${uid} dejó el grupo ${groupId}`);

                // Sacar al usuario de la sala del grupo
                socket.leave(groupId);

                // Remover usuario de la sala del grupo
                if (self.grupoRooms.has(groupId)) {
                    self.grupoRooms.get(groupId).delete(uid);
                    console.log(`Usuario ${uid} removido de grupo ${groupId}. Usuarios restantes:`,
                        Array.from(self.grupoRooms.get(groupId)));
                }

                // Remover grupo del usuario
                if (self.userRooms.has(uid)) {
                    self.userRooms.get(uid).delete(groupId);
                }
            });

            // Evento para verificar membresía (NUEVO)
            socket.on('check-membership', (groupId) => {
                const isMember = self.grupoRooms.has(groupId) &&
                    self.grupoRooms.get(groupId).has(uid);

                socket.emit('membership-status', {
                    groupId,
                    isMember,
                    userId: uid
                });

                console.log(`Verificación membresía - Usuario: ${uid}, Grupo: ${groupId}, Es miembro: ${isMember}`);
            });

            // Evento para actualización del canvas (CORREGIDO)
            socket.on('diagram:update', async (data) => {
                try {
                    const { groupId, tables, relationships, clientId = 'unknown' } = data;

                    console.log(`diagram:update recibido - Usuario: ${uid}, Grupo: ${groupId}`);

                    // Verificar membresía de manera más flexible
                    const isMember = self.grupoRooms.has(groupId) &&
                        self.grupoRooms.get(groupId).has(uid);

                    if (!isMember) {
                        console.log(`Usuario ${uid} no es miembro del grupo ${groupId}. Uniendo automáticamente...`);

                        // Unir automáticamente al usuario
                        socket.join(groupId);
                        if (!self.grupoRooms.has(groupId)) {
                            self.grupoRooms.set(groupId, new Set());
                        }
                        self.grupoRooms.get(groupId).add(uid);

                        if (!self.userRooms.has(uid)) {
                            self.userRooms.set(uid, new Set());
                        }
                        self.userRooms.get(uid).add(groupId);

                        console.log(`Usuario ${uid} unido automáticamente a grupo ${groupId}`);
                    }

                    // Agregar a la cola de operaciones
                    const operation = {
                        groupId,
                        tables: tables || [],
                        relationships: relationships || [],
                        clientId,
                        timestamp: Date.now(),
                        userId: uid
                    };

                    self.addToOperationQueue(groupId, operation);

                    // Procesar la operación
                    await self.processGroupOperation(groupId, socket);

                } catch (error) {
                    console.error('Error al manejar diagram:update:', error);
                    socket.emit('diagram:error', {
                        error: 'Error al procesar actualización',
                        groupId: data.groupId
                    });
                }
            });

            // Escuchar cuando un usuario crea un nuevo grupo
            socket.on('crear-grupo', async () => {
                const grupos = await getAllGrupos();
                self.io.emit('lista-grupos', grupos);
            });

            // ===== FIN EVENTOS DE GRUPOS CORREGIDOS =====

            // Mensaje personal (existente)
            socket.on('mensaje-personal', async (payload) => {
                const mensaje = await grabarMensaje(payload);
                self.io.to(payload.para).emit('mensaje-personal', mensaje);
                self.io.to(payload.de).emit('mensaje-personal', mensaje);
            });

            // Desconexión (MEJORADA)
            socket.on('disconnect', async (reason) => {
                console.log(`Cliente desconectado: ${uid}, Razón: ${reason}`);

                await usuarioDesconectado(uid);

                // Limpiar todas las salas del usuario
                if (self.userRooms.has(uid)) {
                    const userGroups = self.userRooms.get(uid);

                    for (const groupId of userGroups) {
                        if (self.grupoRooms.has(groupId)) {
                            self.grupoRooms.get(groupId).delete(uid);
                            console.log(`Usuario ${uid} removido de grupo ${groupId} por desconexión`);

                            // Limpiar cola si no hay usuarios
                            if (self.grupoRooms.get(groupId).size === 0) {
                                self.operationQueue.delete(groupId);
                                self.grupoRooms.delete(groupId);
                            }
                        }
                    }

                    self.userRooms.delete(uid);
                }

                self.io.emit('lista-usuarios', await getUsuaios());
            });

            // Manejar errores de socket
            socket.on('error', (error) => {
                console.error(`Error en socket usuario ${uid}:`, error);
            });
        });
    }

    // Método para agregar operación a la cola
    addToOperationQueue(groupId, operation) {
        if (!this.operationQueue.has(groupId)) {
            this.operationQueue.set(groupId, []);
        }
        this.operationQueue.get(groupId).push(operation);
    }

    // Método para procesar operaciones de grupo (MEJORADO)
    async processGroupOperation(groupId, socket) {
        const queue = this.operationQueue.get(groupId);
        if (!queue || queue.length === 0) return;

        // Tomar la primera operación de la cola
        const operation = queue[0];

        try {
            console.log(`Procesando operación para grupo ${groupId} de usuario ${operation.userId}`);

            // Verificar que todavía hay usuarios en la sala
            if (!this.grupoRooms.has(groupId) || this.grupoRooms.get(groupId).size === 0) {
                console.log(`No hay usuarios en grupo ${groupId}, saltando operación`);
                queue.shift();
                return;
            }

            // Emitir a todos en el grupo EXCEPTO al emisor original
            socket.to(groupId).emit('diagram:updated', {
                groupId: operation.groupId,
                tables: operation.tables,
                relationships: operation.relationships,
                lastUpdated: new Date(),
                lastUpdatedBy: operation.userId,
                source: 'peer',
                clientId: operation.clientId,
                timestamp: operation.timestamp
            });

            console.log(`Operación emitida a grupo ${groupId}. Clientes:`,
                Array.from(this.grupoRooms.get(groupId)));

            // Remover operación procesada
            queue.shift();

            // Procesar siguiente operación si existe
            if (queue.length > 0) {
                setTimeout(() => this.processGroupOperation(groupId, socket), 10);
            }

        } catch (error) {
            console.error('Error procesando operación de grupo:', error);
            // Enviar error al cliente específico
            socket.to(operation.userId).emit('diagram:error', {
                error: 'Error al sincronizar cambios',
                groupId: operation.groupId
            });

            // Remover operación fallida
            queue.shift();
        }
    }

    // Método para verificar estado (útil para debugging)
    getRoomStatus() {
        const status = {};

        for (const [groupId, users] of this.grupoRooms.entries()) {
            status[groupId] = {
                userCount: users.size,
                users: Array.from(users),
                queueLength: this.operationQueue.get(groupId)?.length || 0
            };
        }

        return status;
    }
}

module.exports = Sockets;