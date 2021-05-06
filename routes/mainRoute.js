const {Router} = require('express');
const router = Router();
const db = require('../db');


router.get('/chat/:chatId',async function (req, res) {
    try {
        const chatId = req.params.chatId;
        if (!chatId) return res.status(400).json({message: "ChatId param is undefined"});

        const msgList = new Array();
        const sql = `select * from messages where (chatId = ${chatId});`;
        const result = await db.query(sql);
        const resData = result[0];

        for (var i=0; i<resData.length; i++) {
            const sql1 = `select username from users where id=${resData[i].senderId}`;
            const result1 = await db.query(sql1);
            msgList.push({messageId: resData[i].id, text: resData[i].text, username: result1[0][0].username});
        }

        const sqlMembers = `select member1Id, member2Id from chats where (id = ${chatId});`;
        const resMembers = await db.query(sqlMembers);

        //res.status(200).json({msgList: msgList, member1: resMembers[0][0].member1Id, member2: resMembers[0][0].member2Id});
        res.status(200).render('chat', {
            msgList: msgList,
            member1: resMembers[0][0].member1Id,
            member2: resMembers[0][0].member2Id
        });
    } catch (err) {
        console.log(err.message)
        res.status(400).json({error: err.message});
    }
})

router.get('/', async function (req, res) {
    try {
        const userId = req.session.userId;
        if (!userId) return res.status(400).json({message: "UserId param is undefined"});
        const sqlChats = `select * from chats where (member1Id=${userId} or member2Id=${userId});`;
        const resChats = await db.query(sqlChats);

        const sqlUsers = `select id, username from users where id!=${userId}`;
        const resUsers = await db.query(sqlUsers);

        const username = await db.query(`select username from users where id=${userId};`);

    // .json({chats: resChats[0], users: resUsers[0], username: username[0][0].username})
        res.status(200).render("index",
            {id: userId, username: username[0][0].username,
                chats: resChats[0], users: resUsers[0]});
    } catch (err) {
        console.log(err.message)
        res.status(400).json({error: err.message});
    }
})

router.get('/mainChat', async function (req, res) {
    try {
        const msgList = new Array();
        const sql = 'select * from main_chat;';
        const result = await db.query(sql);
        const resData = result[0];
        for (var i=0; i<resData.length; i++) {
            const sql1 = `select username from users where id=${resData[i].senderId}`;
            const result1 = await db.query(sql1);
            msgList.push({messageId: resData[i].messageId, text: resData[i].text, username: result1[0][0].username});
        }
        //msgList.reverse();

        // res.status(200).render('mainChat.ejs').json({msgList});
        res.status(200).render('mainChat', {msgList: msgList});
    } catch (err) {
        res.status(400).json({error: err.message});
    }
})

router.post('/chat', async function (req, res) {
    try {
        const member1 = req.body.member1;
        const member2 = req.body.member2;
        if (member1 == null || member2 == null) {
            return res.status(400).json({message: "not all body data received"});
        }
        const sqlCheck = `select * from chats where ((member1Id=${member1} or member2Id=${member1}) and (member1Id=${member2} or member2Id=${member2}))`;
        const resCheck = await db.query(sqlCheck);
        if (resCheck[0].length > 0) {
            return res.status(200).json({message: "This chat already exists. Please refresh the page."});
        }
        const sqlCreate = `insert into chats (member1Id, member2Id) values (${member1}, ${member2});`;
        const resCreate = await db.query(sqlCreate);

        const sqlAddFirstMessage = `insert into messages (chatId, senderId, text) values (${resCreate[0].insertId}, ${member1}, "create chat");`
        await db.query(sqlAddFirstMessage);

        //res.status(200).json({chatId: resCreate[0].insertId})
        res.status(200).json({chatId: resCreate[0].insertId})
    } catch (err) {
        res.status(400).json({error: err.message});
    }
})


module.exports = router;