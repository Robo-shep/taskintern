# Codebase Explanation — TaskManager (MERN)

## Architecture Overview

The app has two independent processes talking over HTTP:

```
Browser (React, port 5173)
    ↕  /api/* → proxy → localhost:5000
Express Server (port 5000)
    ↕
MongoDB Atlas (remote)
```

Vite's dev proxy (`vite.config.js`) forwards any request starting with `/api` from the browser to the Express server. This means the frontend never hardcodes `localhost:5000` — it just calls `/api/...` and Vite handles the forwarding in dev. In production you'd configure a real reverse proxy (Nginx/etc.) the same way.

---

## Backend

### `server/server.js` — Entry Point

```js
app.use(cors({ origin: process.env.CLIENT_URL }))
app.use(express.json())
app.use('/api/auth', authRoutes)
app.use('/api/tasks', taskRoutes)
app.use((err, req, res, next) => { ... })  // error handler
mongoose.connect(MONGO_URI).then(() => app.listen(5000))
```

Three things happen in order:

1. **Middleware chain is registered** — `cors` allows requests from the React app, `express.json()` parses request bodies from JSON strings into `req.body` objects.
2. **Routes are mounted** — any request to `/api/auth/*` goes to `authRoutes`, `/api/tasks/*` goes to `taskRoutes`.
3. **Central error handler** — Express recognizes a 4-argument function `(err, req, res, next)` as an error handler. Any controller that calls `next(err)` lands here instead of crashing the process.

The server only starts listening after MongoDB connects. If the DB fails, the process exits — no point serving traffic with no database.

---

### `server/models/User.js` and `Task.js` — Mongoose Schemas

```js
const userSchema = new mongoose.Schema({
  name, email (unique, lowercase), password
}, { timestamps: true })
```

Mongoose schemas define the shape of documents stored in MongoDB. `timestamps: true` automatically adds `createdAt` and `updatedAt` fields to every document.

`email: { unique: true, lowercase: true }` — Mongoose lowercases the email before saving, and MongoDB enforces uniqueness via an index. This prevents `User@example.com` and `user@example.com` from being two separate accounts.

The Task schema has `userId: ObjectId ref 'User'` — this is a foreign key in Mongo terms. It stores the `_id` of the User who owns the task. The `ref: 'User'` part enables Mongoose's `.populate()` (not used here, but it's the pattern for joins).

```js
status: { enum: ['pending', 'completed'], default: 'pending' }
```

Mongoose validates the value against the enum at the DB layer, not just the API layer. Double protection.

---

### `server/middleware/auth.js` — JWT Verification

```js
export const protect = (req, res, next) => {
  const header = req.headers.authorization   // "Bearer eyJ..."
  const token = header.split(' ')[1]
  req.user = jwt.verify(token, JWT_SECRET)   // throws if invalid/expired
  next()
}
```

This is a standard Express middleware — it receives `(req, res, next)` and either calls `next()` to continue the chain, or short-circuits with a response.

`jwt.verify()` does two things simultaneously: it checks the token's signature (was it signed with our secret?) and checks the `exp` claim (is it expired?). If either fails it throws, which the `try/catch` turns into a 401. If it passes, the decoded payload `{ id: "..." }` gets attached to `req.user` so downstream controllers know who's making the request without another DB lookup.

---

### `server/controllers/authController.js` — Register & Login

**Register:**
```js
const hashed = await bcrypt.hash(password, 12)
const user = await User.create({ name, email, password: hashed })
res.status(201).json({ token: signToken(user._id), user: { id, name, email } })
```

`bcrypt.hash(password, 12)` — the `12` is the cost factor (salt rounds). It controls how much CPU work is done. Higher = slower = harder to brute-force. 12 is a good production default (~250ms per hash). The raw password is **never stored**.

`signToken` creates a JWT:
```js
jwt.sign({ id }, JWT_SECRET, { expiresIn: '7d' })
```

The payload `{ id }` is what gets decoded on every subsequent request. We only store the user ID — not the email/name — to keep tokens small.

**Login:**
```js
const user = await User.findOne({ email })
if (!user || !(await bcrypt.compare(password, user.password))) {
  return res.status(401).json({ message: 'Invalid email or password' })
}
```

`bcrypt.compare` hashes the incoming password with the same salt embedded in the stored hash and compares. It's intentionally slow and timing-safe. The error message is deliberately vague ("Invalid email or password") — telling someone "email not found" vs "wrong password" helps attackers enumerate accounts.

---

### `server/controllers/taskController.js` — CRUD + Search + Pagination

**`getTasks`:**
```js
const filter = { userId: req.user.id }
if (status && status !== 'all') filter.status = status
if (search?.trim()) filter.title = { $regex: search, $options: 'i' }

const total = await Task.countDocuments(filter)
const tasks = await Task.find(filter)
  .sort({ createdAt: -1 })
  .skip((page - 1) * limit)
  .limit(limit)
```

This builds a MongoDB query object dynamically. `$regex` with `$options: 'i'` is a case-insensitive substring search on the title field. Pagination works by skipping the first `(page-1) * limit` results and taking the next `limit`. Two queries run: one for the total count (for pagination math) and one for the actual page data.

**`updateTask` and `deleteTask`** both use `{ _id: id, userId: req.user.id }` as the filter:
```js
Task.findOneAndDelete({ _id: req.params.id, userId: req.user.id })
```

The `userId` condition is critical — it means a user can only delete/edit their own tasks. Without it, knowing any task's MongoDB `_id` would let any authenticated user modify anyone else's data.

---

### Routes (`routes/auth.js`, `routes/tasks.js`)

```js
// tasks.js
router.use(protect)   // ALL routes below this line require a valid JWT
router.get('/', getTasks)
router.post('/', createTask)
router.put('/:id', updateTask)
router.delete('/:id', deleteTask)
```

`router.use(protect)` applies the auth middleware to every route registered after it. `/:id` is a URL parameter — `req.params.id` in the controller.

---

## Frontend

### `client/src/main.jsx` — App Bootstrap

```jsx
ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
)
```

Three wrapper layers:
- `BrowserRouter` — gives all children access to React Router's navigation system
- `AuthProvider` — makes auth state (token, user, login/logout functions) available to any component in the tree via Context
- `App` — defines the route structure

---

### `client/src/context/AuthContext.jsx` — Global Auth State

```jsx
const [token, setToken] = useState(() => localStorage.getItem('token'))
```

The `useState` initializer function (lazy init) reads from localStorage only once on mount — not on every render. This means if you refresh the page, you're still logged in because the token persists in localStorage.

```jsx
const login = (token, user) => {
  localStorage.setItem('token', token)
  setToken(token)
  // ...
}
```

`login` does two things in sync: persists to localStorage (survives page refresh) and updates React state (triggers re-renders). `logout` does the reverse.

Any component that calls `useAuth()` gets `{ token, user, login, logout }`. If `token` changes (login/logout), every component using `useAuth()` re-renders automatically.

---

### `client/src/api/axios.js` — HTTP Client

```js
const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  res => res,
  err => Promise.reject(err.response?.data || { message: 'Network error' })
)
```

**Request interceptor** — automatically attaches the JWT to every outgoing request. You never have to manually pass the token when calling `api.get(...)` or `api.post(...)` anywhere in the app.

**Response interceptor** — normalizes errors. Axios wraps HTTP errors in an `AxiosError` object; `err.response?.data` extracts the actual JSON body your server sent (e.g., `{ message: 'Invalid credentials' }`). The `?.` handles the case where there's no response at all (network offline). The result is that `catch (err)` in components always gets a plain object with a `message` string.

---

### `client/src/App.jsx` — Route Guard

```jsx
const PrivateRoute = ({ children }) => {
  const { token } = useAuth()
  return token ? children : <Navigate to='/login' replace />
}
```

`PrivateRoute` wraps the Dashboard. If there's no token, React Router redirects to `/login` before the Dashboard even mounts. `replace` means the redirect doesn't add to browser history — hitting the back button won't loop you back to a protected page.

---

### `client/src/pages/Login.jsx` and `Register.jsx`

Both pages follow the same pattern:

1. **Local form state** — `useState({ email: '', password: '' })`
2. **Client-side validation** — runs before the API call, sets field-level error messages
3. **API call** — `api.post('/auth/login', form)`
4. **On success** — calls `login(token, user)` from context (updates global state + localStorage), then `navigate('/')` to redirect to dashboard
5. **On failure** — the response interceptor already extracted `err.message`, shown as an alert

The `set(field)` factory function:
```js
const set = (field) => (e) => {
  setForm(f => ({ ...f, [field]: e.target.value }))
  setErrors(errs => ({ ...errs, [field]: undefined }))  // clears error on type
}
```
Each field gets its own change handler that updates only that field in the form object (spread to preserve others) and clears its error as soon as the user starts typing.

---

### `client/src/pages/Dashboard.jsx` — Main Page

**State:**
```js
const [tasks, setTasks] = useState([])
const [total, setTotal] = useState(0)     // total matching docs (for pagination)
const [pages, setPages] = useState(1)     // total page count
const [page, setPage] = useState(1)       // current page
const [search, setSearch] = useState('')
const [status, setStatus] = useState('all')
const [debouncedSearch, setDebouncedSearch] = useState('')
```

**Debouncing:**
```js
useEffect(() => {
  clearTimeout(searchTimer.current)
  searchTimer.current = setTimeout(() => {
    setDebouncedSearch(search)
    setPage(1)
  }, 350)
  return () => clearTimeout(searchTimer.current)
}, [search])
```

Every keystroke in the search box updates `search` immediately (so the input feels responsive). But the actual API call only fires after 350ms of silence. `useRef` holds the timer ID across renders without causing re-renders itself. The `return () => clearTimeout(...)` is the cleanup — if the component unmounts mid-timer, the pending timeout is cancelled.

**Data fetching:**
```js
const fetchTasks = useCallback(async () => { ... }, [page, debouncedSearch, status])
useEffect(() => { fetchTasks() }, [fetchTasks])
```

`useCallback` memoizes `fetchTasks` — it only creates a new function reference when its dependencies change. This matters because `fetchTasks` is listed as a dependency of the `useEffect`. Without `useCallback`, a new function would be created every render, causing infinite re-fetches. The effect runs whenever the memoized function changes, which only happens when page/search/status change.

**Toggle, Edit, Delete** all call the relevant API endpoint and then call `fetchTasks()` to refresh — simple and reliable, avoids manual state surgery.

**Pagination:**
```jsx
{Array.from({ length: pages }, (_, i) => i + 1).map(p => (
  <button className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>
    {p}
  </button>
))}
```

`Array.from({ length: pages }, (_, i) => i + 1)` creates `[1, 2, 3, ...]` — a common pattern for generating number sequences in React without a utility library.

---

### `client/src/components/TaskModal.jsx`

Handles both Add and Edit in one component:

```js
const isEdit = Boolean(task)  // task prop is null for Add, task object for Edit
```

```js
useEffect(() => {
  if (task) setForm({ title: task.title, description: task.description, status: task.status })
}, [task])
```

When `task` changes (Edit mode), the form pre-populates with existing values. For Add mode, the initial `useState` default (`{ title: '', description: '', status: 'pending' }`) is used.

The `onSave` callback is called with the form data. The modal doesn't know whether it's hitting POST or PUT — that logic lives in the Dashboard. The modal just calls `onSave(form)`, awaits it, and closes on success (or shows an error on failure).

Clicking outside the modal closes it:
```jsx
<div className='modal-overlay' onClick={e => e.target === e.currentTarget && onClose()}>
```
`e.target === e.currentTarget` is true only when you click the dark overlay itself, not when the click bubbles up from inside the modal box.

---

## End-to-End Flow: Creating a Task

1. User clicks **"+ Add Task"** → `openAdd()` sets `editingTask = null`, `modalOpen = true`
2. `TaskModal` renders with `task = null`, form is empty
3. User fills in title, clicks **"Add Task"** → `handleSubmit` fires
4. Validates form → no errors → calls `onSave({ title, description, status })`
5. In Dashboard's `handleSave`: `editingTask` is null → calls `api.post('/tasks', form)`
6. Axios interceptor injects `Authorization: Bearer <token>` header
7. Vite proxy forwards `POST /api/tasks` → `http://localhost:5000/api/tasks`
8. Express hits `router.use(protect)` → JWT verified → `req.user = { id: '...' }`
9. `createTask` controller: validates, creates `Task` with `userId: req.user.id`
10. Returns `201` with the new task document
11. `onSave` resolves → `onClose()` closes modal → `fetchTasks()` refreshes the grid
