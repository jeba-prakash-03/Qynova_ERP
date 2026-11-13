const mysql = require('mysql2/promise');
const fs = require('fs');

async function inspect() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password' ? '7868' : '',
    database: 'qynova_erp'
  });

  const [tables] = await connection.query(`
    SELECT TABLE_NAME 
    FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = 'qynova_erp' AND TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_NAME;
  `);

  const schema = {};

  for (const { TABLE_NAME } of tables) {
    if (TABLE_NAME.startsWith('knex_migrations')) continue;

    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA, COLUMN_KEY, COLUMN_COMMENT
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'qynova_erp' AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION;
    `, [TABLE_NAME]);

    const [fks] = await connection.query(`
      SELECT 
        k.COLUMN_NAME, 
        k.REFERENCED_TABLE_NAME, 
        k.REFERENCED_COLUMN_NAME,
        c.CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE k
      JOIN information_schema.TABLE_CONSTRAINTS c 
        ON k.CONSTRAINT_NAME = c.CONSTRAINT_NAME 
        AND k.TABLE_SCHEMA = c.TABLE_SCHEMA
      WHERE k.TABLE_SCHEMA = 'qynova_erp' 
        AND k.TABLE_NAME = ? 
        AND c.CONSTRAINT_TYPE = 'FOREIGN KEY';
    `, [TABLE_NAME]);

    const [indexes] = await connection.query(`
      SELECT INDEX_NAME, NON_UNIQUE, COLUMN_NAME, SEQ_IN_INDEX
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = 'qynova_erp' AND TABLE_NAME = ?
      ORDER BY INDEX_NAME, SEQ_IN_INDEX;
    `, [TABLE_NAME]);

    schema[TABLE_NAME] = {
      columns,
      foreignKeys: fks,
      indexes
    };
  }

  fs.writeFileSync('docs/analysis/schema_dump.json', JSON.stringify(schema, null, 2));
  console.log('Schema dump saved to docs/analysis/schema_dump.json with', Object.keys(schema).length, 'tables.');
  await connection.end();
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
