const {Router} = require('express');
const router = Router();
const db = require('../db');

const checkAuth = (req, res, next) => {
    if (req.session.userId) {
        res.redirect('/');
    } else {
        next();
    }
}

router.get('/registration', checkAuth, (req, res) => {
    res.render('registration.ejs');
})

router.get('/login', checkAuth, (req, res) => {
    res.render('login.ejs');
})

router.post('/registration', async function (req, res) {
    try {
        if (!req.body.email || !req.body.password || !req.body.username) {
            return res.status(400).json({message: "Not all data was sent"});
        }

        const selectSQL = `select count(*) as count from users where email='${req.body.email}' or username='${req.body.username}';`;
        const selectResult = await db.query(selectSQL);
        if (selectResult[0][0].count !== 0) {
            return res.status(400).json({message: "Email or username is already used"});
        }

        const insertSQL = `insert into users (email, password, username) values ('${req.body.email}','${req.body.password}','${req.body.username}')`
        const insertResult = await db.query(insertSQL);

        req.session.userId = insertResult[0].insertId;

        res.status(200).redirect('/');
    } catch (err) {
        res.status(400).json({error: err.message});
    }
})

router.post('/login', async function (req, res) {
    try {
        if (!req.body.email || !req.body.password) {
            return res.status(400).json({message: "Not all data was sent"});
        }

        const selectSQL = `select * from users where email='${req.body.email}';`;
        const selectResult = await db.query(selectSQL);

        if (!selectResult[0][0] || selectResult[0][0].password !== req.body.password) {
            return res.status(400).json({message: "Incorrect input data"});
        }

        req.session.userId = selectResult[0][0].id;

        res.status(200).redirect('/');
        //res.status(200).redirect('/').render("index", {id: selectResult[0][0].id});
    } catch (err) {
        res.status(400).json({error: err.message});
    }
})

router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(400).json({error: err, logout: false});

        res.clearCookie("session");
        res.redirect('/')
    })
})


module.exports = router;