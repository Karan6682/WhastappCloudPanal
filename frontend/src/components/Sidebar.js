import React from 'react';
import './Sidebar.css';

function Sidebar({ active, onMenuClick, user, onLogout }) {
  const menuItems = [
    { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
    { id: 'campaigns', label: '🚀 Campaigns', icon: '🚀' },
    { id: 'contacts', label: '👥 Contacts', icon: '👥' },
    { id: 'templates', label: '📝 Templates', icon: '📝' },
    { id: 'logs', label: '📋 Logs', icon: '📋' },
    { id: 'whatsapp', label: '📱 WhatsApp', icon: '📱' },
    { id: 'settings', label: '⚙️ Settings', icon: '⚙️' },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>WhatsApp Automation</h1>
        <p className="version">v2.0</p>
        {user && <p className="username">👤 {user.username}</p>}
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${active === item.id ? 'active' : ''}`}
            onClick={() => onMenuClick(item.id)}
          >
            <span className="icon">{item.icon}</span>
            <span className="label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="btn-logout" onClick={onLogout}>
          🚪 Logout
        </button>
        <p>© 2025 WhatsApp Automation</p>
      </div>
    </div>
  );
}

export default Sidebar;
