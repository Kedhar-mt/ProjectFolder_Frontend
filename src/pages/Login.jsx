import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import CryptoJS from 'crypto-js';

const SECRET_KEY = "Kedhareswarmatha"; // Use the same key as in the backend

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { email, password } = formData;

  const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // const encryptPassword = (password) => {
  //   return CryptoJS.AES.encrypt(password, SECRET_KEY).toString();
  // };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      //const encryptedPassword = encryptPassword(password); // Encrypt password before sending
      //console.log("Encrypted Password Sent to Backend:", encryptedPassword);

      const res = await api.post('/api/auth/login', {
        email,
        password,
      });

      // Store tokens and user info in localStorage
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      localStorage.setItem('userRole', res.data.user.role);
      localStorage.setItem('userId', res.data.user.id); // Store user ID for logout

      console.log("Login Response:", res.data);
      
      // Redirect based on user role
      if (res.data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/user');
      }
    } catch (err) {
      setError(err.response?.data?.msg || 'Login failed');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={onSubmit}>
        {error && <div className="error-message">{error}</div>}
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={email}
            onChange={onChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            name="password"
            value={password}
            onChange={onChange}
            required
          />
        </div>
        <button type="submit" disabled={loading} className="submit-button">
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div className="auth-links">
        <Link to="/forgot-password">Forgot Password?</Link>
        <div>
          Don't have an account? <Link to="/signup">Sign up</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;