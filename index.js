
/**
 * index.js
 * Safe WhatsApp sender using Baileys.
 *
 * Steps:
 * 1) npm install
 * 2) put PDFs in ./pdfs/
 * 3) edit contacts.csv
 * 4) node index.js
 *
 * NOTE: This is example code. Test with a small set of known numbers first.
 */
const { default: makeWASocket, useSingleFileAuthState, DisconnectReason, fetchLatestBaileysVersion, generateForwardMessageContent } = require("@adiwajshing/baileys");
const qrcode = require('qrcode-terminal');
const fs = require('fs-extra');
const path = require('path');
const parse = require('csv-parse/lib/sync');

const TEMPLATES_FILE = './templates.json';
const CONTACTS_FILE = './contacts.csv';
const PDF_FOLDER = './pdfs';
const STATS_FILE = './stats.json';
const AUTH_FILE = './auth_info_multi.json'; // single-file auth

// Safety settings
const minDelayMs = 3000; // 3s
const maxDelayMs = 8000; // 8s
const MAX_PER_NUMBER_PER_DAY = 150; // per-account limit per day (tweak as required)
const GLOBAL_DAILY_LIMIT = 800; // global messages per day for this session

function sleep(ms){ return new Promise(resolve=>setTimeout(resolve, ms)); }
function randomBetween(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }

async function loadTemplates(){
  const data = await fs.readFile(TEMPLATES_FILE, 'utf8');
  return JSON.parse(data);
}
function loadContacts(){
  const csv = fs.readFileSync(CONTACTS_FILE, 'utf8');
  const records = parse(csv, {columns:true, skip_empty_lines:true});
  return records; // [{phone,name,pdf}, ...]
}
async function loadStats(){
  if(!fs.existsSync(STATS_FILE)) {
    await fs.writeJson(STATS_FILE, { daily_counts:{}, last_reset: new Date().toISOString().slice(0,10) }, {spaces:2});
  }
  return fs.readJson(STATS_FILE);
}
async function saveStats(stats){ await fs.writeJson(STATS_FILE, stats, {spaces:2}); }

// replace placeholder {{name}}
function applyTemplate(tpl, contact){
  return tpl.replace(/\{\{name\}\}/g, contact.name || '');
}

async function start(){
  // load baileys version
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log('Baileys version', version, 'isLatest', isLatest);

  const { state, saveState } = useSingleFileAuthState(AUTH_FILE);

  const sock = makeWASocket({
    printQRInTerminal: false,
    auth: state,
    version
  });

  sock.ev.on('creds.update', saveState);

  // QR
  sock.ev.on('connection.update', (update) => {
    const { connection, qr, lastDisconnect } = update;
    if(qr){
      console.log('Scan the QR below (or open this terminal with a QR scanner):');
      qrcode.generate(qr, { small: true });
    }
    if(connection === 'close'){
      const reason = (lastDisconnect && lastDisconnect.error && lastDisconnect.error.output) ? lastDisconnect.error.output.statusCode : lastDisconnect?.error;
      console.log('connection closed. reason:', reason);
      if(reason === DisconnectReason.loggedOut){
        console.log('Logged out - deleting auth file so you can scan again.');
        try{ fs.unlinkSync(AUTH_FILE); }catch(e){}
      }
    } else if(connection === 'open'){
      console.log('Connected — you are ready to send messages.');
    }
  });

  // simple handler for incoming messages (optional)
  sock.ev.on('messages.upsert', m => {
    // console.log('got message upsert', m);
  });

  const templates = await loadTemplates();
  const contacts = loadContacts();
  const stats = await loadStats();

  // reset daily counts if date changed
  const today = new Date().toISOString().slice(0,10);
  if(stats.last_reset !== today){
    stats.daily_counts = {};
    stats.last_reset = today;
    await saveStats(stats);
  }

  // Global counter
  let globalSent = 0;

  for(const contact of contacts){
    if(globalSent >= GLOBAL_DAILY_LIMIT){
      console.log('Global daily limit reached. Stopping run.');
      break;
    }

    const phone = contact.phone.trim(); // e.g. 919812345678
    if(!phone) continue;
    const jid = phone + '@s.whatsapp.net';

    // per-number check
    const sentSoFar = stats.daily_counts[jid] || 0;
    if(sentSoFar >= MAX_PER_NUMBER_PER_DAY){
      console.log(`Skipping ${phone} — reached per-number daily limit.`);
      continue;
    }

    // pick random template and apply
    const tpl = templates[Math.floor(Math.random()*templates.length)];
    const message = applyTemplate(tpl, contact);

    try{
      // send text
      await sock.sendMessage(jid, { text: message });
      console.log(`Sent text to ${phone}: "${message}"`);
      stats.daily_counts[jid] = (stats.daily_counts[jid]||0) + 1;
      globalSent++;
      await saveStats(stats);

      // if file specified and exists, send as document (PDF) or image (JPG/PNG)
      if(contact.pdf && contact.pdf.trim()){
        const fileName = contact.pdf.trim();
        const filePath = path.join(PDF_FOLDER, fileName);
        const ext = path.extname(fileName).toLowerCase();
        
        if(fs.existsSync(filePath)){
          const buffer = fs.readFileSync(filePath);
          await sleep(1000); // small pause before sending file
          
          if(ext === '.jpg' || ext === '.jpeg'){
            // Send as image (JPG)
            await sock.sendMessage(jid, { image: buffer, caption: 'Attached Image' });
            console.log(`Sent JPG ${fileName} to ${phone}`);
          } else if(ext === '.png'){
            // Send as image (PNG)
            await sock.sendMessage(jid, { image: buffer, caption: 'Attached Image' });
            console.log(`Sent PNG ${fileName} to ${phone}`);
          } else if(ext === '.pdf'){
            // Send as PDF document
            await sock.sendMessage(jid, { document: buffer, fileName: fileName, mimetype: 'application/pdf', caption: 'Attached PDF report' });
            console.log(`Sent PDF ${fileName} to ${phone}`);
          } else {
            // Send as generic document
            await sock.sendMessage(jid, { document: buffer, fileName: fileName, caption: 'Attached file' });
            console.log(`Sent file ${fileName} to ${phone}`);
          }
          
          stats.daily_counts[jid] = (stats.daily_counts[jid]||0) + 1;
          globalSent++;
          await saveStats(stats);
        } else {
          console.log(`File for ${phone} not found at ${filePath}, skipping file.`);
        }
      }

      // after each contact wait random interval (rate limiting)
      const delay = randomBetween(minDelayMs, maxDelayMs);
      console.log(`Waiting ${(delay/1000).toFixed(1)}s before next contact...`);
      await sleep(delay);

    }catch(err){
      console.error('Error sending to', phone, err && err.message ? err.message : err);
      // on certain errors, you may want to stop or skip - here we skip and continue
      await sleep(2000);
      continue;
    }
  }

  console.log('Run complete. Summary: globalSent =', globalSent);
  process.exit(0);
}

start().catch(err=>{ console.error('Fatal error', err); process.exit(1); });
