import React, { useState, useEffect, useCallback, useRef } from "react";
import { Sandpack } from "@codesandbox/sandpack-react";

// --- CONFIGURATION ---
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

// --- UI COMPONENTS ---

const Header = ({ username, onLogout }) => (
  <header style={styles.header}>
    <h1 style={{ margin: 0, fontSize: '24px' }}>CipherStudio</h1>
    {username && (
      <div style={styles.userInfo}>
        <span>Welcome, <strong>{username}</strong></span>
        <button onClick={onLogout} style={styles.logoutButton}>Logout</button>
      </div>
    )}
  </header>
);

const Footer = () => (
  <footer style={styles.footer}>
    <p>© CipherStudio - Your Browser-Based React IDE</p>
  </footer>
);

const AuthPage = ({ children, title, switchText, onSwitch }) => (
  <div style={styles.authPage}>
    <div style={styles.authContainer}>
      <div style={styles.authBox}>
        <h2 style={{ margin: '0 0 20px 0' }}>{title}</h2>
        {children}
        <p style={styles.switchText}>
          {switchText} <span onClick={onSwitch} style={styles.switchLink}>Click here</span>
        </p>
      </div>
    </div>
  </div>
);

const LoginPage = ({ onLogin, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const users = JSON.parse(localStorage.getItem('users')) || {};
    if (users[email] && users[email] === password) {
      onLogin(email);
    } else {
      alert("Invalid credentials. Please try again or register.");
    }
  };

  return (
    <AuthPage title="Login" switchText="Don't have an account?" onSwitch={onSwitchToRegister}>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={styles.authInput} required />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={styles.authInput} required />
        <button type="submit" style={styles.authButton}>Login</button>
      </form>
    </AuthPage>
  );
};

const RegisterPage = ({ onRegister, onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const users = JSON.parse(localStorage.getItem('users')) || {};
    if (users[email]) {
      alert("A user with this email already exists.");
      return;
    }
    users[email] = password;
    localStorage.setItem('users', JSON.stringify(users));
    alert("Registration successful! You are now logged in.");
    onRegister(email);
  };

  return (
    <AuthPage title="Create Account" switchText="Already have an account?" onSwitch={onSwitchToLogin}>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={styles.authInput} required />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={styles.authInput} required />
        <button type="submit" style={styles.authButton}>Register</button>
      </form>
    </AuthPage>
  );
};

const FileExplorer = ({ files, activeFile, onFileClick, onCreateFile, onDeleteFile }) => {
  const [newFileName, setNewFileName] = useState('');

  const handleCreateFile = () => {
    if (newFileName && !newFileName.includes(' ') && newFileName.includes('.')) {
        if (files[`/${newFileName}`]) {
            alert("A file with this name already exists.");
            return;
        }
        onCreateFile(`/${newFileName}`);
        setNewFileName('');
    } else {
      alert("Please enter a valid file name (e.g., 'Component.js').");
    }
  };
  
  return (
    <div style={styles.fileExplorer}>
      <h3 style={styles.fileExplorerTitle}>Files</h3>
      <div style={styles.fileList}>
        {Object.keys(files).map(fileName => (
          <div key={fileName} style={styles.fileItemWrapper}>
            <div
              onClick={() => onFileClick(fileName)}
              style={{ ...styles.fileItem, background: fileName === activeFile ? '#094771' : 'transparent' }}
            >
              {fileName.substring(1)}
            </div>
            {fileName !== "/App.js" && fileName !== "/index.js" && fileName !== "/styles.css" && (
                 <span onClick={() => onDeleteFile(fileName)} style={styles.deleteButton}>×</span>
            )}
          </div>
        ))}
      </div>
       <div style={styles.addFileContainer}>
        <input
          type="text"
          value={newFileName}
          onChange={(e) => setNewFileName(e.target.value)}
          placeholder="new-file.js"
          style={styles.addFileInput}
          onKeyPress={(e) => e.key === 'Enter' && handleCreateFile()}
        />
        <button onClick={handleCreateFile} style={styles.addFileButton}>+</button>
      </div>
    </div>
  );
};

const IDEPage = ({ username }) => {
    const USER_PROJECT_ID_KEY = `lastProjectId_${username}`;

    const [files, setFiles] = useState(null);
    const [projectId, setProjectId] = useState(null);
    const [status, setStatus] = useState("Initializing...");
    const [activeFile, setActiveFile] = useState("/App.js");
    const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
    
    // Use ref to prevent infinite loops
    const isInitializingRef = useRef(false);
    const hasInitializedRef = useRef(false);

    const handleResize = useCallback(() => setIsMobileView(window.innerWidth < 768), []);
    useEffect(() => {
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [handleResize]);
    
    // Fixed initialization logic with proper guards
    useEffect(() => {
        // Prevent running if already initialized or initializing
        if (hasInitializedRef.current || isInitializingRef.current) {
            return;
        }
        
        isInitializingRef.current = true;

        const createNewProject = async () => {
            console.log("Attempting to create a new project...");
            setStatus("Creating new project...");
            try {
                const response = await fetch(`${API_URL}/projects`, {
                    method: "POST",
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: username })
                });
                
                if (!response.ok) {
                    throw new Error(`Backend failed: ${response.status}`);
                }
                
                const data = await response.json();
                console.log("New project created:", data.projectId);
                return data.projectId;
            } catch (error) {
                console.error("Could not create new project:", error);
                setStatus(`Error: ${error.message}. Check if backend is running.`);
                return null;
            }
        };

        const loadProject = async (id) => {
            console.log(`Attempting to load project: ${id}`);
            setStatus(`Loading project ${id}...`);
            try {
                const response = await fetch(`${API_URL}/projects/${id}`);
                
                if (!response.ok) {
                    throw new Error("Project not found on server");
                }
                
                const data = await response.json();

                setFiles(data.files);
                setProjectId(data.id);
                localStorage.setItem(USER_PROJECT_ID_KEY, data.id);
                setActiveFile("/App.js");
                setStatus(`Loaded project: ${data.id}`);
                console.log("Project loaded successfully");
                return true;
            } catch (error) {
                console.error(`Failed to load project ${id}:`, error);
                return false;
            }
        };

        const initialize = async () => {
            const lastProjectId = localStorage.getItem(USER_PROJECT_ID_KEY);
            
            if (lastProjectId) {
                console.log(`Found existing project ID: ${lastProjectId}`);
                const loadSuccess = await loadProject(lastProjectId);
                
                // Only create new project if loading failed
                if (!loadSuccess) {
                    console.log("Loading failed, creating new project...");
                    // Clear invalid project ID
                    localStorage.removeItem(USER_PROJECT_ID_KEY);
                    const newId = await createNewProject();
                    if (newId) {
                        await loadProject(newId);
                    }
                }
            } else {
                console.log("No existing project found, creating new one...");
                const newId = await createNewProject();
                if (newId) {
                    await loadProject(newId);
                }
            }
            
            hasInitializedRef.current = true;
            isInitializingRef.current = false;
        };

        initialize();
        
        // Cleanup function
        return () => {
            isInitializingRef.current = false;
        };
    }, [username, USER_PROJECT_ID_KEY]);
    
    const saveProject = async () => {
        if (!projectId || !files) {
            console.warn("Cannot save: missing projectId or files");
            return;
        }
        
        setStatus("Saving...");
        try {
            const response = await fetch(`${API_URL}/projects/${projectId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ files: files }),
            });
            
            if (!response.ok) {
                throw new Error(`Save failed: ${response.status}`);
            }
            
            setStatus("Project Saved!");
            setTimeout(() => setStatus("Ready"), 2000);
        } catch (error) {
            console.error("Error saving project:", error);
            setStatus(`Error: ${error.message}`);
        }
    };
    
    const createFile = (fileName) => {
        const newFiles = { ...files, [fileName]: `// ${fileName.substring(1)}\n\n` };
        setFiles(newFiles);
        setActiveFile(fileName);
    };

    const deleteFile = (fileName) => {
        if (window.confirm(`Are you sure you want to delete ${fileName}?`)) {
            const { [fileName]: _, ...remainingFiles } = files;
            setFiles(remainingFiles);
            if(activeFile === fileName) setActiveFile("/App.js");
        }
    };

    if (!files) {
        return (
            <div style={styles.loadingScreen}>
                <div style={{ textAlign: 'center' }}>
                    <h2>{status}</h2>
                    {status.includes('Error') && (
                        <div style={{ marginTop: '20px', color: '#ff6b6b' }}>
                            <p>Make sure your backend server is running on {API_URL}</p>
                            <p style={{ fontSize: '14px', marginTop: '10px' }}>
                                Start it with: <code style={{ background: '#333', padding: '5px 10px', borderRadius: '4px' }}>npm start</code> (in backend folder)
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div style={styles.ideContainer}>
            <div style={{ ...styles.mainArea, flexDirection: isMobileView ? 'column' : 'row' }}>
                <FileExplorer
                    files={files}
                    activeFile={activeFile}
                    onFileClick={setActiveFile}
                    onCreateFile={createFile}
                    onDeleteFile={deleteFile}
                />
                <div style={styles.sandpackWrapper}>
                    <Sandpack
                        template="react"
                        theme="dark"
                        files={files}
                        onFilesChange={setFiles}
                        key={projectId}
                        options={{
                            editorHeight: isMobileView ? "50vh" : "calc(100vh - 45px)",
                            entry: "/index.js",
                            activeFile: activeFile,
                            showTabs: false,
                            showConsole: true,
                            showConsoleButton: true,
                        }}
                    />
                </div>
            </div>
            <div style={styles.statusBar}>
                <span><strong>Status:</strong> {status}</span>
                <button onClick={saveProject} style={styles.saveButton}>Save Project</button>
                <span><strong>Project ID:</strong> {projectId}</span>
            </div>
        </div>
    );
};

// --- APP CONTAINER & PAGE ROUTING ---

export default function App() {
  const [page, setPage] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const loggedInUser = localStorage.getItem('currentUser');
    if (loggedInUser) {
        setCurrentUser(loggedInUser);
        setPage('ide');
    }
  }, []);

  const handleLogin = (userEmail) => {
    localStorage.setItem('currentUser', userEmail);
    setCurrentUser(userEmail);
    setPage('ide');
  };
  
  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setPage('login');
  };

  const handleRegister = (userEmail) => {
      handleLogin(userEmail);
  };

  return (
    <div style={styles.app}>
      <Header username={currentUser} onLogout={handleLogout} />
      <main style={styles.mainContent}>
        {page === 'login' && <LoginPage onLogin={handleLogin} onSwitchToRegister={() => setPage('register')} />}
        {page === 'register' && <RegisterPage onRegister={handleRegister} onSwitchToLogin={() => setPage('login')} />}
        {page === 'ide' && currentUser && <IDEPage username={currentUser} />}
      </main>
      <Footer />
    </div>
  );
}

// --- STYLES ---

const styles = {
    // App Structure
    app: { display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#1e1e1e', color: 'white' },
    header: { display: 'flex', alignItems: 'center', padding: '10px 20px', background: '#252525', borderBottom: '1px solid #333' },
    userInfo: { marginLeft: 'auto', display: 'flex', alignItems: 'center' },
    logoutButton: { marginLeft: '15px', background: 'transparent', border: '1px solid #555', color: 'white', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' },
    mainContent: { flexGrow: 1, display: 'flex', flexDirection: 'column' },
    footer: { textAlign: 'center', padding: '15px', background: '#252525', borderTop: '1px solid #333', fontSize: '12px' },
    // Auth Pages
    authPage: { flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    authContainer: { width: '100%', maxWidth: '350px' },
    authBox: { padding: '40px', background: '#252525', borderRadius: '8px', textAlign: 'center' },
    authInput: { width: '100%', padding: '12px', marginBottom: '15px', background: '#333', border: '1px solid #555', color: 'white', borderRadius: '4px' },
    authButton: { width: '100%', padding: '12px', background: '#094771', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' },
    switchText: { marginTop: '20px', fontSize: '14px', color: '#aaa' },
    switchLink: { color: '#4a90e2', cursor: 'pointer', textDecoration: 'underline' },
    // Loading Screen
    loadingScreen: { flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' },
    // IDE Page
    ideContainer: { display: 'flex', flexDirection: 'column', flexGrow: 1 },
    mainArea: { display: 'flex', flexGrow: 1, overflow: 'hidden' },
    sandpackWrapper: { flexGrow: 1, height: '100%' },
    fileExplorer: { width: '220px', background: '#1e1e1e', color: 'white', display: 'flex', flexDirection: 'column', borderRight: '1px solid #333' },
    fileExplorerTitle: { marginTop: 0, marginBottom: '15px', borderBottom: '1px solid #333', padding: '10px', fontSize: '16px' },
    fileList: { flexGrow: 1, overflowY: 'auto', padding: '0 10px' },
    fileItemWrapper: { display: 'flex', alignItems: 'center', marginBottom: '2px' },
    fileItem: { padding: '6px 10px', cursor: 'pointer', borderRadius: '4px', fontSize: '14px', fontFamily: 'monospace', flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    deleteButton: { cursor: 'pointer', padding: '0 8px', color: '#888', fontSize: '20px' },
    addFileContainer: { display: 'flex', padding: '10px', borderTop: '1px solid #333' },
    addFileInput: { flexGrow: 1, padding: '5px', background: '#333', border: '1px solid #555', color: 'white', borderRadius: '4px 0 0 4px', marginRight: '-1px' },
    addFileButton: { padding: '5px 10px', background: '#094771', border: 'none', color: 'white', borderRadius: '0 4px 4px 0', cursor: 'pointer' },
    statusBar: { padding: '5px 15px', background: '#252525', color: '#aaa', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #333' },
    saveButton: { padding: '5px 15px', background: '#094771', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }
};