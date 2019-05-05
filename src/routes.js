const express = require('express')
const mysql = require('mysql')
const router = express.Router()
require("dotenv").config()
const showdown = require('showdown')
const passport = require('passport')
const jwt = require('jwt-simple')
const LocalStrategy = require('passport-local').Strategy

const converter = new showdown.Converter()
const dbConnection = getDBConnection()

function getDBConnection() {
  return mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
  })
}

const username = "SHANE"
const password = "dennis"

passport.use(new LocalStrategy(function(username, password, done) {
  if (username === process.env.ADMIN
      && password === process.env.ADMIN_PASSWORD) {
    done(null, jwt.encode({ username }, process.env.SECRET))
    return
  }
  done(null, false)
}))

router.get("/", (req, res) => {
  const queryString = "SELECT * FROM posts ORDER BY post_id DESC"
  dbConnection.query(queryString, (err, rows, fields) => {
    if (err) {
      console.log("Failed to query for /: " + err)
    }
    console.log("Getting data from database for /")
    for (let i in rows) {
      rows[i].post_body = converter.makeHtml(rows[i].post_body)
    }
    res.render("index", { posts: rows })
  })
})

router.get("/admin", (req, res) => {
  res.render("./pages/admin")
})

router.get("/posts/:id", (req, res) => {
  const id = req.params.id
  const queryString = "SELECT * FROM posts WHERE post_id = ?"
  dbConnection.query(queryString, [id], (err, rows, fields) => {
    if (err) {
      console.log("Failed to query for /posts/:id: " + err)
    }
    console.log("Getting data from database for /posts/:id")
    for (let i in rows) {
      rows[i].post_body = converter.makeHtml(rows[i].post_body)
    }
    res.render("./pages/posts", { posts: rows })
  })
})

router.post("/submit_post",
  passport.authenticate('local',{ session: false, failWithError: true }),
  (req, res) => {
    post_title = req.body.post_title
    post_body = req.body.post_body
    category = req.body.category
    tags = req.body.tags.split(", ")

    queryString = "INSERT INTO posts (post_title, post_body, category) \
    VALUES (?, ?, ?)"
    dbConnection.query(queryString, [post_title, post_body, category], (err, results, field) => {
      if (err) {
        console.log("Failed to submit post. " + err)
        return
      }
      console.log("Logged new post " + results)
    })
    res.redirect("/")
})

router.post('/login', passport.authenticate('local',{ session: false }),
                function(req, res) {
                res.send("Authenticated")
  })

module.exports = router
