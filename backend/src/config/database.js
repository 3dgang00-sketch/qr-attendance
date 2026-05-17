const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Wrapper to convert ? to $1, $2 for PostgreSQL
const originalQuery = pool.query.bind(pool);
pool.query = function(sql, params = []) {
  let i = 0;
  const converted = sql.replace(/\?/g, () => `$${++i}`);
  return originalQuery(converted, params).then(result => ({
    rows: result.rows,
    changes: result.rowCount,
    lastID: result.rows[0]?.id
  }));
};

module.exports = pool;