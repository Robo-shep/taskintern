export default function TaskCard({ task, onEdit, onDelete, onToggle }) {
  const isCompleted = task.status === 'completed';
  const date = new Date(task.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div className={`task-card ${task.status}`}>
      <div className='task-card-header'>
        <span className={`task-title ${isCompleted ? 'strikethrough' : ''}`}>
          {task.title}
        </span>
        <span className={`badge badge-${task.status}`}>{task.status}</span>
      </div>

      {task.description && (
        <p className='task-description'>{task.description}</p>
      )}

      <span className='task-meta'>Created {date}</span>

      <div className='task-actions'>
        <button
          className={`btn btn-sm ${isCompleted ? 'btn-ghost' : 'btn-success'}`}
          onClick={() => onToggle(task)}
          title={isCompleted ? 'Mark pending' : 'Mark complete'}
        >
          {isCompleted ? 'Undo' : 'Complete'}
        </button>
        <button className='btn btn-ghost btn-sm' onClick={() => onEdit(task)}>
          Edit
        </button>
        <button className='btn btn-danger btn-sm' onClick={() => onDelete(task._id)}>
          Delete
        </button>
      </div>
    </div>
  );
}
