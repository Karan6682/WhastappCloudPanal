import React, { useState } from 'react';
import axios from 'axios';
import './Login.css';

function Login({ setIsAuthenticated, setUser }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login
        const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
          username,
          password
        });

        localStorage.setItem('token', loginResponse.data.token);
        localStorage.setItem('user', JSON.stringify(loginResponse.data.user));
        setUser(loginResponse.data.user);
        setIsAuthenticated(true);
      } else {
        // Register
        if (!username || !password || !email) {
          setError('All fields are required');
          setLoading(false);
          return;
        }

        await axios.post(`${API_BASE}/api/auth/register`, {
          username,
          email,
          password
        });

        setError('');
        setIsLogin(true);
        setUsername('');
        setPassword('');
        setEmail('');
        alert('Registration successful! Please login.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">
          {isLogin ? '🔐 WhatsApp Automation' : '📝 Create Account'}
        </h1>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-login"
            disabled={loading}
          >
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>

        <div className="toggle-auth">
          {isLogin ? (
            <>
              <p>Don't have an account?</p>
              <button
                type="button"
                className="btn-toggle"
                onClick={() => setIsLogin(false)}
              >
                Create New Account
              </button>
            </>
          ) : (
            <>
              <p>Already have an account?</p>
              <button
                type="button"
                className="btn-toggle"
                onClick={() => setIsLogin(true)}
              >
                Login Here
              </button>
            </>
          )}
        </div>

        <div className="demo-info">
          <p>📌 Demo Credentials:</p>
          <small>Username: admin | Password: admin123</small>
        </div>
      </div>
    </div>
  );
}

export default Login;
