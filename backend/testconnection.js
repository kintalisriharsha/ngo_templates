const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'ngo_user',
      password: 'harsha@019',
      database: 'ngo_templates'
    });
    console.log('Successfully connected to MySQL');
    await connection.end();
  } catch (err) {
    console.error('Connection error:', err);
  }
}

testConnection();