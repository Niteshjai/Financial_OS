const axios = require('axios');
require('dotenv').config({ path: '.env' });
async function run() {
  const url = 'https://dg-sandbox.setu.co/api/ekyc';
  const headers = {
    'x-client-id': process.env.SETU_OKYC_CLIENT_ID,
    'x-client-secret': process.env.SETU_OKYC_CLIENT_SECRET,
    'x-product-instance-id': 'b3c4d5e6-1234-5678-abcd-1234567890ab' // FAKE
  };
  try {
    await axios.post(url, {}, { headers });
  } catch(err) {
    console.log('FAKE ID: ' + err.response?.status + ' ' + JSON.stringify(err.response?.data));
  }
}
run();
