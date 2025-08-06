#!/usr/bin/env node

/**
 * Database Connection Validation Utility
 * Tests the database connection fixes independently
 */

import { initDatabase, healthCheck, closeDatabase } from './src/services/database.js';

console.log('🔍 Testing Database Connection Fixes...\n');

async function testDatabaseConnection() {
  try {
    console.log('1. Testing database initialization with retry logic...');
    await initDatabase();
    console.log('✅ Database initialization successful\n');

    console.log('2. Testing health check...');
    const health = await healthCheck();
    console.log('✅ Health check result:', health);
    console.log('');

    console.log('3. Testing graceful shutdown...');
    await closeDatabase();
    console.log('✅ Database closed successfully\n');

    console.log('🎉 All database connection tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    console.error('');
    console.log('This is expected if PostgreSQL is not running.');
    console.log('To test with PostgreSQL:');
    console.log('  1. docker-compose -f docker-compose.db.yml up postgres -d');
    console.log('  2. Wait for PostgreSQL to be ready');
    console.log('  3. node test-db-connection.js');
    process.exit(1);
  }
}

testDatabaseConnection();