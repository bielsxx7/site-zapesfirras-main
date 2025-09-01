const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '008856ga',
    database: 'zapesfirras_db'
}).promise();

module.exports = pool;