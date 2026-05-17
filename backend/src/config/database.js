const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Convert ? to $1, $2 for PostgreSQL
pool.query = (function(originalQuery) {
  return function(sql, params = []) {
    let i = 0;
    const converted = sql.replace(/\?/g, () => `$${++i}`);
    console.log('[DB]', converted.substring(0, 100));
    return originalQuery.call(pool, converted, params).then(result => ({
      rows: result.rows,
      changes: result.rowCount,
      lastID: result.rows[0]?.id
    }));
  };
})(pool.query);

module.exports = pool;