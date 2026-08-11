const axios = require('axios');
require('dotenv').config();

const SETU_DG_BASE_URL = 'https://dg-sandbox.setu.co';

async function test() {
  console.log("Testing Setu DigiLocker API directly using your .env credentials...");
  try {
    const response = await axios.post(
      `${SETU_DG_BASE_URL}/api/digilocker`,
      {
        redirectUrl: process.env.DIGILOCKER_REDIRECT_URI || 'http://localhost:3000/api/digilocker/callback',
      },
      { 
        headers: {
          'x-client-id': process.env.DIGILOCKER_CLIENT_ID,
          'x-client-secret': process.env.DIGILOCKER_CLIENT_SECRET,
          'x-product-instance-id': process.env.DIGILOCKER_PRODUCT_INSTANCE_ID,
          'Content-Type': 'application/json'
        },
        timeout: 15000 
      }
    );
    
    console.log("Success! Bridge URL generated:", response.data.url);
    console.log("Session ID:", response.data.id);
  } catch (err) {
    if (err.response) {
      console.error("Setu API Error:");
      console.error(JSON.stringify(err.response.data, null, 2));
    } else {
      console.error("Local Error:", err.message);
    }
  }
}

test();
