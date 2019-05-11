const express = require('express')
const mysql = require('mysql')
const router = express.Router()
require("dotenv").config()
const showdown = require('showdown')
const uuid = require('uuid/v4')
const passport = require('passport')

const converter = new showdown.Converter()
const POSTS_PER_PAGE = 3
const POST_COUNT = async function() {
  getPostCount()
    .then(function(value) {
      console.log(value)
    })
}

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

async function getPostCount() {
  const queryString = "SELECT COUNT(post_id) as count FROM posts"
  dbConnection.query(queryString, (err, rows, fields) => {
    if (err) {
      console.log("Failed to query for getPostCount(): " + err)
    }
    return rows[0].count
  })
  return rows[0].count
}

function checkRows(rows) {
  for (let i in rows) {
    rows[i].post_body = converter.makeHtml(rows[i].post_body)
    if (rows[i].tags) {
      rows[i].tags = rows[i].tags.split(", ")
    }
    else {
      rows[i].tags = []
    }
  }
  return rows
}

function checkLogged(req) {
  if (req.isAuthenticated()) {
    loggedIn = true
  }
  else {
    loggedIn = false
  }
  return loggedIn
}

router.get("/", (req, res) => {
  const pages = POST_COUNT / POSTS_PER_PAGE
  const pageInfo = {
    pages: pages,
    currentPage: req.params.page
  }

  const uniqueId = uuid()
  const queryString = "SELECT * FROM posts ORDER BY post_id DESC LIMIT 0, ?"
  dbConnection.query(queryString, [POSTS_PER_PAGE], (err, rows, fields) => {
    if (err) {
      console.log("Failed to query for /: " + err)
    }
    console.log("Getting data from database for /" + ` unique id: ${uniqueId}`)
    rows = checkRows(rows)

    let loggedIn = checkLogged(req)
    res.render("index", { pageInfo: pageInfo, posts: rows, admin: loggedIn })
  })
})

router.get("/:page", (req, res) => {
  const pages = POST_COUNT / POSTS_PER_PAGE
  const pageInfo = {
    pages: pages,
    currentPage: req.params.page
  }
  const start = req.params.page * POSTS_PER_PAGE
  const uniqueId = uuid()
  const queryString = "SELECT * FROM posts ORDER BY post_id DESC LIMIT ?, ?"
  dbConnection.query(queryString, [start, POSTS_PER_PAGE], (err, rows, fields) => {
    if (err) {
      console.log("Failed to query for /: " + err)
    }
    console.log("Getting data from database for /" + ` unique id: ${uniqueId}`)
    rows = checkRows(rows)
    let loggedIn = checkLogged(req)
    res.render("index", { pageInfo: pageInfo, posts: rows, admin: loggedIn })
  })
})

router.get("/admin", (req, res) => {
  if(req.isAuthenticated()) {
    console.log(`User authenticated? ${req.isAuthenticated()}`)
    res.render("./pages/admin")
  }
  else {
    res.redirect("/login")
  }
})

router.get("/login", (req, res) => {
  console.log(req.sessionID)
  res.render("./pages/login")
})

router.post("/login", (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if(info) {return res.send(info.message)}
    if (err) { return next(err) }
    if (!user) { return res.redirect('/login') }
    req.login(user, (err) => {
      if (err) { return next(err); }
      return res.redirect('/admin')
    })
  })(req, res, next)
})

router.get("/posts/:id", (req, res) => {
  const id = req.params.id
  const queryString = "SELECT * FROM posts WHERE post_id = ?"
  dbConnection.query(queryString, [id], (err, rows, fields) => {
    if (err) {
      console.log("Failed to query for /posts/:id: " + err)
    }
    console.log("Getting data from database for /posts/:id")
    rows = checkRows(rows)
    let loggedIn = checkLogged(req)
    res.render("./pages/posts", { posts: rows, admin: loggedIn })
  })
})

router.get("/categories/:category", (req, res) => {
  const category = req.params.category
  const queryString = "SELECT * FROM posts WHERE category = ?"
  dbConnection.query(queryString, [category], (err, rows, fields) => {
    if (err) {
      console.log("Failed to query for /categories/:category " + err)
    }
    console.log("Getting data from database for /categories/:category")
    rows = checkRows(rows)
    if (rows.length == 0) {
      res.render("./pages/404", { error: "Category not found."})
    }
    else {
    let loggedIn = checkLogged(req)
    res.render("./pages/category", { posts: rows, admin: loggedIn, category: category })
    }
  })
})

router.post("/submit_post", (req, res) => {
  post_title = req.body.post_title
  post_body = req.body.post_body
  category = req.body.category
  tags = req.body.tags

  queryString = "INSERT INTO posts (post_title, post_body, category, tags) \
  VALUES (?, ?, ?, ?)"
  dbConnection.query(queryString, [post_title, post_body, category, tags], (err, results, field) => {
    if (err) {
      console.log("Failed to submit post. " + err)
      return
    }
    console.log("Logged new post " + results)
  })
  res.redirect("/")
})

module.exports = router
