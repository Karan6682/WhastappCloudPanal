import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './WhatsAppConnect.css';

function WhatsAppConnect() {
  const [qrCode, setQrCode] = useState(null);
  const [status, setStatus] = useState('waiting'); // waiting, scanning, connected, failed
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connectionInfo, setConnectionInfo] = useState(null);
  const token = localStorage.getItem('token');
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const checkConnectionStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/whatsapp/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.connected) {
        setStatus('connected');
        setConnectionInfo(response.data);
      } else {
        setStatus('waiting');
      }
    } catch (err) {
      console.error('Status check error:', err);
    }
  }, [token, API_BASE]);

  useEffect(() => {
    checkConnectionStatus();
    const interval = setInterval(checkConnectionStatus, 3000);
    return () => clearInterval(interval);
  }, [checkConnectionStatus]);

  const startQRAuth = async () => {
    setLoading(true);
    setError('');
    
    try {
      await axios.post(`${API_BASE}/api/whatsapp/start-qr`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Start polling for QR code
      pollQRCode();
      setStatus('scanning');
    } catch (err) {
      setError(err.response?.data?.error || 'Error starting authentication');
      setStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  const pollQRCode = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/whatsapp/qr-code`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.qrCode) {
        setQrCode(response.data.qrCode);
      }

      // Poll again after 2 seconds
      setTimeout(pollQRCode, 2000);
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error('QR polling error:', err);
      }
    }
  };

  const disconnect = async () => {
    try {
      await axios.post(`${API_BASE}/api/whatsapp/disconnect`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus('waiting');
      setConnectionInfo(null);
      setQrCode(null);
    } catch (err) {
      setError('Error disconnecting');
    }
  };

  return (
    <div className="whatsapp-connect-container">
      <div className="connect-card">
        <h2>📱 WhatsApp Connection</h2>

        {error && <div className="error-message">{error}</div>}

        {status === 'connected' ? (
          <div className="connection-success">
            <div className="success-icon">✅</div>
            <h3>Connected to WhatsApp</h3>
            {connectionInfo && (
              <p className="phone-info">Phone: {connectionInfo.phone}</p>
            )}
            <button className="btn-disconnect" onClick={disconnect}>
              Disconnect
            </button>
          </div>
        ) : status === 'scanning' ? (
          <div className="qr-section">
            <p className="instruction">📸 Scan this QR code with your WhatsApp phone:</p>
            {qrCode ? (
              <div className="qr-code">
                <img src={qrCode} alt="WhatsApp QR Code" />
              </div>
            ) : (
              <div className="loading">Loading QR code...</div>
            )}
            <p className="hint">Scanning... Keep this window open</p>
          </div>
        ) : (
          <div className="connect-form">
            <p className="description">
              🔐 Secure WhatsApp Connection
            </p>
            <p className="info">
              Click below to generate a QR code. Scan it with your WhatsApp phone camera to connect your account.
            </p>
            <button
              className="btn-start"
              onClick={startQRAuth}
              disabled={loading}
            >
              {loading ? 'Starting...' : '📲 Start WhatsApp Connection'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default WhatsAppConnect;
