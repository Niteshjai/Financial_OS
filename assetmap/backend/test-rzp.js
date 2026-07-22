const axios = require('axios');
require('dotenv').config();

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');

async function testRazorpay() {
  console.log('Testing with key:', RAZORPAY_KEY_ID);
  
  try {
    const res = await axios.get('https://api.razorpay.com/v1/customers', {
      headers: { Authorization: `Basic ${auth}` }
    });
    console.log('Customers API Success! Code:', res.status);
  } catch (err) {
    console.error('Customers API Failed:', err.response?.status, err.response?.data);
  }

  try {
    const res2 = await axios.get('https://api.razorpay.com/v1/plans', {
      headers: { Authorization: `Basic ${auth}` }
    });
    console.log('Plans API Success! Code:', res2.status);
  } catch (err) {
    console.error('Plans API Failed:', err.response?.status, err.response?.data);
  }
}

testRazorpay();
