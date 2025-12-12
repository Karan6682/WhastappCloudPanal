import React, { useState, useEffect } from 'react';
import { getCampaigns, createCampaign, updateCampaign, deleteCampaign, getTemplates, getContacts } from '../services/api';
import './Campaigns.css';

function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    templateId: '', 
    contacts: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [campaignsRes, templatesRes, contactsRes] = await Promise.all([
        getCampaigns(),
        getTemplates(),
        getContacts()
      ]);
      setCampaigns(campaignsRes.data || []);
      setTemplates(templatesRes.data || []);
      setContacts(contactsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateCampaign(editingId, formData);
      } else {
        await createCampaign(formData);
      }
      setFormData({ name: '', templateId: '', contacts: [] });
      setEditingId(null);
      setShowForm(false);
      loadData();
    } catch (error) {
      console.error('Error saving campaign:', error);
    }
  };

  const handleEdit = (campaign) => {
    setFormData({
      name: campaign.name,
      templateId: campaign.templateId,
      contacts: campaign.contacts ? JSON.parse(campaign.contacts) : []
    });
    setEditingId(campaign.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure?')) {
      try {
        await deleteCampaign(id);
        loadData();
      } catch (error) {
        console.error('Error deleting campaign:', error);
      }
    }
  };

  const toggleContact = (contactId) => {
    setFormData({
      ...formData,
      contacts: formData.contacts.includes(contactId)
        ? formData.contacts.filter(id => id !== contactId)
        : [...formData.contacts, contactId]
    });
  };

  return (
    <div className="campaigns-page">
      <div className="page-header">
        <h1>🚀 Campaigns</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          ➕ New Campaign
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <h2>{editingId ? 'Edit Campaign' : 'Create New Campaign'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Campaign Name</label>
              <input
                type="text"
                placeholder="e.g., Q4 Marketing"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Select Template</label>
              <select
                value={formData.templateId}
                onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                required
              >
                <option value="">Choose a template...</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Select Contacts ({formData.contacts.length} selected)</label>
              <div className="contacts-list">
                {contacts.map(contact => (
                  <label key={contact.id} className="contact-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.contacts.includes(contact.id)}
                      onChange={() => toggleContact(contact.id)}
                    />
                    <span>{contact.name} ({contact.phone})</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Create Campaign</button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({ name: '', templateId: '', contacts: [] });
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading campaigns...</div>
      ) : (
        <div className="campaigns-table-container">
          <table className="campaigns-table">
            <thead>
              <tr>
                <th>Campaign Name</th>
                <th>Status</th>
                <th>Contacts</th>
                <th>Sent</th>
                <th>Failed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(campaign => (
                <tr key={campaign.id}>
                  <td className="campaign-name">{campaign.name}</td>
                  <td><span className={`status-${campaign.status}`}>{campaign.status}</span></td>
                  <td>{campaign.contacts ? JSON.parse(campaign.contacts).length : 0}</td>
                  <td className="success">{campaign.sentCount}</td>
                  <td className="error">{campaign.failedCount}</td>
                  <td>
                    <button className="btn btn-sm btn-edit" onClick={() => handleEdit(campaign)}>Edit</button>
                    <button className="btn btn-sm btn-delete" onClick={() => handleDelete(campaign.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Campaigns;
