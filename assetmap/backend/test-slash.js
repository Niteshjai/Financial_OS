const axios = require('axios');
require('dotenv').config({ path: '.env' });
async function run() {
  const urls = [
    'https://dg-sandbox.setu.co/api/ekyc',
    'https://dg-sandbox.setu.co/api/ekyc/'
  ];
  for(let u of urls) {
    try {
      const res = await axios.post(u, {redirection_url: 'http://loc'}, {
        headers: {
          'x-client-id': process.env.SETU_OKYC_CLIENT_ID,
          'x-client-secret': process.env.SETU_OKYC_CLIENT_SECRET,
          'x-product-instance-id': process.env.SETU_OKYC_PRODUCT_INSTANCE_ID
        }
      });
      console.log('SUCCESS ' + u);
    } catch(err) {
      console.log('FAIL ' + u + ' ' + err.response?.status);
      console.log(err.response?.data);
    }
  }
}
run();
