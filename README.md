# ERP-CRM-Zentro
Zentro Next-Gen Unified Professional Business Management : A comprehensive, modular ERP &amp; CRM ecosystem designed to streamline enterprise operations, optimize customer lifecycles, and drive data-driven decision-making.
<div align="center">
  <br />
     <a href="https://github.com/CHIRAG-singh123/ERP-CRM-Zentro">
      <img width="1919" height="870" alt="Screenshot 2025-12-19 183138" src="https://github.com/user-attachments/assets/7e63127b-85dc-48b4-a29b-6789cbc623a8" />
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
**⚡ Installation & Setup**
Follow these steps to get the project running locally.

**Prerequisites**
Node.js (v18+)

MongoDB (Local or Atlas URL)

Git

**Step 1: Clone the Repository**
```bash
git clone [https://github.com/CHIRAG-singh123/ERP-CRM-Zentro.git](https://github.com/CHIRAG-singh123/ERP-CRM-Zentro.git)
cd ERP-CRM-Zentro
```
**Step 2: Clone the Repository**
```bash# Install frontend dependencies
npm install

# Create environment file
echo "VITE_API_URL=http://localhost:5000/api" >> .env

# Start the Frontend
npm run dev
```
**Step 3: Clone the Repository**
```bash
cd server

# Install backend dependencies
npm install

# Setup Environment Variables
echo "PORT=5000" >> .env
echo "MONGO_URI=your_mongodb_connection_string" >> .env
echo "JWT_SECRET=your_secret_key" >> .env

# Start the Server
npm run dev
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

<<<<<<< HEAD
Open a Pull Request
=======
Open a Pull Request
>>>>>>> 0a7788610c1bce4025266b7aea913dc1f2110daa
