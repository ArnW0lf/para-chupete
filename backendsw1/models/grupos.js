const { Schema, model } = require('mongoose');

const GrupoSchema = Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    creador: {
        type: Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },
    contenidoCanvas: {
        type: Object,
        default: {
            tables: [],
            relationships: [],
            canvasWidth: 1000,
            canvasHeight: 2000
        }
    },
    activo: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Método para limpiar la respuesta JSON
GrupoSchema.method('toJSON', function () {
    const { __v, ...object } = this.toObject();
    return object;
});

module.exports = model('Grupo', GrupoSchema);