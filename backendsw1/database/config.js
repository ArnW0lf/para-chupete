
const mongoose = require('mongoose');



const dbConecction = async() => {

    try {

        await mongoose.connect( process.env.DB_CNN_STRING);
        console.log('DB Online');
        
    } catch (error) {
        console.log(error);
        throw new Error('Erro en la bbase de datos - vea logs');
    }
}


module.exports = {
    dbConecction
}