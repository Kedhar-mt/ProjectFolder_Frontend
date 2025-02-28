import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { encryptPassword } from '../utils/encryption';

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'user'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { username, email, phone, password, confirmPassword, role } = formData;

  const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // const onSubmit = async (e) => {
  //   e.preventDefault();
  //   setLoading(true);
  //   setError('');

  //   if (password !== confirmPassword) {
  //     setError('Passwords do not match');
  //     setLoading(false);
  //     return;
  //   }

  //   try {
  //     const encryptedPassword = encryptPassword(password);
  //     console.log("Encrypted Password Sent:", encryptedPassword);
  //     const res = await api.post('/api/auth/register', {
  //       username,
  //       email,
  //       phone,
  //       password: encryptedPassword,
  //       role
  //     });
  //     navigate('/login'); // Navigate to login after signup
  //   } catch (err) {
  //     setError(err.response?.data?.msg || 'Signup failed');
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
  
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
  
    try {
      // const encryptedPassword = encryptPassword(password);
      // console.log("Encrypted Password Sent:", encryptedPassword);
      const res = await api.post('/api/auth/register', {
        username,
        email,
        phone,
        password,
        role
      });
      navigate('/login'); // Navigate to login after signup
    } catch (err) {
      setError(err.response?.data?.msg || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="signup-container">
      <h2>Sign Up</h2>
      <form onSubmit={onSubmit}>
        {error && <div className="error-message">{error}</div>}
        <div className="form-group">
          <label>Username</label>
          <input
            type="text"
            name="username"
            value={username}
            onChange={onChange}
            required
          />
        </div>
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
          <label>Phone Number</label>
          <input
            type="tel"
            name="phone"
            value={phone}
            onChange={onChange}
            required
            pattern="[0-9]{10}"
            placeholder="Enter 10-digit phone number"
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
        <div className="form-group">
          <label>Confirm Password</label>
          <input
            type="password"
            name="confirmPassword"
            value={confirmPassword}
            onChange={onChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Account Type</label>
          <select
            name="role"
            value={role}
            onChange={onChange}
            required
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button type="submit" disabled={loading} className="submit-button">
          {loading ? 'Signing up...' : 'Sign Up'}
        </button>
      </form>
      <div className="auth-link">
        Already have an account?{' '}
        <Link to="/login">Login</Link>
      </div>
    </div>
  );
};

export default Signup;
