const axios = require('axios');
require('dotenv').config({ path: 'backend/.env' });

const endpoints = [
  'https://dg-sandbox.setu.co/api/okyc',
  'https://dg-sandbox.setu.co/api/v1/okyc',
  'https://dg-sandbox.setu.co/api/v1/ekyc',
  'https://dg-sandbox.setu.co/api/v2/ekyc',
  'https://dg-sandbox.setu.co/api/v2/okyc',
  'https://dg-sandbox.setu.co/api/okyc/ekyc',
  'https://dg-sandbox.setu.co/api/v1/okyc/ekyc',
  'https://dg-sandbox.setu.co/api/ekyc',
];

async function test() {
  for (const url of endpoints) {
    try {
      console.log(`Testing ${url}...`);
      const res = await axios.post(url, { redirection_url: 'http://localhost:5173' }, {
        headers: {
          'x-client-id': process.env.SETU_OKYC_CLIENT_ID,
          'x-client-secret': process.env.SETU_OKYC_CLIENT_SECRET,
          'x-product-instance-id': process.env.SETU_OKYC_PRODUCT_INSTANCE_ID
        }
      });
      console.log(`✅ SUCCESS: ${url} ->`, res.status);
    } catch (err) {
      console.log(`❌ FAILED: ${url} ->`, err.response?.status, err.response?.data?.error?.code || err.message);
    }
  }
}

test();
