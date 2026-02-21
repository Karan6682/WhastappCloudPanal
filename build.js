/**
 * Build Script for WhatsApp Automation
 * Creates a production-ready dist folder
 * 
 * Usage: npm run build
 */

const fs = require('fs-extra');
const path = require('path');

const DIST_DIR = path.join(__dirname, 'dist');
const SOURCE_DIR = __dirname;

// Files and folders to copy
const FILES_TO_COPY = [
    'backend',
    'public',
    'uploads',
    'package.json',
    'README.md',
    'QuickStart.bat',
    'ServerStart.bat',
    'StopServer.bat'
];

// Files/folders to exclude
const EXCLUDE = [
    'node_modules',
    'dist',
    '.git',
    'whatsapp-sessions',
    'database.sqlite',
    'test-session',
    'New folder',
    'WhatsApp_Automation_Client',
    'WhatsApp_Client_Ready',
    'frontend',
    'backend-uploads',
    'pdfs',
    '*.md',
    'build.js'
];

async function build() {
    console.log('🔨 Building WhatsApp Automation...\n');
    
    try {
        // Step 1: Clean dist folder
        console.log('📁 Step 1: Cleaning dist folder...');
        if (await fs.pathExists(DIST_DIR)) {
            await fs.remove(DIST_DIR);
        }
        await fs.ensureDir(DIST_DIR);
        console.log('   ✅ Dist folder ready\n');
        
        // Step 2: Copy backend
        console.log('📁 Step 2: Copying backend...');
        await fs.copy(
            path.join(SOURCE_DIR, 'backend'),
            path.join(DIST_DIR, 'backend'),
            { filter: (src) => !src.includes('node_modules') }
        );
        console.log('   ✅ Backend copied\n');
        
        // Step 3: Copy public folder (frontend)
        console.log('📁 Step 3: Copying public (frontend)...');
        await fs.copy(
            path.join(SOURCE_DIR, 'public'),
            path.join(DIST_DIR, 'public')
        );
        console.log('   ✅ Public folder copied\n');
        
        // Step 4: Create empty folders
        console.log('📁 Step 4: Creating required folders...');
        await fs.ensureDir(path.join(DIST_DIR, 'uploads'));
        await fs.ensureDir(path.join(DIST_DIR, 'whatsapp-sessions'));
        console.log('   ✅ Folders created\n');
        
        // Step 5: Copy package.json
        console.log('📁 Step 5: Copying package.json...');
        await fs.copy(
            path.join(SOURCE_DIR, 'package.json'),
            path.join(DIST_DIR, 'package.json')
        );
        console.log('   ✅ package.json copied\n');
        
        // Step 6: Copy batch files
        console.log('📁 Step 6: Copying batch files...');
        const batFiles = ['QuickStart.bat', 'ServerStart.bat', 'StopServer.bat'];
        for (const bat of batFiles) {
            const src = path.join(SOURCE_DIR, bat);
            if (await fs.pathExists(src)) {
                await fs.copy(src, path.join(DIST_DIR, bat));
                console.log(`   ✅ ${bat} copied`);
            }
        }
        console.log('');
        
        // Step 7: Create README for dist
        console.log('📁 Step 7: Creating README...');
        const readme = `# WhatsApp Automation - Production Build

## Quick Start

1. Open terminal in this folder
2. Run: npm install
3. Run: npm start
4. Open: http://localhost:3001/app.html
5. Login: admin / admin123

## Files
- backend/ - Server code
- public/ - Frontend HTML
- uploads/ - Uploaded files
- whatsapp-sessions/ - WhatsApp session data

## Commands
- npm start - Start server
- npm run dev - Development mode

Built on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
`;
        await fs.writeFile(path.join(DIST_DIR, 'README.md'), readme);
        console.log('   ✅ README created\n');
        
        // Done!
        console.log('═══════════════════════════════════════════');
        console.log('✅ BUILD COMPLETE!');
        console.log('═══════════════════════════════════════════');
        console.log(`📂 Output: ${DIST_DIR}`);
        console.log('');
        console.log('📋 Next Steps:');
        console.log('   1. cd dist');
        console.log('   2. npm install');
        console.log('   3. npm start');
        console.log('   4. Open http://localhost:3001/app.html');
        console.log('═══════════════════════════════════════════\n');
        
    } catch (error) {
        console.error('❌ Build failed:', error.message);
        process.exit(1);
    }
}

build();
