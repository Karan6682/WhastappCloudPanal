import React, { useState, useEffect } from 'react';
import { getContacts, createContact, updateContact, deleteContact, bulkUploadContacts } from '../services/api';
import './Contacts.css';

function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ phone: '', name: '', email: '' });

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const response = await getContacts();
      setContacts(response.data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateContact(editingId, formData);
      } else {
        await createContact(formData);
      }
      setFormData({ phone: '', name: '', email: '' });
      setEditingId(null);
      setShowForm(false);
      loadContacts();
    } catch (error) {
      console.error('Error saving contact:', error);
    }
  };

  const handleEdit = (contact) => {
    setFormData(contact);
    setEditingId(contact.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure?')) {
      try {
        await deleteContact(id);
        loadContacts();
      } catch (error) {
        console.error('Error deleting contact:', error);
      }
    }
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await bulkUploadContacts(file);
      loadContacts();
    } catch (error) {
      console.error('Error uploading contacts:', error);
    }
  };

  return (
    <div className="contacts-page">
      <div className="page-header">
        <h1>👥 Contacts Management</h1>
        <div className="header-actions">
          <label className="bulk-upload-btn">
            📥 Bulk Upload CSV
            <input type="file" accept=".csv" onChange={handleBulkUpload} hidden />
          </label>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            ➕ Add Contact
          </button>
        </div>
      </div>

      {showForm && (
        <div className="form-card">
          <h2>{editingId ? 'Edit Contact' : 'Add New Contact'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Phone (International Format)</label>
              <input
                type="text"
                placeholder="+1234567890"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Save</button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({ phone: '', name: '', email: '' });
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading contacts...</div>
      ) : (
        <div className="contacts-grid">
          {contacts.map(contact => (
            <div key={contact.id} className="contact-card">
              <div className="contact-info">
                <h3>{contact.name}</h3>
                <p className="contact-phone">📱 {contact.phone}</p>
                {contact.email && <p className="contact-email">📧 {contact.email}</p>}
                <p className="contact-date">Added: {new Date(contact.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="contact-actions">
                <button className="btn btn-sm btn-edit" onClick={() => handleEdit(contact)}>Edit</button>
                <button className="btn btn-sm btn-delete" onClick={() => handleDelete(contact.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Contacts;
