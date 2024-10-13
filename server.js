require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");

const sanitizeHTML = require("sanitize-html");

const db = require("better-sqlite3")("ourApp.db");
db.pragma("journal_mode = WAL");

//database setup
const createTables = db.transaction(() => {
  db.prepare(
    `
   CREATE TABLE IF NOT EXISTS users(
   id INTEGER PRIMARY KEY AUTOINCREMENT, 
    username STRING NOT NULL UNIQUE,
     password STRING NOT NULL)`
  ).run();

  db.prepare(
    `
   CREATE TABLE IF NOT EXISTS posts(
   id INTEGER PRIMARY KEY AUTOINCREMENT, 
    createdDate DATE,
    title STRING NOT NULL,
    content STRING NOT NULL,
     authorid integer NOT NULL,
     FOREIGN KEY (authorid) REFERENCES users (id))`
  ).run();
});

//createTables();

const app = express();

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));
app.use(express.static("public"));
app.use(cookieParser());

app.use(function (req, res, next) {
  res.locals.errors = [];

  // try to decode incoming cookies
  try {
    const decoded = jwt.verify(req.cookies.ourSimpleApp, process.env.JWTSECRET);

    req.user = decoded;
  } catch (err) {
    req.user = false;
  }
  res.locals.user = req.user;
  //console.log(req.user);

  next();
});

// endpoint
app.get("/", (req, res) => {
  if (req.user) {
    const postStatement = db.prepare("SELECT * FROM posts where authorid=?");
    const posts = postStatement.all(req.user.userid);
    return res.render("dashboard", { posts });
  }
  res.render("homepage");
});


// endpoint test
app.get(process.env.BASE_URL, (req, res) => {
  res.send("Our test works");
});


// login endpoint
app.get("/login/?", (req, res) => {
  if (req.user) {
    res.clearCookie("ourSimpleApp");
  }
  res.render("login");
});

app.get("/logout", (req, res) => {
  res.clearCookie("ourSimpleApp");
  res.redirect("/");
});

app.post("/login", (req, res) => {
  let errors = [];
  if (typeof req.body.username !== "string") req.body.username = "";
  if (typeof req.body.password !== "string") req.body.password = "";
  if (req.body.username.trim() == "" || req.body.username.trim() == "")
    errors = ["Invalid username/password"];

  if (errors.length) {
    return res.render("login", { errors });
  }
  const userInQuestionStatement = db.prepare(
    "SELECT * FROM users WHERE username=?"
  );
  const userInQuestion = userInQuestionStatement.get(req.body.username);

  if (!userInQuestion) {
    errors = ["Invalid username/password"];
    return res.render("login", { errors });
  }

  const matchOrNot = bcrypt.compareSync(
    req.body.password,
    userInQuestion.password
  );
  if (!matchOrNot) {
    errors = ["Invalid username/password"];
    return res.render("login", { errors });
  }

  // give them a cookie

  const ourTokenValue = jwt.sign(
    {
      exp: Math.floor(Date.now() / 1000) + 3600,
      skycolor: "blue",
      userid: userInQuestion.id,
      username: userInQuestion.username,
    },
    process.env.JWTSECRET
  );

  //log the user in and give them a cookie
  res.cookie("ourSimpleApp", ourTokenValue, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 1000 * 3600,
  });
  res.redirect("/");
});

function mustBeLoggedIn(req, res, next) {
  if (req.user) {
    return next();
  }
  res.redirect("/");
}

app.get("/create-post", mustBeLoggedIn, (req, res) => {
  res.render("create-post");
});

function sharedPostValidation(req) {
  if (typeof req.body.title !== "string") req.body.title = "";
  if (typeof req.body.body !== "string") req.body.body = "";
  let errors = [];
  //sanitize or strip out html code
  req.body.title = sanitizeHTML(req.body.title.trim(), {
    allowedTags: [],
    allowedAttributes: [],
  });
  req.body.body = sanitizeHTML(req.body.body.trim(), {
    allowedTags: [],
    allowedAttributes: [],
  });

  if (!req.body.body) errors = ["You must provide content"];
  if (!req.body.title) errors = ["You must provide a  title"];

  return errors;
}

app.get("/edit-post/:id", (req, res) => {
  // try to look up the post in question
  const statement = db.prepare("SELECT * FROM posts WHERE id =?");
  const post = statement.get(req.params.id);

  //if post is false  if you're not the author redirect to homepage
  if (!post || post.authorid !== req.user.userid) {
    return res.redirect("/");
  }



  //otherwise render the editpost template
  res.render("edit-post", { post });
});



// edit post update bd
app.post("/edit-post/:id",mustBeLoggedIn, (req, res) => {
  // try to look up the post in question
  const statement = db.prepare("SELECT * FROM posts WHERE id =?");
  const post = statement.get(req.params.id);

  //if post is false and if you're not the author redirect to homepage
  if (!post || post.authorid !== req.user.userid) {
    return res.redirect("/");
  }
 console.log(
    "Final line----------------------------------------------------------------------------------------------------------------------------------"
  );
  console.log('we get there')
  const errors = sharedPostValidation(req);

  if (errors.lentgh) {
    return res.render("edit-post", { errors });
  }

  const updateStatement = db.prepare(
    "UPDATE posts SET title=?, content=? WHERE id = ?"
  );
  const updatePost = updateStatement.run(
    req.body.title,
    req.body.body,
    req.params.id
  );
  res.redirect(`/post/${req.params.id}`);
});





// edit post update bd
app.post("/delete-post/:id",mustBeLoggedIn, (req, res) => {
  // try to look up the post in question
  const statement = db.prepare("SELECT * FROM posts WHERE id =?");
  const post = statement.get(req.params.id);

  //if post is false and if you're not the author redirect to homepage
  if (!post || post.authorid !== req.user.userid) {
    return res.redirect("/");
  }
 console.log(
    "Final line----------------------------------------------------------------------------------------------------------------------------------"
  );
  console.log('we get there')
  const errors = sharedPostValidation(req);

  if (errors.lentgh) {
    return res.render("edit-post", { errors });
  }

  const deleteStatement = db.prepare(
    "DELETE FROM posts WHERE id = ?"
  );
  constdeletePost = deleteStatement.run(
    req.params.id
  );
  res.redirect("/");
});





app.get("/post/:id", (req, res) => {
  const statement = db.prepare(
    "SELECT posts.*, users.username FROM posts inner join users on posts.authorid=users.id WHERE posts.id =?"
  );
  const post = statement.get(req.params.id);
  if (!post) {
    return res.redirect("/");
  }
  const isAuthor= post.authorid===req.user.userid
  res.render("single-post", {post, isAuthor} );
});




app.post("/create-post", mustBeLoggedIn, (req, res) => {
  const errors = sharedPostValidation(req);

  if (errors.length) {
    return res.render("create-post", { errors });
  }

  const ourStatement = db.prepare(
    "INSERT INTO posts(createdDate, title, content,authorid ) VALUES(?,?,?,?)"
  );
  const result = ourStatement.run(
    new Date().toISOString(),
    req.body.title,
    req.body.body,
    req.user.userid
  );
  console.log(
    "Final line----------------------------------------------------------------------------------------------------------------------------------"
  );
  // console.log(req.user.userid)

  const getPostStatement = db.prepare("SELECT * FROM posts WHERE ROWID= ?");
  const realPost = getPostStatement.get(result.lastInsertRowid);
  res.redirect(`/post/${realPost.id}`);
});

app.post("/register", (req, res) => {
  const errors = [];
  if (typeof req.body.username !== "string") req.body.username = "";
  if (typeof req.body.password !== "string") req.body.password = "";
  req.body.username = req.body.username.trim();
  if (!req.body.username) errors.push("You must provide a  username");
  if (req.body.username && req.body.username.length < 3)
    errors.push("Username must be more than 5 letters");
  if (req.body.username && !req.body.username.match(/^[a-zA-Z0-9]+$/))
    errors.push("Username must be more than 5 letters");

  if (!req.body.password) errors.push("You must provide a  password");
  if (req.body.password && req.body.password.length < 6)
    errors.push("password must have at least 6 characters");

  if (errors.length) {
    return res.render("homepage", { errors });
  }

  const userInQuestionStatement = db.prepare(
    "SELECT * FROM users WHERE username=?"
  );
  const userInQuestion = userInQuestionStatement.get(req.body.username);
  if (userInQuestion) {
    errors.push("User already exists");
  }
  if (errors.length) {
    return res.render("homepage", { errors });
  }
  //save the new user into the database

  const salt = bcrypt.genSaltSync(10);
  req.body.password = bcrypt.hashSync(req.body.password, salt);
  const ourStatement = db.prepare(
    "INSERT INTO users (username , password) VALUES (?, ?)"
  );
  const result = ourStatement.run(req.body.username, req.body.password);

  const lookupStatement = db.prepare("select * FROM users WHERE ROWID= ?");
  const ourUser = lookupStatement.get(result.lastInsertRowid);

  // log the user in by giving them a cookie
  const ourTokenValue = jwt.sign(
    {
      exp: Math.floor(Date.now() / 1000) + 3600,
      skycolor: "blue",
      userid: ourUser.id,
      username: ourUser.username,
    },
    process.env.JWTSECRET
  );

  //log the user in and give them a cookie
  res.cookie("ourSimpleApp", ourTokenValue, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 1000 * 3600,
  });

  res.redirect("/");
});

app.listen(3000);
