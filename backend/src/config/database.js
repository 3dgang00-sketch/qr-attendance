const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Handle database queries with proper PostgreSQL syntax
pool.query = (function(originalQuery) {
  return function(sql, params = []) {
    try {
      // Convert ? to $1, $2 for PostgreSQL
      let i = 0;
      const converted = sql.replace(/\?/g, () => `$${++i}`);
      console.log('[DB]', converted.substring(0, 100));
      
      return originalQuery.call(pool, converted, params).then(result => ({
        rows: result.rows,
        changes: result.rowCount,
        lastID: result.rows[0]?.id
      })).catch(err => {
        console.error('[DB ERROR]', err.message);
        throw err;
      });
    } catch (err) {
      console.error('[DB ERROR] Query failed:', err);
      throw err;
    }
  };
})(pool.query);

module.exports = pool;