import React, { useState, useEffect } from 'react';
import { getStats, getCampaigns } from '../services/api';
import './Dashboard.css';
import DashboardCard from '../components/DashboardCard';
import StatsChart from '../components/StatsChart';

function Dashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [, campaignsRes] = await Promise.all([
        getStats(),
        getCampaigns()
      ]);
      setCampaigns(campaignsRes.data || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const totalSent = campaigns.reduce((sum, c) => sum + c.sentCount, 0);
  const totalFailed = campaigns.reduce((sum, c) => sum + c.failedCount, 0);

  if (loading) {
    return <div className="dashboard-loading">Loading...</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>📊 Dashboard</h1>
        <p>Welcome to WhatsApp Automation Control Center</p>
      </div>

      <div className="dashboard-grid">
        <DashboardCard 
          title="Total Campaigns" 
          value={totalCampaigns} 
          icon="🚀"
          color="blue"
        />
        <DashboardCard 
          title="Active Campaigns" 
          value={activeCampaigns} 
          icon="⚡"
          color="green"
        />
        <DashboardCard 
          title="Messages Sent" 
          value={totalSent} 
          icon="✅"
          color="purple"
        />
        <DashboardCard 
          title="Failed Messages" 
          value={totalFailed} 
          icon="❌"
          color="red"
        />
      </div>

      <div className="dashboard-charts">
        <StatsChart data={campaigns} />
      </div>

      <div className="recent-campaigns">
        <h2>Recent Campaigns</h2>
        <table className="campaigns-table">
          <thead>
            <tr>
              <th>Campaign Name</th>
              <th>Status</th>
              <th>Sent</th>
              <th>Failed</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.slice(0, 5).map(campaign => (
              <tr key={campaign.id}>
                <td>{campaign.name}</td>
                <td><span className={`status-${campaign.status}`}>{campaign.status}</span></td>
                <td>{campaign.sentCount}</td>
                <td>{campaign.failedCount}</td>
                <td>{new Date(campaign.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Dashboard;
