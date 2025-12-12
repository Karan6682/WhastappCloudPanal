import React from 'react';
import './StatsChart.css';

function StatsChart({ data }) {
  return (
    <div className="stats-chart">
      <h2>Campaign Performance</h2>
      <div className="chart-container">
        <div className="chart-metric">
          <div className="metric-label">Total Messages</div>
          <div className="metric-value">{data.reduce((sum, c) => sum + c.sentCount + c.failedCount, 0)}</div>
          <div className="metric-bar">
            <div className="metric-fill" style={{ width: '100%' }}></div>
          </div>
        </div>
        <div className="chart-metric">
          <div className="metric-label">Success Rate</div>
          <div className="metric-value">
            {data.length > 0 
              ? Math.round((data.reduce((sum, c) => sum + c.sentCount, 0) / (data.reduce((sum, c) => sum + c.sentCount + c.failedCount, 0) || 1)) * 100)
              : 0}%
          </div>
          <div className="metric-bar">
            <div className="metric-fill success" style={{ width: data.length > 0 ? Math.round((data.reduce((sum, c) => sum + c.sentCount, 0) / (data.reduce((sum, c) => sum + c.sentCount + c.failedCount, 0) || 1)) * 100) : 0 + '%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatsChart;
