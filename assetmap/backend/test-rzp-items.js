const axios = require('axios');
require('dotenv').config();

const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');

async function testRazorpayItems() {
  try {
    const res = await axios.post('https://api.razorpay.com/v1/items', {
      name: "AssetMap Plus (monthly)",
      amount: 19900,
      currency: "INR",
      description: "AssetMap Plus plan - monthly billing"
    }, {
      headers: { Authorization: `Basic ${auth}` }
    });
    console.log('POST Items Success!', res.data);
  } catch (err) {
    console.error('POST Items Failed:', err.response?.status, err.response?.data);
  }
}

testRazorpayItems();
