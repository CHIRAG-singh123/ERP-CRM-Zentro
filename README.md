# ERP-CRM-Zentro
Zentro Next-Gen Unified Professional Business Management : A comprehensive, modular ERP &amp; CRM ecosystem designed to streamline enterprise operations, optimize customer lifecycles, and drive data-driven decision-making.
<div align="center">
  <br />
     <a href="https://github.com/CHIRAG-singh123/ERP-CRM-Zentro">
      <img width="1919" height="867" alt="image" src="https://github.com/user-attachments/assets/c6354bc3-c72b-44cd-93b2-c23d747c9a01" />
    </a>
  <br />

  <p>
    <a href="https://github.com/CHIRAG-singh123/ERP-CRM-Zentro/graphs/contributors">
      <img src="https://img.shields.io/github/contributors/CHIRAG-singh123/ERP-CRM-Zentro?style=for-the-badge&color=blue" alt="Contributors" />
    </a>
    <a href="https://github.com/CHIRAG-singh123/ERP-CRM-Zentro/network/members">
      <img src="https://img.shields.io/github/forks/CHIRAG-singh123/ERP-CRM-Zentro?style=for-the-badge&color=orange" alt="Forks" />
    </a>
    <a href="https://github.com/CHIRAG-singh123/ERP-CRM-Zentro/stargazers">
      <img src="https://img.shields.io/github/stars/CHIRAG-singh123/ERP-CRM-Zentro?style=for-the-badge&color=yellow" alt="Stars" />
    </a>
    <a href="https://github.com/CHIRAG-singh123/ERP-CRM-Zentro/issues">
      <img src="https://img.shields.io/github/issues/CHIRAG-singh123/ERP-CRM-Zentro?style=for-the-badge&color=red" alt="Issues" />
    </a>
    <a href="https://github.com/CHIRAG-singh123/ERP-CRM-Zentro/blob/main/LICENSE">
      <img src="https://img.shields.io/github/license/CHIRAG-singh123/ERP-CRM-Zentro?style=for-the-badge&color=green" alt="License" />
    </a>
  </p>

  <a href="https://git.io/typing-svg">
    <img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&weight=600&size=25&pause=1000&color=3B82F6&center=true&vCenter=true&width=500&lines=Full-Stack+MERN+Architecture;Enterprise+Resource+Planning;Advanced+CRM+Pipelines;Real-time+Analytics+%26+Socket.io;Role-Based+Access+Control" alt="Typing SVG" />
  </a>
</div>

---

## 🚀 **Overview**

**Zentro** is a robust, modular, and scalable **ERP (Enterprise Resource Planning)** and **CRM (Customer Relationship Management)** solution designed for modern businesses. Built on the **MERN Stack (MongoDB, Express, React, Node.js)**, it bridges the gap between complex business workflows and user-friendly design.

Unlike rigid legacy systems, Zentro offers a decoupled architecture featuring **20 Core Business Features** and **10 Advanced Modules**, including real-time collaboration, automated workflows, and financial analytics.

---

## 🛠 **Tech Stack & Architecture**

| **Category** | **Technologies Used** |
| :--- | :--- |
| **Frontend** | ![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB) ![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white) ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white) ![Redux](https://img.shields.io/badge/Redux-593D88?style=flat&logo=redux&logoColor=white) |
| **Backend** | ![Node](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white) ![Express](https://img.shields.io/badge/Express.js-404D59?style=flat) ![Socket.io](https://img.shields.io/badge/Socket.io-black?style=flat&logo=socket.io&badgeColor=010101) |
| **Database** | ![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat&logo=mongodb&logoColor=white)

---

## ✨ **Key Features**

<details>
<summary>⚡ <b>Core Features (Basic MVP)</b> - <i>Click to expand</i></summary>

| Feature | Description |
| :--- | :--- |
| **🔐 Authentication** | JWT-based Auth with Access/Refresh tokens & Secure Password Hashing. |
| **👥 RBAC** | Granular Role-Based Access Control (Admin, Employee, Customer) admin can only create employees default password is "Employee@123". |
| **🏢 Company Management** | Full CRUD for client organizations and hierarchical structures. |
| **📇 Contact Management** | Advanced contact books linked to specific companies. |
| **📊 Lead Pipeline** | Kanban-style drag-and-drop lead tracking (New -> Qualified -> Won). |
| **💰 Deals & Opportunities** | Value estimation, probability tracking, and closing dates. |
| **📅 Task Manager** | Assign tasks, set due dates, and track completion status. |
| **📦 Product Catalog** | Inventory management for services and physical goods. |

</details>

<details>
<summary>🔥 <b>Advanced Modules</b> - <i>Click to expand</i></summary>

| Feature | Description |
| :--- | :--- |
| **🤖 Workflow Automation** | "If-This-Then-That" rule engine for auto-assigning leads. |
| **💬 Real-time Chat** | Integrated team chat and deal-specific discussion threads (Socket.io). |
| **📈 Analytics Dashboard** | Visual data using Recharts for sales performance and KPIs. |
| **💳 Chat Feature** | Admin & Employees can manage documents. |
| **🔎 Elastic Search** | Fuzzy search across the entire database (Leads, Contacts, Notes). |
| **📅 Calendar Sync** | 2-way sync with Google like calendar. |

</details>

---

## 📂 **Directory Structure**

```bash
ERP-CRM/
├── src/                 # Frontend Source (React + Vite + TS)
│   ├── features/        # Redux Slices (Auth, Leads, etc.)
│   ├── components/      # Reusable UI (Charts, Tables)
│   └── pages/           # Dashboard views
├── public/              # Static assets
├── server/              # Backend (Node + Express)
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   └── services/
│   ├── .env             # Backend variables
│   └── package.json     # Backend dependencies
├── .env                 # Frontend variables
├── index.html           # React Entry point
├── vite.config.ts       # Vite Configuration
└── package.json         # Frontend dependencies
```
---

## ⚡ **Installation & Setup**

Follow these comprehensive steps to get the project running locally.

### **Prerequisites**

Before you begin, ensure you have the following installed on your system:

- **Node.js** (v18 or higher) - [Download Node.js](https://nodejs.org/)
- **MongoDB** (Local installation or MongoDB Atlas account) - [Download MongoDB](https://www.mongodb.com/try/download/community) or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- **Git** - [Download Git](https://git-scm.com/downloads)
- **npm** or **yarn** (comes with Node.js)

**Optional but Recommended:**
- **MongoDB Compass** - GUI tool for MongoDB (optional, for easier database management)
- **Postman** or **Insomnia** - For API testing (optional)

---

### **Step 1: Clone the Repository**

```bash
git clone https://github.com/CHIRAG-singh123/ERP-CRM-Zentro.git
cd ERP-CRM-Zentro
```

---

### **Step 2: Backend Setup**

#### **2.1 Install Backend Dependencies**

```bash
cd server
npm install
```

#### **2.2 Configure Backend Environment Variables**

Create a `.env` file in the `server/` directory. You can copy from the example file:

```bash
# On Windows (PowerShell)
Copy-Item env.example .env

# On Linux/Mac
cp env.example .env
```

**Edit `server/.env` with your configuration:**

```env
# Environment
NODE_ENV=development
PORT=5000

# Database Configuration
# For Local MongoDB:
MONGODB_URI=mongodb://localhost:27017/CRM_DB
# For MongoDB Atlas (replace with your connection string):
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/CRM_DB?retryWrites=true&w=majority

# JWT Configuration (Generate strong random strings)
JWT_SECRET=your_512bit_jwt_secret_here_change_in_production
JWT_REFRESH_SECRET=your_512bit_refresh_secret_here_change_in_production
JWT_ACCESS_EXPIRES_IN=55m
JWT_REFRESH_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# Email Configuration (Optional - for password reset functionality)
# Options: 'development' (console logging), 'gmail', 'sendgrid', 'smtp'
EMAIL_PROVIDER=development
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password
FROM_EMAIL=your_email@gmail.com
FROM_NAME=ERP-CRM-Zentro

# Frontend URL (for password reset links)
FRONTEND_URL=http://localhost:5173

# App Information
APP_NAME=ERP-CRM-Zentro

# Google OAuth Configuration (Optional - for Google Sign-In)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Session Secret (for OAuth sessions)
SESSION_SECRET=your_strong_session_secret_here_change_in_production
```

**🔐 Security Note:** Generate strong secrets for JWT and Session. You can use:
```bash
# Generate random secrets (Node.js)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### **2.3 Start MongoDB**

**Option A: Local MongoDB**
```bash
# Windows (if installed as service, it should start automatically)
# Or start manually:
mongod

# Linux/Mac
sudo systemctl start mongod
# Or
mongod --dbpath /path/to/your/data/directory
```

**Option B: MongoDB Atlas (Cloud)**
- Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Get your connection string from Atlas dashboard
- Update `MONGODB_URI` in `server/.env`

#### **2.4 Seed Admin User (Optional but Recommended)**

Create the default admin user to access the system:

```bash
cd server
npm run seed:admin
```

**Default Admin Credentials:**
- **Email:** `admin_erp-crm@gmail.com`
- **Password:** `ABCdef@1234`

**⚠️ Important:** Change the admin password after first login in production!

#### **2.5 Seed Dummy Data (Optional - for Testing)**

To populate the database with sample data for testing:

```bash
cd server
npm run seed:dummy
```

#### **2.6 Start Backend Server**

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The backend server will start on `http://localhost:5000`

**✅ Verify Backend:** Open `http://localhost:5000/api` in your browser (you should see API response or error message)

---

### **Step 3: Frontend Setup**

Open a **new terminal window** (keep backend running) and navigate to the project root:

#### **3.1 Install Frontend Dependencies**

```bash
# From project root (not server directory)
npm install
```

#### **3.2 Configure Frontend Environment Variables**

Create a `.env` file in the project root. You can copy from the example:

```bash
# On Windows (PowerShell)
Copy-Item env.example .env

# On Linux/Mac
cp env.example .env
```

**Edit `.env` with your configuration:**

```env
# Environment
NODE_ENV=development

# Backend API URL
VITE_API_URL=http://localhost:5000/api

# Email Configuration (if needed on frontend)
EMAIL_PROVIDER=gmail
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password
FROM_EMAIL=your_email@gmail.com

# AI/LLM API Configurations (Optional - for Chatbot feature)
# OpenRouter API
VITE_OPENROUTER_API_KEY=your_openrouter_api_key
VITE_OPENROUTER_API_URL=https://openrouter.ai/api/v1/chat/completions

# Google AI Studios (Gemini)
VITE_GOOGLE_AI_STUDIOS_API_KEY=your_google_ai_studios_api_key
VITE_GOOGLE_AI_STUDIOS_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent

# OpenAI API
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_OPENAI_API_URL=https://api.openai.com/v1/chat/completions

# Groq API
VITE_GROQ_API_KEY=your_groq_api_key
VITE_GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions

# DeepSeek API
VITE_DEEPSEEK_API_KEY=your_deepseek_api_key
VITE_DEEPSEEK_API_URL=https://api.deepseek.ai/v1/chat/completions
```

#### **3.3 Start Frontend Development Server**

```bash
# Start only frontend
npm run dev

# Or start both frontend and backend together
npm run dev:all
```

The frontend will start on `http://localhost:5173`

**✅ Verify Frontend:** Open `http://localhost:5173` in your browser

---

### **Step 4: Access the Application**

1. **Open your browser** and navigate to: `http://localhost:5173`
2. **Login** with the admin credentials:
   - Email: `admin_erp-crm@gmail.com`
   - Password: `ABCdef@1234`
3. **Start exploring** the ERP-CRM system!

---

## 🔧 **Additional Configuration**

### **Google OAuth Setup (Optional)**

To enable Google Sign-In functionality:

1. **Create Google OAuth Credentials:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google+ API
   - Create OAuth 2.0 Client ID
   - Add authorized redirect URI: `http://localhost:5000/api/auth/google/callback`

2. **Update Environment Variables:**
   - Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `server/.env`
   - See `GOOGLE_OAUTH_SETUP.md` for detailed instructions

### **Email Configuration (Optional)**

To enable email functionality (password reset, notifications):

1. **Choose Email Provider:**
   - **Gmail:** Requires App Password (see `server/EMAIL_CONFIG.md`)
   - **SendGrid:** Free tier available (100 emails/day)
   - **Generic SMTP:** Works with any email provider

2. **Update Environment Variables:**
   - Configure email settings in `server/.env`
   - See `server/EMAIL_CONFIG.md` for detailed instructions

---

## 🚀 **Available Scripts**

### **Frontend Scripts** (from project root)

```bash
npm run dev              # Start frontend dev server
npm run dev:client       # Start frontend only
npm run dev:server       # Start backend only
npm run dev:all          # Start both frontend and backend concurrently
npm run build            # Build for production
npm run preview          # Preview production build
npm run typecheck        # TypeScript type checking
npm run lint             # ESLint code linting
```

### **Backend Scripts** (from server directory)

```bash
npm run dev              # Start backend with auto-reload
npm start                # Start backend in production mode
npm run seed:admin       # Seed default admin user
npm run seed:dummy       # Seed dummy data for testing
```

---

## 🐛 **Troubleshooting**

### **Common Issues**

#### **1. MongoDB Connection Error**
```
Error: MongoServerSelectionError
```
**Solution:**
- Ensure MongoDB is running: `mongod` or check MongoDB service
- Verify `MONGODB_URI` in `server/.env` is correct
- For Atlas: Check network access and connection string

#### **2. Port Already in Use**
```
Error: Port 5000 (or 5173) is already in use
```
**Solution:**
- Change port in `.env` files
- Or kill the process using the port:
  ```bash
  # Windows
  netstat -ano | findstr :5000
  taskkill /PID <PID> /F
  
  # Linux/Mac
  lsof -ti:5000 | xargs kill -9
  ```

#### **3. Module Not Found Errors**
```
Error: Cannot find module 'xxx'
```
**Solution:**
- Delete `node_modules` and reinstall:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```
- Do this for both root and `server/` directories

#### **4. CORS Errors**
```
Error: Access to fetch blocked by CORS policy
```
**Solution:**
- Ensure `CORS_ORIGIN` in `server/.env` matches frontend URL
- Check that backend is running on correct port
- Verify frontend `VITE_API_URL` matches backend URL

#### **5. JWT Authentication Errors**
```
Error: Invalid token or Unauthorized
```
**Solution:**
- Verify `JWT_SECRET` and `JWT_REFRESH_SECRET` are set in `server/.env`
- Clear browser cookies/localStorage and login again
- Check token expiration settings

#### **6. Environment Variables Not Loading**
**Solution:**
- Ensure `.env` files are in correct locations:
  - Frontend: Root directory `.env`
  - Backend: `server/.env`
- Restart development servers after changing `.env`
- Check for typos in variable names (case-sensitive)

---

## 📚 **Additional Documentation**

- **Google OAuth Setup:** See `GOOGLE_OAUTH_SETUP.md`
- **Email Configuration:** See `server/EMAIL_CONFIG.md`
- **Google Cloud Console Setup:** See `GOOGLE_CLOUD_CONSOLE_SETUP.md`

---

## 🎯 **Quick Start Summary**

For experienced developers, here's the TL;DR:

```bash
# 1. Clone and install
git clone https://github.com/CHIRAG-singh123/ERP-CRM-Zentro.git
cd ERP-CRM-Zentro
npm install
cd server && npm install && cd ..

# 2. Setup environment
cp env.example .env
cp server/env.example server/.env
# Edit both .env files with your configuration

# 3. Start MongoDB (local or use Atlas)

# 4. Seed admin user
cd server && npm run seed:admin && cd ..

# 5. Start servers
npm run dev:all
# Or separately:
# Terminal 1: cd server && npm run dev
# Terminal 2: npm run dev

# 6. Access: http://localhost:5173
# Login: admin_erp-crm@gmail.com / ABCdef@1234
```
**🗺 Roadmap**
[x] Phase 1: Core Foundation (Auth, Companies, Contacts CRUD & **many more.**)

[ ] Phase 2: Operational Tools (PDF generation & Calendar)

[ ] Phase 3: Advanced Polish (Socket.io Chat, Stripe Integration)

**🤝 Contributing**
Contributions are welcome! Please fork the repo and create a pull request.

Fork the Project

Create your Feature Branch (git checkout -b feature/AmazingFeature)

Commit your Changes (git commit -m 'Add some AmazingFeature')

Push to the Branch (git push origin feature/AmazingFeature)

Open a Pull Request
