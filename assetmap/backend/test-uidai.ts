import 'dotenv/config';
import { callUidaiApi } from './src/services/uidai.service';

async function testUidaiConnection() {
  console.log("------------------------------------------");
  console.log("Testing UIDAI API Connection...");
  console.log("API URL:", process.env.UIDAI_API_URL);
  console.log("------------------------------------------\n");

  // A minimal, mock XML payload to trigger a response from UIDAI
  // We aren't testing valid Aadhaar data, we just want to ensure the HTTPS 
  // connection is successfully trusted and we receive a response back.
  const dummyXml = `<?xml version="1.0" encoding="UTF-8"?>
<Auth uid="999999999999" rc="Y" tid="public" ac="public" sa="public" ver="2.5" txn="123456789" lk="${process.env.UIDAI_LICENSE_KEY || 'dummy'}">
    <Uses pi="n" pa="n" pfa="n" bio="n" bt="" pin="n" otp="y"/>
    <Skey ci="20260101">dummy_skey</Skey>
    <Data type="X">dummy_data</Data>
    <Hmac>dummy_hmac</Hmac>
</Auth>`;

  try {
    // 999999999999 is a dummy aadhaar number. 
    // Testing the OTP endpoint with the correct format: /otp/1.6/<ac>/<uid0>/<uid1>/<asalk>
    const licenseKey = process.env.UIDAI_LICENSE_KEY || 'dummy';
    const result = await callUidaiApi(`/otp/1.6/public/9/9/${licenseKey}`, dummyXml);
    
    console.log("✅ Connection Successful! Received response from UIDAI.");
    console.log(result);
    
  } catch (error: any) {
    if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || error.code === 'CERT_HAS_EXPIRED') {
      console.error("❌ Certificate Error! Node still doesn't trust the certificate.");
      console.error(error.message);
    } else if (error.response) {
      // If we get an error response with a status code, it means the SSL connection WORKED
      // and UIDAI simply rejected our dummy XML. This is a SUCCESS for the certificate test!
      console.log("✅ SSL Connection Successful!");
      console.log(`UIDAI server accepted the connection but rejected the dummy XML with status: ${error.response.status}`);
      console.log("Response Data:", error.response.data);
    } else {
      console.error("❌ Unexpected Error:", error.message);
    }
  }
}

testUidaiConnection();
