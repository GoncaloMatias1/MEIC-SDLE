const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const Cart = require('./src/cdrt/Cart.js');

/**
 * Creates DB for user
 * @param {String} name Name of the user
 * @returns 
 */
function createDB(name, items = undefined) {
  return new Promise((resolve, reject) => {
      const dbPath = path.resolve(__dirname, `database/shoppinglist_${name}.db`);

      // Check if the database already exists
      if (fs.existsSync(dbPath)) {
          console.log(`Database 'shoppinglist_${name}.db' already exists.`);
          return resolve(); // Resolve immediately if DB exists
      }

      // Create a new database
      const db = new sqlite3.Database(dbPath, (err) => {
          if (err) {
              console.error('Error creating database:', err.message);
              return reject(err);
          }
          console.log('Database file ' + dbPath + ' created successfully');
      });

      const runQuery = (sql, params = []) =>
          new Promise((resolve, reject) => {
              db.run(sql, params, function (err) {
                  if (err) reject(err);
                  else resolve(this);
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

              // Insert initial items if provided
              if (items !== undefined) {
                  for (const item of items) {
                      await runQuery(
                          `INSERT INTO items (list_id, description, quantity,added,deleted) VALUES (?, ?, ?, ?, ?)`,
                          [null, item.description, item.quantity, item.quantity, 0]
                      );
                  }
              }

              console.log('Initial items added successfully.');
          } catch (err) {
              console.error('Error initializing database:', err.message);
              throw err;
          } finally {
              db.close((err) => {
                  if (err) {
                      console.error('Error closing database:', err.message);
                  } else {
                      console.log('Database connection closed.');
                  }
              });
          }
      };

      // Initialize the database and resolve the promise when complete
      initializeDB()
          .then(resolve)
          .catch(reject);
  });
}

function getRowsNull(name) {
  return new Promise((resolve, reject) => {
    const dbPath = path.resolve(
      __dirname,
      name ? `database/shoppinglist_${name}.db` : 'database/shoppinglist.db'
    );

    // Check if the database file exists
    if (!fs.existsSync(dbPath)) {
      const errorMsg = `Database '${path.basename(dbPath)}' not found.`;
      console.error(errorMsg);
      return reject(new Error(errorMsg));
    }

    // Open the database
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        return reject(err);
      }
    });

    // Define a helper function to fetch rows
    const fetchRows = async () => {
      return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM items WHERE list_id IS NULL`;
        db.all(sql, [], (err, rows) => {
          if (err) {
            console.error('Error retrieving rows:', err.message);
            reject(err);
          } else {
            resolve(rows);
          }
        });
      });
    };

    // Use the helper function
    (async () => {
      try {
        const rows = await fetchRows();
        resolve(rows); // Resolve the promise with the rows
      } catch (err) {
        reject(err); // Reject the promise with the error
      } finally {
        db.close((closeErr) => {
          if (closeErr) {
            console.error('Error closing database:', closeErr.message);
          } else {
            console.log('Database connection closed.');
          }
        });
      }
    })();
  });
}

function insertRowsNull(name,rows){
  return new Promise((resolve, reject) => {
    const dbPath = path.resolve(
      __dirname,
      name ? `database/shoppinglist_${name}.db` : 'database/shoppinglist.db'
    );
 
    // Check if the database exists
    if (!fs.existsSync(dbPath)) {
      const errorMsg = `Database '${path.basename(dbPath)}' not found.`;
      console.error(errorMsg);
      return reject(new Error(errorMsg));
    }
 
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        return reject(err);
      }
    });

    const runQuery = (sql, params = []) =>
          new Promise((resolve, reject) => {
              db.run(sql, params, function (err) {
                  if (err) reject(err);
                  else resolve(this);
              });
          });

    const executeQuery = (sql, params = []) =>
     new Promise((resolveQuery, rejectQuery) => {
       db.all(sql, params, function (err, rows) {
         if (err) {
           console.error(`Error executing query "${sql}":`, err.message);
           return rejectQuery(err);
         }
         resolveQuery(rows);
       });
     });

    const insertDB = async () => {
        try {
            await executeQuery('DELETE FROM items WHERE list_id IS NULL');

            // Insert initial items
            for(const row of rows){
              await runQuery(
                `INSERT INTO items (list_id, description, quantity,added,deleted) VALUES (?, ?, ?, ?, ?)`,
                [null, row.description, row.quantity, row.added, row.deleted]
              );
            }
            console.log('Initial items added successfully.');
        } catch (err) {
            console.error('Error adding initial items:', err.message);
            throw err;
        } finally {
            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err.message);
                }
            });
        }
    };

    // Initialize the database and resolve the promise when complete
    insertDB()
        .then(resolve)
        .catch(reject);
});
}

function addItemToList(name, url, item_description,quantity){
    return new Promise((resolve, reject) => {
        const dbPath = path.resolve(__dirname, `database/shoppinglist_${name}.db`);
        // Check if the database exists
      if (!fs.existsSync(dbPath)) {
        console.error(`Database 'shoppinglist_${name}.db' not found.`);
        return reject(new Error(`Database 'shoppinglist_${name}.db' not found.`));
      }
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
                reject(err);
            }
        });

        //Get the item with the same description but where the list_id is null
        let sql = `SELECT * FROM items WHERE list_id IS NULL AND description = ?`;
        db.get(sql, [item_description], (err, row) => {
          if (err) {
            console.error('Error getting item:', err.message);
            reject(err);
          }else{
            if(row){
              // Check if quantity to add not bigget than what exists
              if(row.quantity < quantity){
                console.log('Not enough items to add!');
                reject();
              }
              // Check if the item is already in the list
              
              sql = 'SELECT * FROM items WHERE list_id = ? AND description = ?';
              db.get(sql, [url,item_description], (err, row) => {
                if (err) {
                  console.error('Error getting item:', err.message);
                  reject(err);
                }else{
                  if(row){
                    //If the item is already in the list, update the quantity
                    sql = 'UPDATE items SET quantity = ? WHERE list_id = ? AND description = ?';
                    db.run(sql, [parseInt(row.quantity) + parseInt(quantity),url,item_description], function (err) {
                      if (err) {
                        console.error('Error updating item:', err.message);
                        reject(err);
                      }
                    });
                  }else{
                    //If the item is not in the list, add it
                    sql = `INSERT INTO items (list_id, description,quantity) VALUES (?,?,?)`;
                    db.run(sql, [url, item_description,quantity], function (err) {
                      if (err) {
                        console.error('Error inserting item:', err.message);
                        reject(err);
                      }
                      resolve(this.lastID);
                    });
                  }
                }
              });
            }
          }
        });

        db.close((closeErr) => {
            if (closeErr) {
                console.error('Error closing database:', closeErr.message);
            }
        });
    });
}
/**
 * Prints all rows from a specified table in the database.
 * @param {string} name - The name of the database file, null if server database.
 * @param {string} tableName - The name of the table to query.
 */
function printAllRows(name, tableName) {
  return new Promise((resolve, reject) => {
    try {
      let dbPath;
      if (name === undefined) {
        dbPath = path.resolve(__dirname, 'database/shoppinglist.db');
      } else {
        dbPath = path.resolve(__dirname, `database/shoppinglist_${name}.db`);
      }

      // Check if the database exists
      if (!fs.existsSync(dbPath)) {
        const errorMsg = `Database 'shoppinglist_${name}.db' not found.`;
        console.error(errorMsg);
        return reject(new Error(errorMsg));
      }

      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err.message);
          return reject(err);
        }
      });

      let sql = `SELECT * FROM ${tableName}`;
      db.all(sql, [], (err, rows) => {
        if (err) {
          console.error('Error querying table:', err.message);
          return reject(err);
        }

        if (rows.length === 0) {
          console.log(`No data found in table '${tableName}'.`);
        } else {
          console.log(`Rows in table '${tableName}':`);
          console.table(rows); // Neatly prints the rows as a table
        }

        db.close((closeErr) => {
          if (closeErr) {
            console.error('Error closing database:', closeErr.message);
          }
        });

        resolve(rows);
      });
    } catch (error) {
      reject(error);
    }
  });
}
/**
 * Add a new list to the database
 * @param {String} name A name for the list
 * @param {String} url Url of the list
 * @returns 
 */
function addList(name,url){
    return new Promise((resolve, reject) => {
      let dbPath;
      if(name === undefined){
        dbPath = path.resolve(__dirname, 'database/shoppinglist.db');
      }
      else{
        dbPath = path.resolve(__dirname, 'database/shoppinglist_'+name+'.db');
      }
        // Check if the database exists
      if (!fs.existsSync(dbPath)) {
        console.error(`Database 'shoppinglist_${name}.db' not found.`);
        return reject(new Error(`Database 'shoppinglist_${name}.db' not found.`));
      }
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
                reject(err);
            }
        });

        let sql = `INSERT INTO shopping_lists (owner,url) VALUES (?,?)`;
        db.run(sql, [name,url], function (err) {
            if (err) {
                console.error('Error inserting list:', err.message);
                reject(err);
            }
            resolve(this.lastID);
        });

        db.close((closeErr) => {
            if (closeErr) {
                console.error('Error closing database:', closeErr.message);
            }
        });
    });
}

/**
 * This functions retrieves all items from the database that are not associated with a shopping list, to show
 * in the menu.
 * @returns {Promise} A promise that resolves with the items retrieved from the database.
 */
function retrieveItems() {
  return new Promise((resolve, reject) => {
    const dbPath = path.resolve(__dirname, 'database/shoppinglist.db');
    // Check if the database exists
    if (!fs.existsSync(dbPath)) {
      console.error(`Database 'shoppinglist_${name}.db' not found.`);
      return reject(new Error(`Database 'shoppinglist_${name}.db' not found.`));
    }
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        reject(err);
      }
    });

    let sql = `SELECT * FROM items WHERE list_id IS NULL AND added > deleted`;
    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error('Error retrieving items:', err.message);
        reject(err);
      }
      resolve(rows);

      db.close((closeErr) => {
        if (closeErr) {
          console.error('Error closing database:', closeErr.message);
        }
      });
    });
  });
}


/**
 * Delete a item from a specific url
 */
function deleteItemFromList(name,url,item){
  return new Promise((resolve, reject) => {
    const dbPath = path.resolve(__dirname, 'database/shoppinglist_'+name+'.db');
    // Check if the database exists
    if (!fs.existsSync(dbPath)) {
      console.error(`Database 'shoppinglist_${name}.db' not found.`);
      return reject(new Error(`Database 'shoppinglist_${name}.db' not found.`));
    }
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        reject(err);
      }
    });

    let sql = 'DELETE FROM items WHERE list_id = ? AND description = ?';
    db.all(sql, [url,item], (err, rows) => {
      if (err) {
        console.error('Error retrieving items:', err.message);
        reject(err);
      }
      resolve(rows);

      db.close((closeErr) => {
        if (closeErr) {
          console.error('Error closing database:', closeErr.message);
        }
      });
    });
  });
}

/**
 * Get all items that have a specific list_id
 * @param {String} name Name of the user
 * @param {String} url Url of the list
 * @returns 
 */
function getItemsFromAList(name,url){
  return new Promise((resolve, reject) => {
    let dbPath = path.resolve(__dirname, 'database/shoppinglist_'+name+'.db');

    // Check if the database exists
    if (!fs.existsSync(dbPath)) {
      console.error(`Database 'shoppinglist_${name}.db' not found.`);
      return reject(new Error(`Database 'shoppinglist_${name}.db' not found.`));
    }

    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        reject(err);
      }
    });

    let sql = `SELECT * FROM items WHERE list_id = ? AND added >= deleted `;
    db.all(sql, [url], (err, rows) => {
      if (err) {
        console.error('Error retrieving items:', err.message);
        reject(err);
      }
      resolve(rows);

      db.close((closeErr) => {
        if (closeErr) {
          console.error('Error closing database:', closeErr.message);
        }
      });
    });
  });
}
/**
 * Delete a list from the database
 * @param {String} name 
 * @param {String} url 
 */
function deleteList(name,url){
  return new Promise((resolve, reject) => {
    let dbPath;
    if(name === undefined){
      dbPath = path.resolve(__dirname, 'database/shoppinglist.db');
    }
    else{
      dbPath = path.resolve(__dirname, `database/shoppinglist_${name}.db`);
    }

    // Check if the database exists
    if (!fs.existsSync(dbPath)) {
      console.error(`Database 'shoppinglist_${name}.db' not found.`);
      return reject(new Error(`Database 'shoppinglist_${name}.db' not found.`));
    }
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        reject(err);
      }
    });
    //Delete the items that reference the list
    let sql = 'DELETE FROM items WHERE list_id = ?';
    db.all(sql, [url], (err, rows) => {
      if (err) {
        console.error('Error retrieving items:', err.message);
        reject(err);
      }
    });

    sql = 'DELETE FROM shopping_lists WHERE url = ?';
    db.all(sql, [url], (err, rows) => {
      if (err) {
        console.error('Error retrieving items:', err.message);
        reject(err);
      }
      resolve(rows);

      db.close((closeErr) => {
        if (closeErr) {
          console.error('Error closing database:', closeErr.message);
        }
      });
    });
  });
}

/**
* Updates DB upon changes in the cart
* @param {String} name Name of the user
* @param {Cart} cart Cart Object
* @returns {Promise<void>}
*/
function updateDB(name, cart) {
 return new Promise((resolve, reject) => {
   const dbPath = path.resolve(
     __dirname,
     name ? `database/shoppinglist_${name}.db` : 'database/shoppinglist.db'
   );

   // Check if the database exists
   if (!fs.existsSync(dbPath)) {
     const errorMsg = `Database '${path.basename(dbPath)}' not found.`;
     console.error(errorMsg);
     return reject(new Error(errorMsg));
   }

   const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
     if (err) {
       console.error('Error opening database:', err.message);
       return reject(err);
     }
   });

   const executeQuery = (sql, params = []) =>
     new Promise((resolveQuery, rejectQuery) => {
       db.all(sql, params, function (err, rows) {
         if (err) {
           console.error(`Error executing query "${sql}":`, err.message);
           return rejectQuery(err);
         }
         resolveQuery(rows);
       });
     });

   const processUpdates = async () => {
     try {
       // Backup rows with acquired = 1
       const preservedRows = await executeQuery(
         'SELECT owner, url, acquired FROM shopping_lists WHERE acquired = 1'
       ); 

       // Drop and recreate the shopping_lists table
       await executeQuery('DROP TABLE IF EXISTS shopping_lists');
       await executeQuery(`
         CREATE TABLE shopping_lists (
           owner TEXT NOT NULL,
           url TEXT PRIMARY KEY,
           created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
           updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
           acquired BOOLEAN DEFAULT 0,
           deleted BOOLEAN DEFAULT FALSE
         );
       `);

       // Restore preserved rows
       for (const row of preservedRows) {
         await executeQuery(
           `INSERT OR REPLACE INTO shopping_lists (owner, url, acquired) VALUES (?, ?, ?)`,
           [row.owner, row.url, row.acquired]
         );
       }

       // Added deleted lists
       const deleted_lists = cart.getDeletedLists();
       console.log(deleted_lists)
       for( const url of deleted_lists){
          await executeQuery(
            `INSERT OR REPLACE INTO shopping_lists (owner, url, deleted) VALUES (?, ?, ?)`,
            [name || cart.owner || "deleted", url, true]
          );
       }

       // Added purchased lists
       const purchased_lists = cart.getPurchasedLists();
       console.log(purchased_lists)
       for( const url of purchased_lists){
              console.log(url)
              await executeQuery( 
              `INSERT OR REPLACE INTO shopping_lists (owner, url, acquired) VALUES (?, ?, ?)`,
              [name || cart.owner || "purchased", url, true]
            );
       }

      if(cart.lists.size === 0 && purchased_lists.size !== 0){
        for (const url_new of purchased_lists){
          await executeQuery(
            `UPDATE items 
            SET acquired = ?
            WHERE list_id = ?`,
            [1,url_new]
            )
        }
      }

       // Maintain ONLY the items that do not have a list_id or have been acquired
       await executeQuery('DELETE FROM items WHERE list_id IS NOT NULL AND acquired = 0');

       // Add new lists and items to the DB
       const lists = cart.getLists();
       for (const [url, list] of lists) {
        if(!purchased_lists.has(url)){
            // Insert the list
          await executeQuery(
            `INSERT INTO shopping_lists (owner, url, acquired) 
              VALUES (?, ?, ?) 
              ON CONFLICT(url) DO UPDATE SET 
                owner = excluded.owner, 
                acquired = excluded.acquired,
                updated_at = CURRENT_TIMESTAMP`,
            [name || list.owner, url, list.acquired ? 1 : 0]
          );
        }
        
         // Insert items for this list
         const items = list.items;
         for (const item of items) {
           const [description, pncounter] = item;
           let purchased = false;
           if(purchased_lists.has(url)){
              purchased = true;
           }
           await executeQuery(
             `INSERT INTO items (list_id, description, quantity, added, deleted, acquired) VALUES (?, ?, ?, ?, ?, ?)`,
             [url, description, pncounter.read(),pncounter.added.value,pncounter.deleted.value, purchased]
           );
           if (purchased) {
            await executeQuery(
              `UPDATE items 
              SET quantity = quantity - ?, 
                  deleted = deleted + ? 
              WHERE list_id IS NULL AND description = ?`,
              [pncounter.read(),pncounter.read(),description]
            )
          }
         }
       }

       // Close the database
       db.close((closeErr) => {
         if (closeErr) {
           console.error('Error closing database:', closeErr.message);
         }
       });

       resolve();
     } catch (error) {
       db.close((closeErr) => {
         if (closeErr) {
           console.error('Error closing database after failure:', closeErr.message);
         }
       });
       reject(error);
     }
   };

   processUpdates();
 });
}


/**
 * Returns a Cart object from the database
 * @param {*} name 
 * @returns Cart object
 */
function CartFromDB(name) {
  return new Promise(async (resolve, reject) => {
    let dbPath;

    try {
      if (name === undefined) {
        dbPath = path.resolve(__dirname, 'database/shoppinglist.db');
      } else {
        dbPath = path.resolve(__dirname, `database/shoppinglist_${name}.db`);
      }

      // Check if the database exists
      if (!fs.existsSync(dbPath)) {
        const errorMsg = `Database 'shoppinglist_${name}.db' not found.`;
        console.error(errorMsg);
        return reject(new Error(errorMsg));
      }

      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err.message);
          return reject(err);
        }
      });

      const cart = new Cart(name || null);

      // Wrapping db.all in a promise
      const runQuery = (sql) =>
        new Promise((resolveQuery, rejectQuery) => {
          db.all(sql, [], (err, rows) => {
            if (err) {
              return rejectQuery(err);
            }
            resolveQuery(rows);
          });
        });
        

      // Fetch the lists not acquired
      const lists = await runQuery('SELECT * FROM shopping_lists');
      for (const row of lists) {
        //console.log(name || row.owner,row.url)
        cart.createListWithId(name || row.owner, row.url);
        if(row.deleted) cart.deleteList(row.url)
        if(row.acquired) cart.purchaseList(row.url)
      }

      // Fetch the items not accquired
      const items = await runQuery('SELECT * FROM items WHERE acquired = 0');
      for (const row of items) {
        if (row.list_id === null) continue;
        //console.log(row.list_id, row.description, row.quantity)
        cart.addItemToList(row.list_id, row.description, row.added, row.deleted);
      }

      db.close((closeErr) => {
        if (closeErr) {
          console.error('Error closing database:', closeErr.message);
        }
      });

      resolve(cart);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * This function purchases a list, setting the acquired flag to true
 * @param {String} name Name of the user
 * @param {String} url Url of the list
 */
function purchaseList(name, url) {
  return new Promise((resolve, reject) => {
    let dbPath = name
      ? path.resolve(__dirname, `database/shoppinglist_${name}.db`)
      : path.resolve(__dirname, "database/shoppinglist.db");

    if (!fs.existsSync(dbPath)) {
      return reject(new Error(`Database 'shoppinglist_${name}.db' not found.`));
    }

    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        return reject(new Error(`Error opening database: ${err.message}`));
      }
    });

    const runQuery = (sql, params = []) =>
      new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
          if (err) return reject(err);
          resolve(this); // `this` is the context of `db.run`
        });
      });

    const getQuery = (sql, params = []) =>
      new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
          if (err) return reject(err);
          resolve(row);
        });
      });

    const allQuery = (sql, params = []) =>
      new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        });
      });

    (async () => {
      try {
        // Check if list is deleted
        const deletedCheck = await getQuery(
          "SELECT deleted FROM shopping_lists WHERE url = ? AND deleted = 1",
          [url]
        );
        if (deletedCheck) {
          throw new Error("That list was deleted!");
        }

        // Check item quantities
        const items = await allQuery("SELECT * FROM items WHERE list_id = ?", [
          url,
        ]);

        for (const row of items) {
          const serverItem = await getQuery(
            "SELECT * FROM items WHERE list_id IS NULL AND description = ?",
            [row.description]
          );

          if (!serverItem || serverItem.quantity < row.quantity) {
            throw new Error("Not enough items to purchase on the server!");
          }
        }

        // Update the list and items
        await runQuery("UPDATE shopping_lists SET acquired = 1 WHERE url = ?", [
          url,
        ]);
        await runQuery("UPDATE items SET acquired = 1 WHERE list_id = ?", [
          url,
        ]);

        for (const row of items) {
          const serverItem = await getQuery(
            "SELECT * FROM items WHERE list_id IS NULL AND description = ?",
            [row.description]
          );

          const newQuantity =
            serverItem.quantity - row.quantity; // Adjust remaining quantity
          const newDeleted = serverItem.deleted + row.quantity;

          await runQuery(
            "UPDATE items SET quantity = ?, deleted = ? WHERE description = ? AND list_id IS NULL",
            [newQuantity, newDeleted, row.description]
          );
        }

        resolve();
      } catch (err) {
        reject(err);
      } finally {
        db.close((closeErr) => {
          if (closeErr) {
            console.error("Error closing database:", closeErr.message);
          }
        });
      }
    })();
  });
}
module.exports = { retrieveItems, createDB, addList, addItemToList, deleteItemFromList, getItemsFromAList,deleteList,updateDB, CartFromDB, printAllRows, addItemToList, purchaseList,getRowsNull,insertRowsNull };


