const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'campus-marketplace-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Data storage files
const USERS_FILE = './data/users.json';
const LISTINGS_FILE = './data/listings.json';

// Ensure data directory exists
if (!fs.existsSync('./data')) {
  fs.mkdirSync('./data');
}

// Initialize data files if they don't exist
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
}

if (!fs.existsSync(LISTINGS_FILE)) {
  fs.writeFileSync(LISTINGS_FILE, JSON.stringify([], null, 2));
}

// Helper functions
const readUsers = () => {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const writeUsers = (users) => {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

const readListings = () => {
  try {
    const data = fs.readFileSync(LISTINGS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const writeListings = (listings) => {
  fs.writeFileSync(LISTINGS_FILE, JSON.stringify(listings, null, 2));
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// API Routes

// User Registration
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name, studentId } = req.body;

    if (!email || !password || !name || !studentId) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const users = readUsers();
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now().toString(),
      email,
      password: hashedPassword,
      name,
      studentId,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    writeUsers(users);

    const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET);

    res.status(201).json({
      token,
      user: { id: newUser.id, email: newUser.email, name: newUser.name, studentId: newUser.studentId }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// User Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const users = readUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, studentId: user.studentId }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
app.get('/api/me', authenticateToken, (req, res) => {
  const users = readUsers();
  const user = users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ id: user.id, email: user.email, name: user.name, studentId: user.studentId });
});

// Get all listings
app.get('/api/listings', (req, res) => {
  const listings = readListings();
  res.json(listings);
});

// Get single listing
app.get('/api/listings/:id', (req, res) => {
  const listings = readListings();
  const listing = listings.find(l => l.id === req.params.id);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }
  res.json(listing);
});

// Create listing
app.post('/api/listings', authenticateToken, (req, res) => {
  try {
    const { title, description, price, category, condition, images } = req.body;

    if (!title || !description || !price || !category) {
      return res.status(400).json({ error: 'Title, description, price, and category are required' });
    }

    const listings = readListings();
    const users = readUsers();
    const user = users.find(u => u.id === req.user.id);

    const newListing = {
      id: Date.now().toString(),
      title,
      description,
      price: parseFloat(price),
      category,
      condition: condition || 'Good',
      images: images || [],
      sellerId: req.user.id,
      sellerName: user.name,
      sellerEmail: user.email,
      createdAt: new Date().toISOString(),
      status: 'active'
    };

    listings.push(newListing);
    writeListings(listings);

    res.status(201).json(newListing);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's listings
app.get('/api/my-listings', authenticateToken, (req, res) => {
  const listings = readListings();
  const userListings = listings.filter(l => l.sellerId === req.user.id);
  res.json(userListings);
});

// Delete listing
app.delete('/api/listings/:id', authenticateToken, (req, res) => {
  const listings = readListings();
  const listingIndex = listings.findIndex(l => l.id === req.params.id);

  if (listingIndex === -1) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  if (listings[listingIndex].sellerId !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized to delete this listing' });
  }

  listings.splice(listingIndex, 1);
  writeListings(listings);

  res.json({ message: 'Listing deleted successfully' });
});

// Search listings
app.get('/api/search', (req, res) => {
  const { q, category, minPrice, maxPrice } = req.query;
  let listings = readListings();

  if (q) {
    const query = q.toLowerCase();
    listings = listings.filter(l =>
      l.title.toLowerCase().includes(query) ||
      l.description.toLowerCase().includes(query)
    );
  }

  if (category) {
    listings = listings.filter(l => l.category === category);
  }

  if (minPrice) {
    listings = listings.filter(l => l.price >= parseFloat(minPrice));
  }

  if (maxPrice) {
    listings = listings.filter(l => l.price <= parseFloat(maxPrice));
  }

  res.json(listings);
});

// Serve frontend
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Campus Marketplace server running on http://localhost:${PORT}`);
});
