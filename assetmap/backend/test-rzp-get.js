const axios = require('axios');
require('dotenv').config();

const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');

async function testRazorpay() {
  try {
    const res = await axios.get('https://api.razorpay.com/v1/plans', {
      headers: { Authorization: `Basic ${auth}` }
    });
    console.log('GET Plans Success!', res.data.items.length, 'plans found.');
  } catch (err) {
    console.error('GET Plans Failed:', err.response?.status, err.response?.data);
  }
}

testRazorpay();
