//database setup
const createTablesUser = db.transaction(() => {
  db.prepare(
    `
   CREATE TABLE IF NOT EXISTS users(
   id INTEGER PRIMARY KEY AUTOINCREMENT, 
    username STRING NOT NULL UNIQUE,
     password STRING NOT NULL)`
  ).run();
});
//database setup
const createTablesMovies = db.transaction(() => {
  db.prepare(
    `
   CREATE TABLE IF NOT EXISTS users(
   id INTEGER PRIMARY KEY AUTOINCREMENT, 
    username STRING NOT NULL UNIQUE,
     password STRING NOT NULL)`
  ).run();
});

//database setup
const createTablesFavorites = db.transaction(() => {
  db.prepare(
    `
   CREATE TABLE IF NOT EXISTS users(
   id INTEGER PRIMARY KEY AUTOINCREMENT, 
    username STRING NOT NULL UNIQUE,
     password STRING NOT NULL)`
  ).run();
});

//database setup
const createTables = db.transaction(() => {
  db.prepare(
    `
   CREATE TABLE IF NOT EXISTS users(
   id INTEGER PRIMARY KEY AUTOINCREMENT, 
    username STRING NOT NULL UNIQUE,
     password STRING NOT NULL)`
  ).run();
});
