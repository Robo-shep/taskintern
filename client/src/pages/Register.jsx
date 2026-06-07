import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/axios.js';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 6) errs.password = 'At least 6 characters';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setApiError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setErrors(errs => ({ ...errs, [field]: undefined }));
  };

  return (
    <div className='auth-page'>
      <div className='auth-card'>
        <h1>TaskManager</h1>
        <p className='subtitle'>Create your account</p>

        {apiError && <div className='alert alert-error'>{apiError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className='form-group'>
            <label>Name</label>
            <input type='text' value={form.name} onChange={set('name')} placeholder='Your full name' />
            {errors.name && <span className='error-msg'>{errors.name}</span>}
          </div>

          <div className='form-group'>
            <label>Email</label>
            <input type='email' value={form.email} onChange={set('email')} placeholder='you@example.com' />
            {errors.email && <span className='error-msg'>{errors.email}</span>}
          </div>

          <div className='form-group'>
            <label>Password</label>
            <input type='password' value={form.password} onChange={set('password')} placeholder='Min. 6 characters' />
            {errors.password && <span className='error-msg'>{errors.password}</span>}
          </div>

          <button type='submit' className='btn btn-primary btn-full' disabled={loading}>
            {loading ? <span className='spinner' /> : 'Create Account'}
          </button>
        </form>

        <p className='auth-footer'>
          Already have an account? <Link to='/login'>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
