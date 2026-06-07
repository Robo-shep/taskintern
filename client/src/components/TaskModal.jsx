import { useState, useEffect } from 'react';

export default function TaskModal({ task, onClose, onSave }) {
  const isEdit = Boolean(task);
  const [form, setForm] = useState({ title: '', description: '', status: 'pending' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task) setForm({ title: task.title, description: task.description || '', status: task.status });
  }, [task]);

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setErrors({ api: err.message || 'Something went wrong' });
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setErrors(errs => ({ ...errs, [field]: undefined }));
  };

  return (
    <div className='modal-overlay' onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className='modal'>
        <h2>{isEdit ? 'Edit Task' : 'Add Task'}</h2>

        {errors.api && <div className='alert alert-error'>{errors.api}</div>}

        <form onSubmit={handleSubmit}>
          <div className='form-group'>
            <label>Title *</label>
            <input
              type='text'
              value={form.title}
              onChange={set('title')}
              placeholder='Task title'
              autoFocus
            />
            {errors.title && <span className='error-msg'>{errors.title}</span>}
          </div>

          <div className='form-group'>
            <label>Description</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              placeholder='Optional description...'
            />
          </div>

          {isEdit && (
            <div className='form-group'>
              <label>Status</label>
              <select value={form.status} onChange={set('status')}>
                <option value='pending'>Pending</option>
                <option value='completed'>Completed</option>
              </select>
            </div>
          )}

          <div className='modal-actions'>
            <button type='button' className='btn btn-ghost' onClick={onClose}>
              Cancel
            </button>
            <button type='submit' className='btn btn-primary' disabled={loading}>
              {loading ? <span className='spinner' /> : isEdit ? 'Save Changes' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
