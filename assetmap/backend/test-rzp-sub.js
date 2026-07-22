const axios = require('axios');
require('dotenv').config();

const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');

async function testRazorpaySubscription() {
  try {
    const res = await axios.post('https://api.razorpay.com/v1/subscriptions', {
      plan_id: 'item_TGT0nhGQ3FHZGh',
      total_count: 12,
      quantity: 1,
      customer_notify: 1
    }, {
      headers: { Authorization: `Basic ${auth}` }
    });
    console.log('POST Subscription Success!', res.data.id);
  } catch (err) {
    console.error('POST Subscription Failed:', err.response?.status, err.response?.data);
  }
}

testRazorpaySubscription();
