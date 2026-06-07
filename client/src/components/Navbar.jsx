import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className='navbar'>
      <span className='navbar-brand'>TaskManager</span>
      <div className='navbar-right'>
        <span className='navbar-user'>
          Hey, <strong>{user?.name}</strong>
        </span>
        <button className='btn btn-ghost btn-sm' onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}
