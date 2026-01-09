# DCA Manager (Debt Collection Agency Management System)

A comprehensive SaaS platform for Enterprise Debt Recovery, bridging the gap between large Enterprises (creditors) and Debt Collection Agencies (DCAs).

## 🚀 Overview

**Live Demo:** [https://dca-saas-prod.web.app](https://dca-saas-prod.web.app)

DCA Manager allows Enterprises to allocate debt cases to external agencies and track performance in real-time. It provides Agencies with a specialized execution portal to work cases, compliant with Standard Operating Procedures (SOPs).

**Key Features:**
*   **Enterprise Administration**: Bulk case allocation, Agency performance tracking, and Global Audit Trails.
*   **Agency Portal**: "Smart Worklist" for agents, case details, and activity logging.
*   **AI Prioritization Engine**: Automatically scores debts (0-100) based on recoverability (Amount, Age, History) and recommends actions ("Call Now", "Legal Action").
*   **Executive Dashboard**: Real-time visualization of KPIs, recovery trends, and status distributions.

## 🛠️ Technology Stack

*   **Frontend**: React (Vite)
*   **Styling**: TailwindCSS (Modern, glassmorphism design)
*   **Visualization**: Recharts (Interactive data charts)
*   **State Management**: React Context API (`CaseContext`, `AuthContext`)
*   **Routing**: React Router DOM (v6) with Protected Routes
*   **Icons**: Lucide React

## 📂 Project Structure

```
src/
├── components/     # Reusable UI components (Sidebar, Navbar, Cards)
├── context/        # Global state (Auth, Case Data)
├── lib/            # Utilities (Firebase, constants)
├── pages/          # Application views (Dashboard, CasePool, Worklist)
├── utils/          # Helper logic (AI Scoring, Seed Data)
└── App.jsx         # Main router entry point
```

## ⚡ Getting Started

### Prerequisites
*   Node.js (v18 or higher)
*   npm

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Sujitha1306/DCA_Manager.git
    cd DCA_Manager
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

### Running the Application

1.  **Start the development server**
    ```bash
    npm run dev
    ```
    *By default, this runs on http://localhost:5173 (or the next available port).*

2.  **Login Credentials (Seed Data)**

    *   **Enterprise Admin**
        *   User: `admin`
        *   Pass: `admin`
    *   **Agency Portal**
        *   User: `agency`
        *   Pass: `agency`

## 🧪 Functionality Guide

### 1. Enterprise Admin
*   **Dashboard**: View global recovery rates and agency comparisons. Export reports to CSV.
*   **Case Pool**: Filter "Unassigned" cases and bulk-allocate them to "Agency A" or "Agency B".

### 2. Agency Agent
*   **Worklist**: See assigned cases. Use the **"AI Sort"** button to prioritize high-value/high-probability cases.
*   **Case Detail**: View "Win Probability", log "Promises to Pay" (PTP), or Dispute cases.
*   **Restrictions**: Cannot close a case without engaging (logging minimum 3 notes).

## 📊 AI & Heuristics
The system uses a weighted scoring algorithm (`src/utils/aiLogic.js`) to calculate a **Recovery Score**:
*   **High Value (<$1k)**: +Bonus
*   **Recent Debt (<30 days)**: +Bonus
*   **Old Debt (>90 days)**: -Penalty
*   **History**: Previous PTPs boost the score significantly.

---
*Built for the Advanced Agentic Coding Project.*
