const axios = require('axios');
require('dotenv').config();
const { getAuthorizationUrl, fetchDocuments } = require('./dist/services/digilocker');

async function test() {
  try {
    console.log("Testing Setu DigiLocker getAuthorizationUrl...");
    // Let's see if the Setu API responds correctly given the keys in .env
    const url = await getAuthorizationUrl('test_state_123');
    console.log("Success! Bridge URL generated:", url);
  } catch (err) {
    console.error("Error testing DigiLocker:", err);
  }
}

test();
