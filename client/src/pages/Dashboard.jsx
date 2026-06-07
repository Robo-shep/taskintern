import { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from '../components/Navbar.jsx';
import TaskCard from '../components/TaskCard.jsx';
import TaskModal from '../components/TaskModal.jsx';
import api from '../api/axios.js';

const LIMIT = 6;

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const searchTimer = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  useEffect(() => { setPage(1); }, [status]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: LIMIT, status };
      if (debouncedSearch) params.search = debouncedSearch;
      const { data } = await api.get('/tasks', { params });
      setTasks(data.tasks);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleSave = async (form) => {
    if (editingTask) {
      await api.put(`/tasks/${editingTask._id}`, form);
    } else {
      await api.post('/tasks', form);
    }
    fetchTasks();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    await api.delete(`/tasks/${id}`);
    fetchTasks();
  };

  const handleToggle = async (task) => {
    const newStatus = task.status === 'pending' ? 'completed' : 'pending';
    await api.put(`/tasks/${task._id}`, { status: newStatus });
    fetchTasks();
  };

  const openAdd = () => { setEditingTask(null); setModalOpen(true); };
  const openEdit = (task) => { setEditingTask(task); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditingTask(null); };

  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <>
      <Navbar />
      <main className='dashboard'>
        <div className='dashboard-header'>
          <h2>My Tasks</h2>
          <button className='btn btn-primary' onClick={openAdd}>+ Add Task</button>
        </div>

        <div className='stats-bar'>
          <div className='stat-chip'>Total: <strong>{total}</strong></div>
          <div className='stat-chip'>
            Completed this page: <strong>{completedCount}</strong>
          </div>
        </div>

        <div className='controls'>
          <input
            className='search-input'
            type='text'
            placeholder='Search tasks...'
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className='filter-select'
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value='all'>All</option>
            <option value='pending'>Pending</option>
            <option value='completed'>Completed</option>
          </select>
        </div>

        {error && <div className='alert alert-error'>{error}</div>}

        {loading ? (
          <div className='loading-screen'><span className='spinner' style={{ borderTopColor: 'var(--primary)', borderColor: 'rgba(79,70,229,0.3)', width: 32, height: 32, borderWidth: 3 }} /></div>
        ) : (
          <div className='task-grid'>
            {tasks.length === 0 ? (
              <div className='empty-state'>
                <strong>{debouncedSearch || status !== 'all' ? 'No tasks match your filters.' : 'No tasks yet.'}</strong>
                <p>{!debouncedSearch && status === 'all' && 'Click "Add Task" to get started.'}</p>
              </div>
            ) : (
              tasks.map(task => (
                <TaskCard
                  key={task._id}
                  task={task}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                />
              ))
            )}
          </div>
        )}

        {pages > 1 && (
          <div className='pagination'>
            <span className='pagination-info'>Page {page} of {pages}</span>
            <button className='page-btn' onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
            {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                className={`page-btn ${p === page ? 'active' : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button className='page-btn' onClick={() => setPage(p => p + 1)} disabled={page === pages}>›</button>
          </div>
        )}
      </main>

      {modalOpen && (
        <TaskModal task={editingTask} onClose={closeModal} onSave={handleSave} />
      )}
    </>
  );
}
