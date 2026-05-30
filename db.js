const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'sua_senha_aqui', 
    database: 'sistema_biblioteca', 
    
    port: '3306'
});

db.connect(err => {
    if (err) throw err;
    console.log('Conectado com o banco de dados MySQL com sucesso!');
});

module.exports = db;