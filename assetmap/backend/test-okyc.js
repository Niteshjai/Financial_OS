const axios = require('axios');
require('dotenv').config({ path: '.env' });
async function run() {
  const urls = ['https://dg-sandbox.setu.co/api/okyc', 'https://dg-sandbox.setu.co/api/okyc/ekyc'];
  for(let u of urls) {
    try {
      await axios.post(u, {}, {
        headers: {
          'x-client-id': process.env.SETU_OKYC_CLIENT_ID,
          'x-client-secret': process.env.SETU_OKYC_CLIENT_SECRET,
          'x-product-instance-id': process.env.SETU_OKYC_PRODUCT_INSTANCE_ID
        }
      });
      console.log('SUCCESS ' + u);
    } catch(err) {
      console.log('FAIL ' + u + ' ' + err.response?.status + ' ' + JSON.stringify(err.response?.data));
    }
  }
}
run();
