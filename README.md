# TaskManager — MERN Stack Internship Assignment

A full-stack Task Management app built with MongoDB, Express.js, React.js, and Node.js.

## Features

- User registration and login with JWT authentication
- Create, edit, delete, and view tasks
- Toggle tasks between pending / completed
- Search tasks by title (debounced)
- Filter by status (all / pending / completed)
- Server-side pagination (6 tasks per page)
- Responsive UI — works on mobile, tablet, and desktop

---

## Project Structure

```
taskintern/
  server/
    controllers/    authController.js, taskController.js
    middleware/     auth.js (JWT verify)
    models/         User.js, Task.js
    routes/         auth.js, tasks.js
    server.js
    package.json
    .env.example
  client/
    src/
      api/          axios.js (with auth interceptor)
      context/      AuthContext.jsx
      components/   Navbar, TaskCard, TaskModal
      pages/        Login, Register, Dashboard
    vite.config.js
    package.json
```

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- A MongoDB connection URI (MongoDB Atlas free tier works)

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd taskintern
```

### 2. Configure the backend

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:

```
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/taskintern
JWT_SECRET=some_long_random_secret_string
CLIENT_URL=http://localhost:5173
```

### 3. Install dependencies

```bash
# In server/
npm install

# In client/
cd ../client
npm install
```

### 4. Run the app

Open two terminals:

```bash
# Terminal 1 — backend
cd server
npm run dev

# Terminal 2 — frontend
cd client
npm run dev
```

Visit `http://localhost:5173`

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login, returns JWT |
| GET | `/api/tasks` | Yes | Get tasks (search, filter, pagination) |
| POST | `/api/tasks` | Yes | Create task |
| PUT | `/api/tasks/:id` | Yes | Update task |
| DELETE | `/api/tasks/:id` | Yes | Delete task |

Query params for `GET /api/tasks`: `search`, `status` (all/pending/completed), `page`, `limit`
