require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 5000;

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'ngo_user',
  password: process.env.DB_PASSWORD || 'harsha@019',
  database: process.env.DB_NAME || 'ngo_templates',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

// Add this after DB_CONFIG to debug
console.log('Database Config:', {
  host: DB_CONFIG.host,
  user: DB_CONFIG.user,
  database: DB_CONFIG.database,
  // Don't log password for security
});

// Create connection pool
const pool = mysql.createPool(DB_CONFIG);

// Initialize database tables
async function initializeDatabase() {
  try {
    console.log('Attempting to get database connection...');
    connection = await pool.getConnection();
    console.log('Successfully connected to database');
    
    // Create users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        organization_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        logo VARCHAR(255),
        website VARCHAR(255),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL,
        INDEX idx_email (email)
      )
    `);

    // Create templates table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS templates (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category ENUM('Events', 'Campaigns', 'Fundraising', 'Social Media', 'Other') NOT NULL,
        image_url VARCHAR(255),
        thumbnail_url VARCHAR(255),
        user_id VARCHAR(36) NOT NULL,
        customization JSON,
        is_public BOOLEAN DEFAULT FALSE,
        downloads INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        INDEX idx_user_id (user_id),
        INDEX idx_category (category)
      )
    `);

    // Create template_tags table for many-to-many relationship
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS template_tags (
        template_id VARCHAR(36),
        tag VARCHAR(50),
        PRIMARY KEY (template_id, tag),
        FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
      )
    `);

    connection.release();
    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Database initialization error details:', {
      code: err.code,
      errno: err.errno,
      sqlState: err.sqlState,
      sqlMessage: err.sqlMessage
    });
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static('uploads'));

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG and SVG files are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const [rows] = await pool.execute(
      'SELECT id, organization_name, email, website FROM users WHERE id = ?',
      [decoded.id]
    );
    
    if (!rows.length) {
      return res.status(404).json({ message: 'User not found.' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Routes
app.post('/api/register', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { organizationName, email, password, website, description } = req.body;
    
    // Check if user exists
    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (existing.length) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = require('crypto').randomUUID();

    await connection.execute(
      `INSERT INTO users (id, organization_name ,email, password, website, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, organizationName, email, hashedPassword, website, description]
    );

    res.status(201).json({ message: 'Registration successful' });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed', error: err.message });
  } finally {
    connection.release();
  }
});

app.post('/api/login', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { email, password } = req.body;
    
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (!users.length) {
      return res.status(400).json({ message: 'Email not found' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    await connection.execute(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });
    
    res.json({
      token,
      user: {
        id: user.id,
        organizationName: user.organization_name,
        email: user.email,
        website: user.website
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  } finally {
    connection.release();
  }
});

app.post('/api/templates', authenticateToken, upload.single('image'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { name, category, customization, isPublic, tags } = req.body;
    const templateId = require('crypto').randomUUID();
    
    await connection.beginTransaction();

    await connection.execute(
      `INSERT INTO templates (id, name, category, image_url, user_id, customization, is_public)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        templateId,
        name,
        category,
        req.file ? `/uploads/${req.file.filename}` : null,
        req.user.id,
        customization,
        isPublic === 'true'
      ]
    );

    if (tags) {
      const parsedTags = JSON.parse(tags);
      for (const tag of parsedTags) {
        await connection.execute(
          'INSERT INTO template_tags (template_id, tag) VALUES (?, ?)',
          [templateId, tag]
        );
      }
    }

    await connection.commit();
    
    const [template] = await connection.execute(
      'SELECT * FROM templates WHERE id = ?',
      [templateId]
    );

    res.status(201).json(template[0]);
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: 'Failed to create template', error: err.message });
  } finally {
    connection.release();
  }
});

app.get('/api/templates', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { category, search, sort } = req.query;
    let query = `
      SELECT t.*, GROUP_CONCAT(tt.tag) as tags
      FROM templates t
      LEFT JOIN template_tags tt ON t.id = tt.template_id
      WHERE t.user_id = ?
    `;
    const queryParams = [req.user.id];

    if (category) {
      query += ' AND t.category = ?';
      queryParams.push(category);
    }

    if (search) {
      query += ` AND (t.name LIKE ? OR EXISTS (
        SELECT 1 FROM template_tags tt2 
        WHERE tt2.template_id = t.id AND tt2.tag LIKE ?
      ))`;
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    query += ' GROUP BY t.id';

    if (sort === 'newest') {
      query += ' ORDER BY t.created_at DESC';
    } else if (sort === 'popular') {
      query += ' ORDER BY t.downloads DESC';
    }

    const [templates] = await connection.execute(query, queryParams);
    
    // Convert tags string to array
    templates.forEach(template => {
      template.tags = template.tags ? template.tags.split(',') : [];
    });

    res.json(templates);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch templates', error: err.message });
  } finally {
    connection.release();
  }
});

app.get('/api/templates/:id', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [template] = await connection.execute(
      `SELECT * FROM templates WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    );

    if (!template.length) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json(template[0]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch template', error: err.message });
  } finally {
    connection.release();
  }
});

// Update template endpoint
app.put('/api/templates/:id', authenticateToken, upload.single('image'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { name, category, customization, isPublic } = req.body;
    const templateId = req.params.id;

    // Check if template exists and belongs to user
    const [existing] = await connection.execute(
      'SELECT * FROM templates WHERE id = ? AND user_id = ?',
      [templateId, req.user.id]
    );

    if (!existing.length) {
      return res.status(404).json({ message: 'Template not found' });
    }

    await connection.execute(
      `UPDATE templates 
       SET name = ?, category = ?, customization = ?, 
           image_url = ?, is_public = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [
        name,
        category,
        customization,
        req.file ? `/uploads/${req.file.filename}` : existing[0].image_url,
        isPublic === 'true',
        templateId,
        req.user.id
      ]
    );

    const [updated] = await connection.execute(
      'SELECT * FROM templates WHERE id = ?',
      [templateId]
    );

    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update template', error: err.message });
  } finally {
    connection.release();
  }
});

// First, add this to your server.js to track downloads
app.post('/api/templates/:id/download', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    // Record the download
    await connection.execute(
      `INSERT INTO template_downloads (template_id, user_id, downloaded_at) 
       VALUES (?, ?, CURRENT_TIMESTAMP)`,
      [req.params.id, req.user.id]
    );

    // Update template download count
    await connection.execute(
      `UPDATE templates SET downloads = downloads + 1 WHERE id = ?`,
      [req.params.id]
    );

    res.json({ message: 'Download recorded successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to record download' });
  } finally {
    connection.release();
  }
});

app.get('/api/downloads/recent', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [downloads] = await connection.execute(
      `SELECT td.*, t.name, t.category, t.image_url 
       FROM template_downloads td
       JOIN templates t ON td.template_id = t.id
       WHERE td.user_id = ?
       ORDER BY td.downloaded_at DESC
       LIMIT 5`,
      [req.user.id]
    );
    
    res.json(downloads);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch recent downloads' });
  } finally {
    connection.release();
  }
});

// Initialize database and start server
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('Database initialized successfully');
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

module.exports = app;