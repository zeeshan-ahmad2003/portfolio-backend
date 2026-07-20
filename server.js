const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'za_portfolio_secret_key_2024';

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

// ── Data store (in-memory) ───────────────────────────────────
let profile = {
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
};

const skills = [
  { id: 1, skill: 'Flutter & Dart', level: 0.70 },
  { id: 2, skill: 'Python', level: 0.85 },
  { id: 3, skill: 'Machine Learning', level: 0.75 },
  { id: 4, skill: 'HTML / CSS', level: 0.80 },
  { id: 5, skill: 'JavaScript', level: 0.65 },
  { id: 6, skill: 'Java', level: 0.60 },
  { id: 7, skill: 'Git & GitHub', level: 0.80 },
  { id: 8, skill: 'SQL / SQLite', level: 0.70 },
];

const projects = [
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
    githubUrl: 'https://github.com/zeeshan-ahmad2003/portfolio-app/tree/week-3',
    liveUrl: 'https://github.com/zeeshan-ahmad2003/portfolio-app',
    status: 'In Progress',
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
];

// Admin credentials
const ADMIN_EMAIL = 'z.ahmad2003x@gmail.com';
const ADMIN_PASS_HASH = bcrypt.hashSync('zeeshan2024', 10);
const activeTokens = new Set();

// ── Auth middleware ──────────────────────────────────────────
const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'No token' });
  const token = header.split(' ')[1];
  if (!activeTokens.has(token))
    return res.status(401).json({ success: false, message: 'Token invalid or logged out' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Token expired' });
  }
};

// ── Routes ───────────────────────────────────────────────────

// Health
app.get('/', (req, res) =>
  res.json({ message: '🚀 Zeeshan Portfolio API running', version: '4.0.0' }));

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email and password required' });
  if (email !== ADMIN_EMAIL)
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, ADMIN_PASS_HASH);
  if (!valid)
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '7d' });
  activeTokens.add(token);
  res.json({ success: true, token });
});

// Logout
app.post('/api/logout', auth, (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  activeTokens.delete(token);
  res.json({ success: true, message: 'Logged out' });
});

// GET profile
app.get('/api/profile', (req, res) =>
  res.json({ success: true, data: profile }));

// PUT profile (protected)
app.put('/api/profile', auth, (req, res) => {
  const { name, bio, email, phone, location, title } = req.body;
  if (name) profile.name = name;
  if (bio) profile.bio = bio;
  if (email) profile.email = email;
  if (phone) profile.phone = phone;
  if (location) profile.location = location;
  if (title) profile.title = title;
  res.json({ success: true, data: profile });
});

// PUT profile image (protected)
app.put('/api/profile/image', auth, upload.single('image'), (req, res) => {
  if (!req.file)
    return res.status(400).json({ success: false, message: 'No image' });
  profile.profileImage = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ success: true, imageUrl: profile.profileImage });
});

// GET skills
app.get('/api/skills', (req, res) =>
  res.json({ success: true, data: skills }));

// GET projects (with search + category filter)
app.get('/api/projects', (req, res) => {
  const { category, search } = req.query;
  let data = projects;
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

// GET project by id
app.get('/api/projects/:id', (req, res) => {
  const p = projects.find(p => p.id === parseInt(req.params.id));
  if (!p) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: p });
});

// GET contact
app.get('/api/contact', (req, res) =>
  res.json({
    success: true,
    data: {
      email: profile.email, phone: profile.phone,
      location: profile.location, github: profile.github,
      linkedin: profile.linkedin, portfolio: profile.portfolio,
    },
  }));

app.listen(PORT, () =>
  console.log(`✅ Portfolio API running at http://localhost:${PORT}`));