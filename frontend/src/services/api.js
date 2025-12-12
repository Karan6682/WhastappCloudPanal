import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Templates
export const getTemplates = () => apiClient.get('/templates');
export const createTemplate = (data) => apiClient.post('/templates', data);
export const updateTemplate = (id, data) => apiClient.put(`/templates/${id}`, data);
export const deleteTemplate = (id) => apiClient.delete(`/templates/${id}`);

// Contacts
export const getContacts = () => apiClient.get('/contacts');
export const createContact = (data) => apiClient.post('/contacts', data);
export const updateContact = (id, data) => apiClient.put(`/contacts/${id}`, data);
export const deleteContact = (id) => apiClient.delete(`/contacts/${id}`);
export const bulkUploadContacts = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post('/contacts/bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

// Campaigns
export const getCampaigns = () => apiClient.get('/campaigns');
export const createCampaign = (data) => apiClient.post('/campaigns', data);
export const updateCampaign = (id, data) => apiClient.put(`/campaigns/${id}`, data);
export const deleteCampaign = (id) => apiClient.delete(`/campaigns/${id}`);

// Stats
export const getStats = () => apiClient.get('/stats');
export const getCampaignStats = (campaignId) => apiClient.get(`/stats/campaign/${campaignId}`);

// Logs
export const getLogs = (limit = 100, offset = 0) => apiClient.get(`/logs?limit=${limit}&offset=${offset}`);

// Files
export const uploadPDF = (file) => {
  const formData = new FormData();
  formData.append('pdf', file);
  return apiClient.post('/upload-pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

// Health
export const checkHealth = () => apiClient.get('/health');

export default apiClient;
