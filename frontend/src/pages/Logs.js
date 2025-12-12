import React, { useState, useEffect, useCallback } from 'react';
import { getLogs } from '../services/api';
import './Logs.css';

function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('all');

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getLogs(50, page * 50);
      setLogs(response.data || []);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const getLogColor = (type) => {
    switch (type) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getLogIcon = (type) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className="logs-page">
      <div className="page-header">
        <h1>📋 Activity Logs</h1>
        <div className="filter-controls">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Types</option>
            <option value="success">Success</option>
            <option value="error">Errors</option>
            <option value="warning">Warnings</option>
          </select>
          <button className="btn btn-secondary" onClick={loadLogs}>🔄 Refresh</button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading logs...</div>
      ) : (
        <div className="logs-container">
          {logs.length === 0 ? (
            <div className="no-logs">No logs found</div>
          ) : (
            <div className="logs-list">
              {logs.map((log, index) => (
                <div key={log.id || index} className={`log-entry log-${getLogColor(log.type)}`}>
                  <div className="log-icon">{getLogIcon(log.type)}</div>
                  <div className="log-content">
                    <p className="log-message">{log.message}</p>
                    <div className="log-metadata">
                      {log.campaignId && <span className="log-tag">Campaign: {log.campaignId}</span>}
                      {log.contactId && <span className="log-tag">Contact: {log.contactId}</span>}
                      <span className="log-time">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pagination">
            <button 
              className="btn btn-secondary" 
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
            >
              ← Previous
            </button>
            <span className="page-info">Page {page + 1}</span>
            <button 
              className="btn btn-secondary" 
              onClick={() => setPage(page + 1)}
              disabled={logs.length < 50}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Logs;
