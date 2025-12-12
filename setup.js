#!/usr/bin/env node

/**
 * Setup Script - Create initial admin user and configure system
 * Usage: node setup.js
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001';

async function createAdminUser() {
  try {
    console.log('\n🔐 WhatsApp Automation - Initial Setup\n');
    console.log('Creating admin user...\n');

    const response = await axios.post(`${API_BASE}/api/auth/register`, {
      username: 'admin',
      email: 'admin@whatsappautomation.com',
      password: 'admin123'
    });

    console.log('✅ Admin account created successfully!\n');
    console.log('📌 Login Credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123\n');
    console.log('🌐 Access dashboard at: http://localhost:3000\n');

  } catch (error) {
    if (error.response?.data?.error?.includes('already exists')) {
      console.log('✅ Admin user already exists!\n');
      console.log('📌 Login Credentials:');
      console.log('   Username: admin');
      console.log('   Password: admin123\n');
      console.log('🌐 Access dashboard at: http://localhost:3000\n');
    } else {
      console.error('❌ Error creating admin user:', error.response?.data?.error || error.message);
    }
  }
}

createAdminUser();
