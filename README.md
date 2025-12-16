<div align="center">
  <br />
    <a href="https://github.com/CHIRAG-singh123/ERP-CRM-Zentro">
      <img src="https://capsule-render.vercel.app/api?type=waving&color=0066ff&height=220&section=header&text=Zentro%20ERP%20%26%20CRM&fontSize=70&animation=fadeIn&fontAlignY=35&desc=Next-Gen%20Unified%20Business%20Architecture&descAlignY=55&descAlign=50" alt="Zentro Header" />
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
| **Database** | ![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat&logo=mongodb&logoColor=white) ![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?&style=flat&logo=redis&logoColor=white) |
| **DevOps** | ![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat&logo=docker&logoColor=white) ![AWS](https://img.shields.io/badge/AWS-%23FF9900.svg?style=flat&logo=amazon-aws&logoColor=white) |

---

## ✨ **Key Features**

<details>
<summary>⚡ <b>Core Features (Basic MVP)</b> - <i>Click to expand</i></summary>

| Feature | Description |
| :--- | :--- |
| **🔐 Authentication** | JWT-based Auth with Access/Refresh tokens & Secure Password Hashing. |
| **👥 RBAC** | Granular Role-Based Access Control (Admin, Sales, Manager). |
| **🏢 Company Management** | Full CRUD for client organizations and hierarchical structures. |
| **📇 Contact Management** | Advanced contact books linked to specific companies. |
| **📊 Lead Pipeline** | Kanban-style drag-and-drop lead tracking (New -> Qualified -> Won). |
| **💰 Deals & Opportunities** | Value estimation, probability tracking, and closing dates. |
| **📅 Task Manager** | Assign tasks, set due dates, and track completion status. |
| **🧾 Invoicing** | Generate PDF invoices from Quotes with one click. |
| **📦 Product Catalog** | Inventory management for services and physical goods. |

</details>

<details>
<summary>🔥 <b>Advanced Modules</b> - <i>Click to expand</i></summary>

| Feature | Description |
| :--- | :--- |
| **🤖 Workflow Automation** | "If-This-Then-That" rule engine for auto-assigning leads. |
| **💬 Real-time Chat** | Integrated team chat and deal-specific discussion threads (Socket.io). |
| **📈 Analytics Dashboard** | Visual data using Recharts for sales performance and KPIs. |
| **💳 Stripe Payments** | Accept payments directly on sent invoices via Webhooks. |
| **🔎 Elastic Search** | Fuzzy search across the entire database (Leads, Contacts, Notes). |
| **📅 Calendar Sync** | 2-way sync with Google/Outlook calendars. |

</details>

---

## 📂 **Directory Structure**

```bash
erp-crm-project/
├── client/                 # Frontend (React + Vite + TS)
│   ├── src/
│   │   ├── features/       # Redux Slices (Auth, Leads, etc.)
│   │   ├── components/     # Reusable UI (Charts, Tables)
│   │   └── pages/          # Dashboard views
│   └── tailwind.config.js
│
└── server/                 # Backend (Node + Express)
    ├── src/
    │   ├── controllers/    # Route Logic
    │   ├── models/         # Mongoose Schemas
    │   └── services/       # Business Logic
    └── package.json
