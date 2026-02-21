/**
 * Migration Script: SQLite to MSSQL
 * This script migrates all data from SQLite to SQL Server
 * 
 * Usage: node migrate-to-mssql.js
 */

const fs = require('fs');
const initSqlJs = require('sql.js');
const mssql = require('mssql');
const config = require('./config');

async function migrate() {
    console.log('🔄 Starting SQLite to MSSQL Migration...\n');
    
    let sqliteDb = null;
    let mssqlPool = null;
    
    try {
        // Step 1: Connect to SQLite
        console.log('📁 Step 1: Connecting to SQLite...');
        const SQL = await initSqlJs();
        if (fs.existsSync(config.DATABASE.PATH)) {
            const fileBuffer = fs.readFileSync(config.DATABASE.PATH);
            sqliteDb = new SQL.Database(fileBuffer);
            console.log('   ✅ SQLite connected\n');
        } else {
            console.log('   ❌ SQLite database file not found!');
            return;
        }
        
        // Step 2: Connect to MSSQL
        console.log('📁 Step 2: Connecting to MSSQL...');
        mssqlPool = await mssql.connect(config.MSSQL);
        console.log(`   ✅ MSSQL connected: ${config.MSSQL.server}\n`);
        
        // Step 3: Create tables in MSSQL
        console.log('📁 Step 3: Creating tables in MSSQL...');
        await createMSSQLTables(mssqlPool);
        console.log('   ✅ Tables created\n');
        
        // Step 4: Migrate Users
        console.log('📁 Step 4: Migrating users...');
        const usersResult = sqliteDb.exec('SELECT * FROM users');
        if (usersResult.length > 0) {
            let userCount = 0;
            for (const row of usersResult[0].values) {
                const [id, username, password, msg_limit, msg_used, is_admin, created_at] = row;
                
                // Check if user exists
                const existing = await mssqlPool.request()
                    .input('username', mssql.NVarChar, username)
                    .query('SELECT * FROM users WHERE username = @username');
                
                if (existing.recordset.length === 0) {
                    await mssqlPool.request()
                        .input('username', mssql.NVarChar, username)
                        .input('password', mssql.NVarChar, password)
                        .input('msg_limit', mssql.Int, msg_limit)
                        .input('msg_used', mssql.Int, msg_used)
                        .input('is_admin', mssql.Int, is_admin)
                        .input('created_at', mssql.DateTime, new Date(created_at))
                        .query('INSERT INTO users (username, password, msg_limit, msg_used, is_admin, created_at) VALUES (@username, @password, @msg_limit, @msg_used, @is_admin, @created_at)');
                    userCount++;
                }
            }
            console.log(`   ✅ ${userCount} users migrated\n`);
        } else {
            console.log('   ⚠️ No users found\n');
        }
        
        // Step 5: Migrate Message History
        console.log('📁 Step 5: Migrating message history...');
        const historyResult = sqliteDb.exec('SELECT * FROM message_history ORDER BY id');
        if (historyResult.length > 0) {
            let msgCount = 0;
            for (const row of historyResult[0].values) {
                const [id, username, phone, message, msg_type, status, error_msg, created_at] = row;
                
                await mssqlPool.request()
                    .input('username', mssql.NVarChar, username)
                    .input('phone', mssql.NVarChar, phone)
                    .input('message', mssql.NVarChar, message || '')
                    .input('msg_type', mssql.NVarChar, msg_type)
                    .input('status', mssql.NVarChar, status)
                    .input('error_msg', mssql.NVarChar, error_msg || '')
                    .input('created_at', mssql.DateTime, new Date(created_at))
                    .query('INSERT INTO message_history (username, phone, message, msg_type, status, error_msg, created_at) VALUES (@username, @phone, @message, @msg_type, @status, @error_msg, @created_at)');
                msgCount++;
                
                if (msgCount % 10 === 0) {
                    process.stdout.write(`   Migrated ${msgCount} messages...\r`);
                }
            }
            console.log(`   ✅ ${msgCount} messages migrated\n`);
        } else {
            console.log('   ⚠️ No messages found\n');
        }
        
        // Step 6: Migrate API Limits
        console.log('📁 Step 6: Migrating API limits...');
        const apiResult = sqliteDb.exec('SELECT * FROM api_limits');
        if (apiResult.length > 0) {
            let apiCount = 0;
            for (const row of apiResult[0].values) {
                const [id, api_key, msg_limit, msg_used, is_active, created_at, updated_at] = row;
                
                // Check if API key exists
                const existing = await mssqlPool.request()
                    .input('api_key', mssql.NVarChar, api_key)
                    .query('SELECT * FROM api_limits WHERE api_key = @api_key');
                
                if (existing.recordset.length === 0) {
                    await mssqlPool.request()
                        .input('api_key', mssql.NVarChar, api_key)
                        .input('msg_limit', mssql.Int, msg_limit)
                        .input('msg_used', mssql.Int, msg_used)
                        .input('is_active', mssql.Int, is_active)
                        .input('created_at', mssql.DateTime, new Date(created_at))
                        .input('updated_at', mssql.DateTime, new Date(updated_at))
                        .query('INSERT INTO api_limits (api_key, msg_limit, msg_used, is_active, created_at, updated_at) VALUES (@api_key, @msg_limit, @msg_used, @is_active, @created_at, @updated_at)');
                    apiCount++;
                }
            }
            console.log(`   ✅ ${apiCount} API limits migrated\n`);
        } else {
            console.log('   ⚠️ No API limits found\n');
        }
        
        // Step 7: Migrate App Settings
        console.log('📁 Step 7: Migrating app settings...');
        const settingsResult = sqliteDb.exec('SELECT * FROM app_settings');
        if (settingsResult.length > 0) {
            let settingCount = 0;
            for (const row of settingsResult[0].values) {
                const [id, setting_key, setting_value, updated_at] = row;
                
                // Check if setting exists
                const existing = await mssqlPool.request()
                    .input('key', mssql.NVarChar, setting_key)
                    .query('SELECT * FROM app_settings WHERE setting_key = @key');
                
                if (existing.recordset.length === 0) {
                    await mssqlPool.request()
                        .input('key', mssql.NVarChar, setting_key)
                        .input('value', mssql.NVarChar, setting_value)
                        .input('updated_at', mssql.DateTime, new Date(updated_at))
                        .query('INSERT INTO app_settings (setting_key, setting_value, updated_at) VALUES (@key, @value, @updated_at)');
                    settingCount++;
                }
            }
            console.log(`   ✅ ${settingCount} settings migrated\n`);
        } else {
            console.log('   ⚠️ No settings found\n');
        }
        
        // Done!
        console.log('═══════════════════════════════════════════');
        console.log('✅ MIGRATION COMPLETE!');
        console.log('═══════════════════════════════════════════');
        console.log(`📊 Summary:`);
        console.log(`   - Server: ${config.MSSQL.server}`);
        console.log(`   - Database: ${config.MSSQL.database}`);
        console.log('═══════════════════════════════════════════\n');
        
    } catch (error) {
        console.error('❌ Migration Error:', error.message);
        console.error(error);
    } finally {
        if (mssqlPool) {
            await mssqlPool.close();
        }
    }
}

async function createMSSQLTables(pool) {
    // Users table
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
        CREATE TABLE users (
            id INT IDENTITY(1,1) PRIMARY KEY,
            username NVARCHAR(100) UNIQUE NOT NULL,
            password NVARCHAR(255) NOT NULL,
            msg_limit INT DEFAULT 100,
            msg_used INT DEFAULT 0,
            is_admin INT DEFAULT 0,
            created_at DATETIME DEFAULT GETDATE()
        )
    `);
    
    // Message history table
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='message_history' AND xtype='U')
        CREATE TABLE message_history (
            id INT IDENTITY(1,1) PRIMARY KEY,
            username NVARCHAR(100) NOT NULL,
            phone NVARCHAR(50) NOT NULL,
            message NVARCHAR(MAX),
            msg_type NVARCHAR(50) DEFAULT 'text',
            status NVARCHAR(50) DEFAULT 'sent',
            error_msg NVARCHAR(MAX),
            created_at DATETIME DEFAULT GETDATE()
        )
    `);
    
    // API Limits table
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='api_limits' AND xtype='U')
        CREATE TABLE api_limits (
            id INT IDENTITY(1,1) PRIMARY KEY,
            api_key NVARCHAR(255) UNIQUE NOT NULL,
            msg_limit INT DEFAULT 1000,
            msg_used INT DEFAULT 0,
            is_active INT DEFAULT 1,
            created_at DATETIME DEFAULT GETDATE(),
            updated_at DATETIME DEFAULT GETDATE()
        )
    `);
    
    // App Settings table
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='app_settings' AND xtype='U')
        CREATE TABLE app_settings (
            id INT IDENTITY(1,1) PRIMARY KEY,
            setting_key NVARCHAR(100) UNIQUE NOT NULL,
            setting_value NVARCHAR(MAX) NOT NULL,
            updated_at DATETIME DEFAULT GETDATE()
        )
    `);
}

// Run migration
migrate();
