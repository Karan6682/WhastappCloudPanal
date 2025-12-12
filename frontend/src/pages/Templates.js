import React, { useState, useEffect } from 'react';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../services/api';
import './Templates.css';

function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ title: '', content: '' });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await getTemplates();
      setTemplates(response.data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateTemplate(editingId, formData);
      } else {
        await createTemplate(formData);
      }
      setFormData({ title: '', content: '' });
      setEditingId(null);
      setShowForm(false);
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleEdit = (template) => {
    setFormData(template);
    setEditingId(template.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure?')) {
      try {
        await deleteTemplate(id);
        loadTemplates();
      } catch (error) {
        console.error('Error deleting template:', error);
      }
    }
  };

  return (
    <div className="templates-page">
      <div className="page-header">
        <h1>📝 Message Templates</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          ➕ New Template
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <h2>{editingId ? 'Edit Template' : 'Create New Template'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Template Title</label>
              <input
                type="text"
                placeholder="e.g., Welcome Message"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                // eslint-disable-next-line jsx-a11y/no-autofocus
              />
            </div>
            <div className="form-group">
              <label>Message Content</label>
              <textarea
                placeholder="Enter your message template. Use placeholders for name."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
                rows={6}
              />
              <small>Tip: Use placeholders like your_placeholder to insert contact details dynamically</small>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Save Template</button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({ title: '', content: '' });
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading templates...</div>
      ) : (
        <div className="templates-grid">
          {templates.map(template => (
            <div key={template.id} className="template-card">
              <div className="template-header">
                <h3>{template.title}</h3>
              </div>
              <div className="template-preview">
                <p>{template.content.substring(0, 150)}...</p>
              </div>
              <div className="template-footer">
                <small>Updated: {new Date(template.updatedAt || template.createdAt).toLocaleDateString()}</small>
              </div>
              <div className="template-actions">
                <button className="btn btn-sm btn-edit" onClick={() => handleEdit(template)}>Edit</button>
                <button className="btn btn-sm btn-delete" onClick={() => handleDelete(template.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Templates;
