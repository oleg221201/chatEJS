const http = require('http');
const express = require('express');
const session = require('express-session');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);


const port = 3000;
var clients = new Map();

io.on('connection', socket => {
    console.log('new connection', socket.id)
    socket.on('join', newUserId => {
        if (newUserId) {
            clients.set(socket.id, JSON.parse(newUserId).userId);
            console.log(clients)
        }
    })

    socket.on("logout", (data) => {
        data=JSON.parse(data)
        clients.delete(socket.id)
        clients.forEach((value, key) => {
            if (value == data.id) {
                console.log("here")
                io.to(key).emit("auth_disconnect");

            }
        })
    })

    socket.on("chat: join", async data => {
        data = JSON.parse(data);
        clients.set(socket.id, data.userId);
        const res = await db.query(`select member1Id, member2Id from chats where id=${data.chatId};`);
        if (res[0][0].member1Id == data.userId || res[0][0].member2Id == data.userId) {
            socket.join(`chat_${data.chatId}`);
        }
    })

    socket.on("chat: message", async data => {
        data = JSON.parse(data);
        const sql = `insert into messages (chatId, senderId, text) values (${data.chatId}, ${data.userId}, '${data.message}');`;
        await db.query(sql);
        const resUsername = await db.query(`select username from users where id=${data.userId}`);
        const senderUsername = resUsername[0][0].username;
        io.to(`chat_${data.chatId}`).emit(`chat_${data.chatId}: mailing`, JSON.stringify({
            senderUsername: senderUsername,
            message: data.message
        }))
    })

    socket.on("mainChat: message", async data => {
        data = JSON.parse(data);

        const sql1 = `insert into main_chat (text, senderId) values ('${data.message}', ${data.userId});`;
        await db.query(sql1);

        const resUsername = await db.query(`select username from users where id=${data.userId}`);
        const senderUsername = resUsername[0][0].username;

        data = {message: data.message, username: senderUsername}

        io.emit("mainChat: mailing", JSON.stringify(data));
    })

    socket.on("disconnect", (data) => {
        clients.delete(socket.id)
        socket.disconnect();
        socket.removeAllListeners();
        console.log("disconnect", socket.id)
    })
})

app.use(express.json({extended: true}));
app.use(express.urlencoded({extended: true}));
app.set("view engine", "ejs");

app.use(session({
    name: "session",
    secret: "very_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 2, //two hours
        sameSite: true
    }
}));

const checkAuth = (req, res, next) => {
    if (!req.session.userId) {
        res.redirect('/auth/registration');
    } else {
        next();
    }
}

app.use('/auth', require('./routes/auth'));
app.use('/', checkAuth, require('./routes/mainRoute'));

server.listen(port, function () {
    console.log(`Server has been started at port ${port}...`);
});