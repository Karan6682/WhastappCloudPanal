import React from 'react';
import './DashboardCard.css';

function DashboardCard({ title, value, icon, color }) {
  return (
    <div className={`dashboard-card card-${color}`}>
      <div className="card-icon">{icon}</div>
      <div className="card-content">
        <p className="card-title">{title}</p>
        <p className="card-value">{value}</p>
      </div>
    </div>
  );
}

export default DashboardCard;
