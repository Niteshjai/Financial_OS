require('dotenv').config();
const twilio = require('twilio');

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

async function test() {
  console.log("Testing Twilio SMS...");
  
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.error("Missing Twilio credentials in .env");
    process.exit(1);
  }

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  try {
    // Send a message to the same Twilio number (or a verified number if on trial)
    // Twilio requires you to send to a verified number when on a trial account.
    // For this test, we'll try sending to a dummy number to see if the API authenticates
    // or just let the API return the error about the number not being verified.
    // Replace with your real phone number to test actual delivery.
    const message = await client.messages.create({
      body: 'AssetMap Alert: This is a test message from Twilio integration!',
      from: TWILIO_PHONE_NUMBER,
      to: '+919999999999' // Dummy Indian number
    });

    console.log("Success! Message SID:", message.sid);
  } catch (err) {
    console.error("Twilio API Error:");
    console.error(err.message);
  }
}

test();
