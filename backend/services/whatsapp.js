const makeWASocket = require('@adiwajshing/baileys').default;
const { useMultiFileAuthState, DisconnectReason } = require('@adiwajshing/baileys');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs-extra');
const Pino = require('pino');

const sessions = new Map(); // Store active sessions

class WhatsAppService {
  constructor(db) {
    this.db = db;
    this.sessions = sessions;
    this.logger = Pino();
  }

  // Generate QR code and start authentication
  async startQRCodeAuth(userId) {
    try {
      const authDir = path.join(__dirname, '../../whatsapp-auth', userId);
      await fs.ensureDir(authDir);

      const { state, saveCreds } = await useMultiFileAuthState(authDir);

      const socket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: Pino({ level: 'silent' }),
        markOnlineOnConnect: true,
      });

      let qrCodeDataUrl = null;

      socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          // Generate QR code as data URL
          qrCodeDataUrl = await qrcode.toDataURL(qr);
          
          // Save to database
          const session = await this.db.getQRSessionByUserId(userId);
          if (session) {
            await this.db.updateQRSessionStatus(session.id, 'waiting', qrCodeDataUrl);
          } else {
            await this.db.createQRSession(userId, qrCodeDataUrl);
          }

          console.log(`🔐 QR Code generated for user ${userId}`);
        }

        if (connection === 'connecting') {
          console.log(`📱 Connecting WhatsApp for user ${userId}...`);
        }

        if (connection === 'open') {
          console.log(`✅ WhatsApp connected for user ${userId}`);
          const phoneNumber = socket.user?.id.replace(/[^0-9]/g, '');
          
          // Save connection to database
          await this.db.updateUserWhatsAppSession(userId, phoneNumber, 'connected');
          await this.db.updateQRSessionStatus(
            (await this.db.getQRSessionByUserId(userId)).id,
            'connected'
          );

          // Store session
          this.sessions.set(userId, socket);
        }

        if (connection === 'close') {
          const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
          console.log(`❌ Connection closed for user ${userId}. Reconnect: ${shouldReconnect}`);
          this.sessions.delete(userId);
          
          if (shouldReconnect) {
            setTimeout(() => this.startQRCodeAuth(userId), 3000);
          }
        }
      });

      socket.ev.on('creds.update', saveCreds);

      return { qrCode: qrCodeDataUrl, sessionId: userId };
    } catch (error) {
      console.error('Error starting QR auth:', error);
      throw error;
    }
  }

  // Get QR code for a user
  async getQRCode(userId) {
    try {
      const session = await this.db.getQRSessionByUserId(userId);
      return session?.qr_code || null;
    } catch (error) {
      console.error('Error getting QR code:', error);
      throw error;
    }
  }

  // Get user's WhatsApp connection status
  async getConnectionStatus(userId) {
    try {
      const user = await this.db.getUserById(userId);
      return {
        connected: user?.whatsapp_connected || false,
        phone: user?.whatsapp_phone || null,
        status: this.sessions.has(userId) ? 'online' : 'offline'
      };
    } catch (error) {
      console.error('Error getting connection status:', error);
      throw error;
    }
  }

  // Send single message
  async sendMessage(userId, phoneNumber, message) {
    try {
      const socket = this.sessions.get(userId);
      if (!socket) {
        throw new Error('WhatsApp not connected for this user');
      }

      // Normalize phone number
      let jid = phoneNumber.replace(/[^0-9]/g, '');
      if (!jid.includes('@')) {
        jid = jid + '@s.whatsapp.net';
      }

      const response = await socket.sendMessage(jid, { text: message });
      return {
        success: true,
        messageId: response.key.id,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Send messages with delay (prevent blocking)
  async sendBulkMessages(userId, campaignId, contacts, templateContent, settings, db) {
    try {
      const socket = this.sessions.get(userId);
      if (!socket) {
        throw new Error('WhatsApp not connected for this user');
      }

      const delayMs = (settings.msg_delay_seconds || 5) * 1000;
      const results = { sent: 0, failed: 0, blocked: 0 };

      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        try {
          // Replace placeholders in message
          let message = templateContent;
          if (contact.name) message = message.replace(/{{name}}/g, contact.name);
          message = message.replace(/{{phone}}/g, contact.phone);
          
          // Send message
          const response = await this.sendMessage(userId, contact.phone, message);
          
          // Log success
          await db.addLog(userId, campaignId, contact.phone, 'sent', 'Message sent successfully');
          await db.incrementCampaignStats(campaignId, true);
          results.sent++;

          // Add delay between messages to prevent blocking
          if (i < contacts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        } catch (error) {
          // Log failure
          await db.addLog(userId, campaignId, contact.phone, 'failed', error.message);
          await db.incrementCampaignStats(campaignId, false);
          results.failed++;
        }
      }

      return results;
    } catch (error) {
      console.error('Error sending bulk messages:', error);
      throw error;
    }
  }

  // Disconnect WhatsApp
  async disconnect(userId) {
    try {
      const socket = this.sessions.get(userId);
      if (socket) {
        await socket.logout();
        this.sessions.delete(userId);
        await this.db.updateUserWhatsAppSession(userId, null, '');
      }
      return true;
    } catch (error) {
      console.error('Error disconnecting:', error);
      throw error;
    }
  }
}

module.exports = WhatsAppService;
