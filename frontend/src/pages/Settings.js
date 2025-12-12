import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Settings.css';

function Settings() {
  const [settings, setSettings] = useState({
    msg_delay_seconds: 5,
    batch_size: 100,
    prevent_blocking: true,
    rate_limit_per_minute: 30
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const loadSettings = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(response.data);
    } catch (err) {
      setError('Error loading settings');
    }
  }, [token, API_BASE]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      await axios.put(`${API_BASE}/api/settings`, settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('✅ Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error saving settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-container">
      <h1>⚙️ Settings</h1>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="settings-grid">
        {/* Message Delay */}
        <div className="setting-card">
          <div className="card-header">
            <h3>⏱️ Message Delay</h3>
            <span className="default-badge">Default: 5s</span>
          </div>
          <p className="description">Time between sending messages (in seconds) to prevent account blocking</p>
          <div className="setting-control">
            <input
              type="range"
              min="1"
              max="30"
              value={settings.msg_delay_seconds}
              onChange={(e) => handleChange('msg_delay_seconds', parseInt(e.target.value))}
              className="slider"
            />
            <div className="value-display">
              {settings.msg_delay_seconds} <span>seconds</span>
            </div>
          </div>
          <div className="tips">
            <strong>Recommended:</strong>
            <ul>
              <li>3-5s: Normal sending</li>
              <li>5-10s: Safe mode</li>
              <li>10+s: Maximum protection</li>
            </ul>
          </div>
        </div>

        {/* Batch Size */}
        <div className="setting-card">
          <div className="card-header">
            <h3>📦 Batch Size</h3>
            <span className="default-badge">Default: 100</span>
          </div>
          <p className="description">Maximum contacts to process in one campaign</p>
          <div className="setting-control">
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={settings.batch_size}
              onChange={(e) => handleChange('batch_size', parseInt(e.target.value))}
              className="slider"
            />
            <div className="value-display">
              {settings.batch_size} <span>contacts</span>
            </div>
          </div>
          <div className="tips">
            <strong>Tips:</strong>
            <ul>
              <li>Smaller = Safer</li>
              <li>Larger = Faster</li>
              <li>Balance for best results</li>
            </ul>
          </div>
        </div>

        {/* Number Blocking Prevention */}
        <div className="setting-card">
          <div className="card-header">
            <h3>🛡️ Prevent Number Blocking</h3>
            <span className="default-badge">Enabled</span>
          </div>
          <p className="description">Enables smart delays and rate limiting to prevent WhatsApp blocking</p>
          <div className="toggle-control">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.prevent_blocking}
                onChange={(e) => handleChange('prevent_blocking', e.target.checked)}
              />
              <span className="slider-toggle"></span>
            </label>
            <span className="toggle-label">
              {settings.prevent_blocking ? '🟢 Enabled' : '🔴 Disabled'}
            </span>
          </div>
          <div className="tips">
            <strong>When enabled:</strong>
            <ul>
              <li>✅ Enforces message delays</li>
              <li>✅ Limits rate per minute</li>
              <li>✅ Distributes loads evenly</li>
            </ul>
          </div>
        </div>

        {/* Rate Limiting */}
        <div className="setting-card">
          <div className="card-header">
            <h3>🚦 Rate Limit</h3>
            <span className="default-badge">Default: 30/min</span>
          </div>
          <p className="description">Maximum messages per minute when blocking prevention is enabled</p>
          <div className="setting-control">
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={settings.rate_limit_per_minute}
              onChange={(e) => handleChange('rate_limit_per_minute', parseInt(e.target.value))}
              className="slider"
            />
            <div className="value-display">
              {settings.rate_limit_per_minute} <span>/minute</span>
            </div>
          </div>
          <div className="tips">
            <strong>Guidelines:</strong>
            <ul>
              <li>Low (5-15): Maximum safety</li>
              <li>Medium (15-30): Balanced</li>
              <li>High (30+): Faster sending</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Safety Recommendations */}
      <div className="safety-section">
        <h2>🔒 Safety Recommendations</h2>
        <div className="recommendations">
          <div className="rec-item">
            <span className="rec-icon">✓</span>
            <div>
              <strong>Start Slow:</strong> Begin with higher delays and gradually reduce as you test
            </div>
          </div>
          <div className="rec-item">
            <span className="rec-icon">✓</span>
            <div>
              <strong>Monitor Results:</strong> Check logs to see if messages are being sent successfully
            </div>
          </div>
          <div className="rec-item">
            <span className="rec-icon">✓</span>
            <div>
              <strong>Use Random Templates:</strong> Vary your messages to avoid detection
            </div>
          </div>
          <div className="rec-item">
            <span className="rec-icon">✓</span>
            <div>
              <strong>Test First:</strong> Always test with small contact batches first
            </div>
          </div>
          <div className="rec-item">
            <span className="rec-icon">✓</span>
            <div>
              <strong>Respect WhatsApp ToS:</strong> Don't spam or send unsolicited messages
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="action-buttons">
        <button
          className="btn-save"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? '💾 Saving...' : '💾 Save Settings'}
        </button>
      </div>
    </div>
  );
}

export default Settings;
