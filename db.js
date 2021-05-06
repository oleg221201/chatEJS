const mysql = require('mysql2/promise');

const db = mysql.createPool({
    host: "localhost",
    user: "oleg",
    database: "chatDB",
    password: "Password1234"
});

module.exports = db