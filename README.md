# 🚀 Real-Time Collaborative Code Editor

A full-stack collaborative coding platform where multiple users can create workspaces, manage project files, invite team members, and edit code with live preview support.

### Landing Page
![Landing Page](./screenshots/landing-page.png)

### Login Page
![Login Page](./screenshots/login-page%20(2).png)

### Sign Up Page
![Sign Up Page](./screenshots/signup.png)

### Workspace Editor
![Workspace Editor](./screenshots/workspace-editor.png)
---

## 🌟 Overview

This project simulates a lightweight online development environment that lets developers collaborate inside shared workspaces. Users can create coding rooms, manage files, invite collaborators, and instantly preview HTML/CSS/JavaScript changes — all from the browser.

---

## ✨ Features

### 🔐 Authentication
- User registration & login
- Session management
- Protected routes
- User profiles

### 🏢 Workspace Management
- Create & delete workspaces
- Workspace ownership
- Role-based access (Owner / Editor)

### 📁 File Management
- Create, rename, and delete files
- Files persisted in PostgreSQL
- Instant sidebar updates on change

### 📝 Code Editor
- Monaco Editor integration
- Syntax highlighting
- Multi-file editing
- Support for HTML, CSS, JavaScript, JSON & TXT

### 👥 Collaboration
- Invite members via email
- Accept/decline invitations
- Workspace membership system
- Owner & Editor roles

### ⚡ Live Preview
- Real-time HTML rendering
- CSS styling preview
- JavaScript execution support
- Instant refresh on save

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React.js, Vite, Monaco Editor, Context API, CSS |
| **Backend & Database** | InsForge, PostgreSQL |
| **Tooling** | Git, GitHub, VS Code |

---

## 📂 Project Structure

```bash
collaborative-code-editor/
│
├── src/
│   ├── lib/
│   │   ├── api.js            # API request helpers
│   │   ├── authSession.js    # Session/token handling
│   │   └── insforge.js       # InsForge client setup
│   │
│   ├── state/
│   │   └── AuthContext.jsx   # Global auth state (Context API)
│   │
│   ├── utils/
│   │   └── preview.js        # Live preview rendering logic
│   │
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
│
├── migrations/                # PostgreSQL schema migrations
├── package.json
├── vite.config.js
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- A PostgreSQL database
- An [InsForge](https://insforge.dev) project

### 1. Clone the repository
```bash
git clone https://github.com/Harsh-9113/collaborative-code-editor.git
```

### 2. Navigate to the project
```bash
cd collaborative-code-editor
```

### 3. Install dependencies
```bash
npm install
```

### 4. Configure environment variables
Create a `.env` file in the project root:
```env
VITE_INSFORGE_PROJECT_URL=your_insforge_project_url
VITE_INSFORGE_API_KEY=your_insforge_api_key
DATABASE_URL=postgresql://user:password@localhost:5432/collaborative_editor
```

### 5. Run database migrations
```bash
# run files in /migrations against your PostgreSQL instance
```

### 6. Start the development server
```bash
npm run dev
```

The app will be available at **http://localhost:5173**.

---

## 📸 Screenshots

> _Add screenshots/GIFs here to showcase the app in action._

| Section | Preview |
|---|---|
| **Landing Page** — workspace creation & authentication | _coming soon_ |
| **Workspace Editor** — Monaco editor, file explorer, live preview | _coming soon_ |
| **Team Collaboration** — member invitations & role management | _coming soon_ |

---

## 🎯 Key Learning Outcomes

- Authentication & authorization flows
- State management in React (Context API)
- Relational database design
- CRUD operations end-to-end
- Workspace & multi-tenancy architecture
- File management systems
- Collaborative application design
- Git & GitHub workflow

---

## 🔮 Future Improvements

- [ ] Real-time cursor tracking
- [ ] Live multi-user editing
- [ ] In-app chat system
- [ ] Code execution engine
- [ ] Version history
- [ ] Dark mode
- [ ] AI code assistant
- [ ] Git integration

---

## 👨‍💻 Author

**Harsh Kumar**
GitHub: [@Harsh-9113](https://github.com/Harsh-9113)

---

⭐ If you found this project useful, consider starring the repository!
