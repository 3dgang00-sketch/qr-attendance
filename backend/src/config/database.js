const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Create data folder if it doesn't exist
const dataFolder = path.join(__dirname, '../../data');
if (!fs.existsSync(dataFolder)) {
  fs.mkdirSync(dataFolder, { recursive: true });
}

const dbPath = path.join(dataFolder, 'attendance.db');

// Initialize database connection
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Convert PostgreSQL-style queries ($1, $2) to SQLite-style (?)
function convertQuery(sql) {
  let converted = sql;
  let paramIndex = 1;
  
  // Replace $1, $2, etc with ?
  while (converted.includes(`$${paramIndex}`)) {
    converted = converted.replace(`$${paramIndex}`, '?');
    paramIndex++;
  }
  
  return converted;
}

// Wrapper object to match pg Pool interface
const pool = {
  query: function(sql, params = []) {
    try {
      const convertedSql = convertQuery(sql);
      
      // Check if it's a SELECT query
      if (convertedSql.trim().toUpperCase().startsWith('SELECT')) {
        const stmt = db.prepare(convertedSql);
        const result = stmt.all(...params);
        return Promise.resolve({ rows: result || [] });
      } else {
        const stmt = db.prepare(convertedSql);
        const result = stmt.run(...params);
        return Promise.resolve({
          rows: [],
          changes: result.changes,
          lastID: result.lastInsertRowid,
        });
      }
    } catch (err) {
      return Promise.reject(err);
    }
  },
  
  run: function(sql, params = []) {
    try {
      const convertedSql = convertQuery(sql);
      const stmt = db.prepare(convertedSql);
      const result = stmt.run(...params);
      return Promise.resolve(result);
    } catch (err) {
      return Promise.reject(err);
    }
  }
};

module.exports = pool;