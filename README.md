# 🛫 Natural Language to SQL

> Translate plain English into optimized, production-ready MySQL queries instantly using advanced AI models.

![Tech Stack](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![LangChain](https://img.shields.io/badge/LangChain-JS-1C3C3C?logo=langchain)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql)
![Ollama](https://img.shields.io/badge/Ollama-Local_AI-black)
![Groq](https://img.shields.io/badge/Groq-Cloud_AI-F55036)

---

## 📖 Overview

**Natural Language (Agentic) to SQL** is a full-stack AI-powered web application that allows users to query a MySQL database using plain English. It supports two AI backends:

- **Online AI (Groq Cloud)** — Fast, precise, uses `llama-3.1-8b-instant` via the Groq API.
- **Local AI (Ollama)** — Private, offline, uses `llama3.2:latest` running on your own machine.

The app features role-based access control (User / Admin), query history, and real-time SQL execution against a live MySQL database.

---

## 🏗️ Architecture

```
sql_project/
├── frontend/          # React + Vite (port 5173)
│   └── src/
│       └── app/
│           ├── components/
│           │   ├── MainApp.tsx       # Root app shell, state management
│           │   ├── ConverterPanel.tsx # Main query UI + AI provider selector
│           │   ├── Sidebar.tsx       # Query history panel
│           │   ├── Login.tsx         # Login form
│           │   └── Signup.tsx        # Signup form
│           └── routes.tsx            # React Router v7 routes
│
└── backend/           # Next.js API server (port 3000)
    └── src/app/
        ├── api/
        │   ├── query/route.ts        # Main AI query endpoint (POST /api/query)
        │   └── check-local-ai/route.ts # Ollama health check (GET /api/check-local-ai)
        ├── database.ts               # MySQL connection, schema fetcher, query executor
        └── actions.ts                # Server actions
```

---

## ✨ Features

| Feature | Description |
|---|---|
| 🧠 Dual AI Providers | Switch between Groq (cloud) and Ollama (local) per query |
| 🔐 Role-Based Access | Users see data only; Admins can see personal details |
| 📜 Query History | All queries saved locally in `localStorage` with timestamps |
| 🛡️ SQL Safety | Read-only queries, LIMIT 100 enforced, no destructive queries |
| 📊 Live Results Table | Query results rendered as a data table in real-time |
| 🔁 Auto-Retry | Local AI auto-corrects failed SQL with error feedback |
| 🌐 CORS Ready | Backend CORS headers configured for cross-origin frontend |

---

## 🛠️ Tech Stack

### Frontend
| Library | Purpose |
|---|---|
| React 19 | UI framework |
| Vite | Dev server & bundler |
| React Router v7 | Client-side routing |
| Framer Motion | Animations |
| Lucide React | Icons |
| Sonner | Toast notifications |
| TailwindCSS | Styling |

### Backend
| Library | Purpose |
|---|---|
| Next.js 15 | API route server |
| LangChain.js | LLM orchestration |
| LangGraph | ReAct agent (Online AI) |
| `@langchain/groq` | Groq cloud LLM |
| `@langchain/ollama` | Local Ollama LLM |
| mysql2 | MySQL database driver |
| Zod | Tool schema validation |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+
- **npm** v9+
- **MySQL** 8.x running locally (or remote)
- **Ollama** (optional, for Local AI) — [Install Ollama](https://ollama.ai)

### 1. Clone the repository

```bash
git clone https://github.com/abhishek18-blog/Natural-language-to-sql.git
cd Natural-language-to-sql
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file inside the `backend/` directory:

```env
# backend/.env

# Groq API Key — get yours at https://console.groq.com
GROQ_API_KEY="gsk_your_key_here"

# MySQL connection string
DATABASE_URL="mysql://root:password@localhost:3306/airportdb"
```

> ⚠️ **NEVER commit your `.env` file.** It is already in `.gitignore`.

### 4. Set up the database

Import the `airportdb` dataset into MySQL:

```bash
mysql -u root -p < airportdb.sql
```

### 5. (Optional) Set up Local AI

Install Ollama and pull the required model:

```bash
# Install Ollama: https://ollama.ai
ollama pull llama3.2:latest
```

### 6. Run the app

```bash
# Terminal 1 — Start the backend API server
npm run dev -w backend
# Runs on http://localhost:3000

# Terminal 2 — Start the frontend dev server
npm run dev -w frontend
# Runs on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## 🔌 API Reference

### `POST /api/query`

Converts a natural language question to SQL and returns the result.

**Request Body:**
```json
{
  "question": "how many passengers are on flight AF1078?",
  "role": "user",
  "provider": "online"
}
```

| Field | Type | Values | Description |
|---|---|---|---|
| `question` | `string` | any | The natural language question |
| `role` | `string` | `"user"` / `"admin"` | Controls data access permissions |
| `provider` | `string` | `"online"` / `"local"` | AI provider to use |

**Response:**
```json
{
  "sql_query": "SELECT COUNT(*) FROM booking WHERE flight_id IN (...)",
  "results": [{ "COUNT(*)": 67 }],
  "answer": "There are 67 bookings for flight AF1078."
}
```

---

### `GET /api/check-local-ai`

Checks if Ollama is running and the `llama3.2` model is available.

**Response (success):**
```json
{
  "success": true,
  "message": "Local AI is available and running."
}
```

**Response (failure):**
```json
{
  "success": false,
  "message": "Could not connect to Ollama at http://localhost:11434"
}
```

---

## 🧠 How the AI Works

### Online AI (Groq) — ReAct Agent Pattern

Uses a **LangGraph ReAct agent** with a `get_from_db` tool:

```
User Question
     │
     ▼
System Prompt + Schema injected
     │
     ▼
LLM thinks → calls get_from_db tool (generates SQL)
     │
     ▼
Backend executes SQL on MySQL
     │
     ▼
LLM receives results → writes natural language answer
```

### Local AI (Ollama) — Direct 2-Call Pattern

To avoid the slow multi-turn agent loop, Local AI uses a lightweight 2-call approach:

```
User Question
     │
     ▼
Call 1: Ask LLM to write SQL only (1 call)
     │
     ▼
Backend sanitizes & executes SQL on MySQL (no LLM involved)
     │
     ▼
Call 2: Ask LLM to summarize results in plain English (1 call)
```

This reduces response time from **3–5 minutes → ~30–60 seconds** on CPU hardware.

**Auto-Retry:** If the SQL fails, the error message is sent back to the model for self-correction before giving up.

---

## 🔐 Role-Based Access Control

| Feature | User | Admin |
|---|:---:|:---:|
| Query database | ✅ | ✅ |
| View aggregate data (counts, stats) | ✅ | ✅ |
| View personal data (names, emails) | ❌ | ✅ |
| See generated SQL query | ❌ | ✅ |
| View other users' history | ❌ | ✅ |

Roles are set at login and stored in `localStorage`. The role is passed to the AI in the system prompt, which enforces the access rules.

---

## 📐 Database Schema Format

The backend sends a compact, relationship-aware schema to the AI:

```
Table: flight (flight_id(PK), flightno, departure(FK), arrival(FK)) | FK: departure -> airport.airport_id
Table: passenger (passenger_id(PK), firstname, lastname, email)
Table: booking (booking_id(PK), flight_id(FK), passenger_id(FK)) | FK: flight_id -> flight.flight_id, passenger_id -> passenger.passenger_id
```

This includes:
- **(PK)** — Primary key columns
- **(FK)** — Foreign key columns
- **FK relationships** — Exact join paths between tables

---

## ⚠️ Known Limitations

- **Local AI speed** — `llama3.2` on CPU is slow (30–90s per query). A GPU significantly improves this.
- **Local AI accuracy** — Small models occasionally hallucinate column names. The auto-retry mitigates this.
- **No streaming** — Responses are returned all at once, not streamed token-by-token.
- **Read-only** — The app is designed for SELECT queries only. No INSERT/UPDATE/DELETE.

---

## 📁 Project Scripts

| Command | Description |
|---|---|
| `npm run dev -w backend` | Start backend API server (Next.js, port 3000) |
| `npm run dev -w frontend` | Start frontend dev server (Vite, port 5173) |
| `npm run build -w backend` | Build backend for production |
| `npm run build -w frontend` | Build frontend for production |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
