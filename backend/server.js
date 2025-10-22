const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

// --- CONFIGURATION ---
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://CipherStudio_user:n9FNg9sVI9n3jwkz@cluster0.wo4x0bs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"; // Add your MONGO_URI here
const PORT = process.env.PORT || 3001;

// --- DATABASE SCHEMA (Updated) ---
const projectSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true }, 
  files: {
    type: Object,
    required: true
  }
}, { timestamps: true });

const Project = mongoose.model('Project', projectSchema);

// --- SETUP APP ---
const app = express();
mongoose.connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch(err => console.error("Error connecting to MongoDB:", err));

// --- MIDDLEWARE ---
const allowedOrigins = [
  'http://localhost:3000',
  'https://cipher-studio-two.vercel.app' // Your Vercel URL from the screenshot
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));

app.use(express.json());


// --- API ENDPOINTS from HELP GUIDE (Scaffolded) ---
app.post("/api/users", (req, res) => {
    console.log("POST /api/users: Attempting to create user...", req.body);
    res.status(201).json({ message: "User created successfully (simulated)", userId: `user_${Date.now()}` });
});

app.post("/api/users/login", (req, res) => {
    console.log("POST /api/users/login: Attempting to login...", req.body);
    res.status(200).json({ message: "Login successful (simulated)", token: "fake-jwt-token" });
});


// --- PROJECT API ENDPOINTS (Updated to use userId) ---
app.post("/projects", async (req, res) => {
  const { userId } = req.body; 
  if (!userId) {
      return res.status(400).json({ error: "userId is required to create a project."});
  }
  
  console.log(`POST /projects: Creating new project for user ${userId}...`);
  try {
    const defaultFiles = {
      "/App.js": `import React from "react";\nimport "./styles.css";\n\nexport default function App() {\n  return (\n    <div className="App">\n      <h1>Hello, Welcome to CipherStudio!</h1>\n      <h2>Your personal React sandbox.</h2>\n    </div>\n  );\n}`,
      "/index.js": `import React from "react";\nimport { createRoot } from "react-dom/client";\nimport App from "./App";\n\nconst rootElement = document.getElementById("root");\nconst root = createRoot(rootElement);\n\nroot.render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);`,
      "/styles.css": `body {\n  font-family: sans-serif;\n}\n\n.App {\n  text-align: center;\n  background-color: #f0f0f0;\n  padding: 20px;\n  border-radius: 8px;\n}`
    };
    
    const newProject = new Project({ userId, files: defaultFiles });
    await newProject.save();
    
    console.log(`Project ${newProject._id} created.`);
    res.status(201).json({ projectId: newProject._id }); 
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creating project" });
  }
});

// --- THIS IS THE MISSING CODE ---

// [GET] /projects/:id - Fetches a single project by its ID
app.get("/projects/:id", async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }
        res.status(200).json({
            id: project._id,
            files: project.files
        });
    } catch (error) {
        console.error("Error fetching project:", error);
        res.status(500).json({ error: "Server error fetching project" });
    }
});

// [POST] /projects/:id - Updates (saves) a project's files
app.post("/projects/:id", async (req, res) => {
    const { files } = req.body;
    if (!files) {
        return res.status(400).json({ error: "Missing 'files' in body" });
    }
    try {
        const updatedProject = await Project.findByIdAndUpdate(
            req.params.id,
            { files: files },
            { new: true } // Return the updated document
        );
        if (!updatedProject) {
            return res.status(404).json({ error: "Project not found" });
        }
        res.status(200).json({ message: "Project saved successfully" });
    } catch (error) {
        console.error("Error saving project:", error);
        res.status(500).json({ error: "Server error saving project" });
    }
});
// -----------------------------


// --- START SERVER ---

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
});

