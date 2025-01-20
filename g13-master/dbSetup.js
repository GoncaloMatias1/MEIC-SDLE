const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'database/shoppinglist.db');

//If file does not exist, it will be created
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, '');
}


// Wrap sqlite3 database in a Promise-based API
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Helper function to run queries with Promises
const runQuery = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

const getQuery = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

const allQuery = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

const initializeDB = async () => {
  try {
    // Drop tables if they exist
    await runQuery(`DROP TABLE IF EXISTS shopping_lists`);
    await runQuery(`DROP TABLE IF EXISTS items`);

    // Create tables
    await runQuery(`
      CREATE TABLE IF NOT EXISTS shopping_lists (
        owner TEXT NOT NULL,
        url TEXT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        acquired BOOLEAN DEFAULT 0,
        deleted BOOLEAN DEFAULT FALSE
      );
    `);

    await runQuery(`
      CREATE TABLE IF NOT EXISTS items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          list_id TEXT,
          description TEXT NOT NULL,
          quantity INTEGER DEFAULT 1,
          acquired BOOLEAN DEFAULT 0,
          added INTEGER DEFAULT 1,
          deleted INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(list_id) REFERENCES shopping_lists(url)
      );
    `);

    console.log('Database tables created successfully.');
  } catch (err) {
    console.error('Error initializing database:', err.message);
  }
};

const insertItem = async (listId, description, quantity) => {
  try {
    const result = await runQuery(
      `INSERT INTO items (list_id, description, quantity,added) VALUES (?, ?, ?, ?)`,
      [listId, description, quantity, quantity]
    );
    console.log(`Item inserted with id: ${result.lastID}`);
  } catch (err) {
    console.error('Error inserting item:', err.message);
  }
};

const listTables = async () => {
  try {
    const tables = await allQuery("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Tables:', tables.map((table) => table.name));
  } catch (err) {
    console.error('Error listing tables:', err.message);
  }
};

const main = async () => {
  await initializeDB();

  // Add items
  await insertItem(null, 'Milk', 2);
  await insertItem(null, 'Bread', 1);
  await insertItem(null, 'Eggs', 12);
  await insertItem(null, 'Butter', 1);

  await listTables();

  // Close database
  db.close((err) => {
    if (err) {
      console.error('Error closing database', err.message);
    } else {
      console.log('Database connection closed.');
    }
  });
};

main();
