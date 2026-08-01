require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'za_portfolio_secret_key_2024';
const MONGODB_URI = process.env.MONGODB_URI;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');

// ── Multer for image upload ──────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './uploads/'),
  filename: (req, file, cb) =>
    cb(null, `profile_${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ── MongoDB connection ───────────────────────────────────────
let db;
async function connectDB() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not set in environment variables');
    process.exit(1);
  }
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db('portfolio_app');
  console.log('✅ Connected to MongoDB');

  // Ensure unique index on email so duplicate registrations fail cleanly
  await db.collection('users').createIndex({ email: 1 }, { unique: true });

  // Seed the original account (Zeeshan Ahmad) if no users exist yet
  const existing = await db.collection('users').findOne({ email: 'z.ahmad2003x@gmail.com' });
  if (!existing) {
    const passwordHash = await bcrypt.hash('zeeshan2024', 10);
    await db.collection('users').insertOne({
      email: 'z.ahmad2003x@gmail.com',
      password: passwordHash,
      profile: {
        name: 'Zeeshan Ahmad',
        title: 'Flutter Developer  •  CS Student',
        bio: 'BS Computer Science student at Abdul Wali Khan University Mardan (CGPA 3.25, Batch 2023–2027). Passionate about Flutter, AI/ML, and building practical software solutions.',
        email: 'z.ahmad2003x@gmail.com',
        phone: '0310-9803584',
        location: 'Charsadda, Khyber Pakhtunkhwa, Pakistan',
        github: 'https://github.com/zeeshan-ahmad2003',
        linkedin: 'https://linkedin.com/in/zeeshan-ahmad-5b8a813aa/',
        portfolio: 'https://zeeshan-portfolio-orcin-eight.vercel.app',
        university: 'Abdul Wali Khan University Mardan',
        cgpa: '3.25',
        batch: '2023–2027',
        profileImage: null,
      },
      skills: [
        { id: 1, skill: 'Flutter & Dart', level: 0.70 },
        { id: 2, skill: 'Python', level: 0.85 },
        { id: 3, skill: 'Machine Learning', level: 0.75 },
        { id: 4, skill: 'HTML / CSS', level: 0.80 },
        { id: 5, skill: 'JavaScript', level: 0.65 },
        { id: 6, skill: 'Java', level: 0.60 },
        { id: 7, skill: 'Git & GitHub', level: 0.80 },
        { id: 8, skill: 'SQL / SQLite', level: 0.70 },
      ],
      projects: [
        {
          id: 1, title: 'YouTube Summarizer',
          description: 'AI-powered video summarizer with RAG architecture.',
          fullDescription: 'A RAG-based tool that takes a YouTube video URL, extracts the transcript, and generates a smart summary using a language model. Built with Python, LangChain, and deployed live on Render.',
          tech: 'Python · LangChain · Streamlit',
          techList: ['Python', 'LangChain', 'Streamlit', 'Groq API'],
          category: 'AI/ML',
          githubUrl: 'https://github.com/zeeshan-ahmad2003/youtube-summarizer',
          liveUrl: 'https://youtube-summarizer-24gt.onrender.com',
          status: 'Live',
        },
        {
          id: 2, title: 'PDF Compressor',
          description: 'Compress PDF files via web or desktop app.',
          fullDescription: 'Built in three versions: a Flask web app on Render, a Streamlit app on Streamlit Cloud, and an offline Tkinter desktop app. Supports files up to 200MB across four quality presets.',
          tech: 'Python · Flask · Streamlit · Tkinter',
          techList: ['Python', 'Flask', 'Streamlit', 'Ghostscript'],
          category: 'Python',
          githubUrl: 'https://github.com/zeeshan-ahmad2003/pdf-compressor-streamlit',
          liveUrl: 'https://zeeshans-pdf-tool.streamlit.app',
          status: 'Live',
        },
        {
          id: 3, title: 'Portfolio App',
          description: 'Professional Flutter mobile portfolio app.',
          fullDescription: 'A professional mobile portfolio app built with Flutter during Codiora Software House internship. Features bottom navigation, project details, skills with progress bars, dark/light mode, local data storage and profile editing.',
          tech: 'Flutter · Dart',
          techList: ['Flutter', 'Dart', 'shared_preferences'],
          category: 'Flutter',
          githubUrl: 'https://github.com/zeeshan-ahmad2003/portfolio-app/tree/week-8',
          liveUrl: 'https://github.com/zeeshan-ahmad2003/portfolio-app',
          status: 'Completed',
        },
        {
          id: 4, title: 'AI Doctor Assistant',
          description: 'Multi-agent AI system for medical queries.',
          fullDescription: 'A three-agent system built with Python and Groq API. Agents handle diagnosis suggestions, prescription advice, and follow-up questions. Built as a KPITB course final project.',
          tech: 'Python · Groq API · LangGraph',
          techList: ['Python', 'Groq API', 'LangGraph', 'Agentic AI'],
          category: 'AI/ML',
          githubUrl: 'https://github.com/zeeshan-ahmad2003',
          liveUrl: 'https://github.com/zeeshan-ahmad2003',
          status: 'Completed',
        },
      ],
      createdAt: new Date(),
    });
    console.log('🌱 Seeded original account for Zeeshan Ahmad');
  }
}

// ── Auth middleware ──────────────────────────────────────────
// Stateless: validity is determined purely by JWT signature + expiry,
// not by an in-memory list. This means logged-in users stay logged in
// across server restarts/redeploys (Render free tier restarts often).
const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'No token' });
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET); // { userId, email }
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Token expired or invalid' });
  }
};

// Helper: find a user's document by their JWT-provided userId
async function getUserDoc(userId) {
  return db.collection('users').findOne({ _id: new ObjectId(userId) });
}

// ── Routes ───────────────────────────────────────────────────

// Health
app.get('/', (req, res) =>
  res.json({ message: '🚀 Zeeshan Portfolio API running', version: '5.0.0-multiuser' }));

// Register
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ success: false, message: 'Name, email, and password required' });
  if (password.length < 6)
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

  const existing = await db.collection('users').findOne({ email });
  if (existing)
    return res.status(409).json({ success: false, message: 'An account with this email already exists' });

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = {
    email,
    password: passwordHash,
    profile: {
      name,
      title: 'New Developer',
      bio: 'Welcome to your new portfolio! Tap Edit Profile to tell your story.',
      email,
      phone: '',
      location: '',
      github: '',
      linkedin: '',
      portfolio: '',
      university: '',
      cgpa: '',
      batch: '',
      profileImage: null,
    },
    skills: [],
    projects: [],
    createdAt: new Date(),
  };
  const result = await db.collection('users').insertOne(newUser);

  const token = jwt.sign({ userId: result.insertedId.toString(), email }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ success: true, token, data: newUser.profile });
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email and password required' });

  const user = await db.collection('users').findOne({ email });
  if (!user)
    return res.status(401).json({ success: false, message: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid)
    return res.status(401).json({ success: false, message: 'Invalid credentials' });

  const token = jwt.sign({ userId: user._id.toString(), email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token });
});

// Logout
// With stateless JWT auth, "logout" is enforced client-side by deleting
// the stored token (see ApiService.logout() in the Flutter app). This
// endpoint is kept for compatibility/logging but doesn't need to track
// anything server-side.
app.post('/api/logout', auth, (req, res) => {
  res.json({ success: true, message: 'Logged out' });
});

// GET profile (own profile, requires auth since data is now per-user)
app.get('/api/profile', auth, async (req, res) => {
  const user = await getUserDoc(req.user.userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, data: user.profile });
});

// PUT profile (protected)
app.put('/api/profile', auth, async (req, res) => {
  const { name, bio, email, phone, location, title, github, linkedin, portfolio, university, cgpa, batch } = req.body;
  const updates = {};
  if (name !== undefined) updates['profile.name'] = name;
  if (bio !== undefined) updates['profile.bio'] = bio;
  if (email !== undefined) updates['profile.email'] = email;
  if (phone !== undefined) updates['profile.phone'] = phone;
  if (location !== undefined) updates['profile.location'] = location;
  if (title !== undefined) updates['profile.title'] = title;
  if (github !== undefined) updates['profile.github'] = github;
  if (linkedin !== undefined) updates['profile.linkedin'] = linkedin;
  if (portfolio !== undefined) updates['profile.portfolio'] = portfolio;
  if (university !== undefined) updates['profile.university'] = university;
  if (cgpa !== undefined) updates['profile.cgpa'] = cgpa;
  if (batch !== undefined) updates['profile.batch'] = batch;

  await db.collection('users').updateOne({ _id: new ObjectId(req.user.userId) }, { $set: updates });
  const user = await getUserDoc(req.user.userId);
  res.json({ success: true, data: user.profile });
});

// PUT profile image (protected)
app.put('/api/profile/image', auth, upload.single('image'), async (req, res) => {
  if (!req.file)
    return res.status(400).json({ success: false, message: 'No image' });
  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  await db.collection('users').updateOne(
    { _id: new ObjectId(req.user.userId) },
    { $set: { 'profile.profileImage': imageUrl } }
  );
  res.json({ success: true, imageUrl });
});

// GET skills (own skills)
app.get('/api/skills', auth, async (req, res) => {
  const user = await getUserDoc(req.user.userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, data: user.skills });
});

// PUT skills (replace full list - protected)
app.put('/api/skills', auth, async (req, res) => {
  const { skills } = req.body;
  if (!Array.isArray(skills))
    return res.status(400).json({ success: false, message: 'skills must be an array' });
  await db.collection('users').updateOne({ _id: new ObjectId(req.user.userId) }, { $set: { skills } });
  res.json({ success: true, data: skills });
});

// GET projects (own projects, with search + category filter)
app.get('/api/projects', auth, async (req, res) => {
  const user = await getUserDoc(req.user.userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const { category, search } = req.query;
  let data = user.projects || [];
  if (category && category !== 'All')
    data = data.filter(p => p.category === category);
  if (search) {
    const q = search.toLowerCase();
    data = data.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.tech.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  }
  res.json({ success: true, data, total: data.length });
});

// GET project by id (own project)
app.get('/api/projects/:id', auth, async (req, res) => {
  const user = await getUserDoc(req.user.userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const p = (user.projects || []).find(p => p.id === parseInt(req.params.id));
  if (!p) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: p });
});

// POST a new project (protected)
app.post('/api/projects', auth, async (req, res) => {
  const user = await getUserDoc(req.user.userId);
  const nextId = (user.projects || []).reduce((max, p) => Math.max(max, p.id), 0) + 1;
  const newProject = { id: nextId, ...req.body };
  await db.collection('users').updateOne(
    { _id: new ObjectId(req.user.userId) },
    { $push: { projects: newProject } }
  );
  res.status(201).json({ success: true, data: newProject });
});

// PUT (edit) an existing project (protected)
app.put('/api/projects/:id', auth, async (req, res) => {
  const projectId = parseInt(req.params.id);
  const user = await getUserDoc(req.user.userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const projects = user.projects || [];
  const index = projects.findIndex(p => p.id === projectId);
  if (index === -1) return res.status(404).json({ success: false, message: 'Project not found' });

  const updated = { ...projects[index], ...req.body, id: projectId };
  projects[index] = updated;

  await db.collection('users').updateOne(
    { _id: new ObjectId(req.user.userId) },
    { $set: { projects } }
  );
  res.json({ success: true, data: updated });
});

// DELETE a project (protected)
app.delete('/api/projects/:id', auth, async (req, res) => {
  const projectId = parseInt(req.params.id);
  const user = await getUserDoc(req.user.userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const projects = (user.projects || []).filter(p => p.id !== projectId);

  await db.collection('users').updateOne(
    { _id: new ObjectId(req.user.userId) },
    { $set: { projects } }
  );
  res.json({ success: true, message: 'Project deleted' });
});

// PUT change password (protected)
app.put('/api/change-password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Current and new password required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
  }

  const user = await getUserDoc(req.user.userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    return res.status(401).json({ success: false, message: 'Current password is incorrect' });
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await db.collection('users').updateOne(
    { _id: new ObjectId(req.user.userId) },
    { $set: { password: newHash } }
  );
  res.json({ success: true, message: 'Password changed successfully' });
});

// DELETE own account (protected) — requires password confirmation for safety
app.delete('/api/account', auth, async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, message: 'Password required to confirm deletion' });
  }

  const user = await getUserDoc(req.user.userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ success: false, message: 'Incorrect password' });
  }

  await db.collection('users').deleteOne({ _id: new ObjectId(req.user.userId) });
  res.json({ success: true, message: 'Account deleted' });
});

// GET contact (own contact info)
app.get('/api/contact', auth, async (req, res) => {
  const user = await getUserDoc(req.user.userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const { email, phone, location, github, linkedin, portfolio } = user.profile;
  res.json({ success: true, data: { email, phone, location, github, linkedin, portfolio } });
});

connectDB().then(() => {
  app.listen(PORT, () =>
    console.log(`✅ Portfolio API running at http://localhost:${PORT}`));
}).catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
