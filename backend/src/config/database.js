const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const query = async (sql, params = []) => {
  let i = 0;
  const converted = sql.replace(/\?/g, () => `$${++i}`);
  console.log('[DB Query]', converted, params);
  const result = await pool.query(converted, params);
  return {
    rows: result.rows,
    changes: result.rowCount,
    lastID: result.rows[0]?.id
  };
};

module.exports = { query };