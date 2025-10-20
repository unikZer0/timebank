#!/usr/bin/env node

/**
 * Test script to create rich menus for TimeBank
 * Run this script to create the default rich menus including the new accepted jobs menu
 */

import { createDefaultRichMenus, clearAllRichMenus } from './src/services/richMenuService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testRichMenuCreation() {
  try {
    console.log('🚀 Starting rich menu creation test...');
    console.log('');

    // Check if LINE credentials are configured
    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
      console.error('❌ LINE_CHANNEL_ACCESS_TOKEN not found in environment variables');
      console.log('Please add your LINE Channel Access Token to the .env file');
      process.exit(1);
    }

    console.log('✅ LINE credentials found');
    console.log('');

    // Clear all existing rich menus first
    console.log('🧹 Clearing all existing rich menus...');
    await clearAllRichMenus();
    console.log('');

    // Create default rich menus
    console.log('🎯 Creating fresh rich menu...');
    const result = await createDefaultRichMenus();
    
    console.log('');
    console.log('🎉 Rich menu creation completed successfully!');
    console.log('');
    console.log('📋 Rich Menu ID:');
    console.log(`   ${result.richMenuId}`);
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Add this ID to your .env file:');
    console.log(`   LINE_MATCHED_RICH_MENU_ID=${result.richMenuId}`);
    console.log('');
    console.log('2. Upload an image for the rich menu using the LINE API or admin panel');
    console.log('3. Test the rich menu functionality by accepting a job application');
    console.log('');
    console.log('💡 This single rich menu will be used for all job-related actions!');
    console.log('');

  } catch (error) {
    console.error('❌ Error creating rich menus:', error.message);
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Check your LINE_CHANNEL_ACCESS_TOKEN is correct');
    console.error('2. Ensure your LINE bot has the necessary permissions');
    console.error('3. Check your internet connection');
    process.exit(1);
  }
}

// Run the test
testRichMenuCreation();
