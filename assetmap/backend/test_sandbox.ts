import 'dotenv/config';
import axios from 'axios';

async function testSandboxApi() {
  const sandboxApiUrl = process.env.KYC_SANDBOX_API_URL || 'https://api.sandbox.co.in/kyc/aadhaar';
  const sandboxApiKey = process.env.KYC_SANDBOX_API_KEY || '';
  const sandboxApiSecret = process.env.KYC_SANDBOX_API_SECRET || '';

  console.log(`Using Sandbox API URL: ${sandboxApiUrl}`);
  console.log(`API Key set: ${!!sandboxApiKey}`);
  console.log(`API Secret set: ${!!sandboxApiSecret}`);

  try {
    console.log('\n--- Sending OTP Request ---');
    // Using provided Aadhaar number
    let otpResponse: any;
    try {
      const response = await axios.post(
        `${sandboxApiUrl}/okyc/otp`,
        {
          aadhaar_number: '676093140014',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': sandboxApiKey,
            'x-api-secret': sandboxApiSecret,
            'x-api-version': '1.0'
          },
          timeout: 10000,
        }
      );
      otpResponse = response;
      console.log('OTP Response Status:', response.status);
      console.log('OTP Response Data:', JSON.stringify(response.data, null, 2));
    } catch (err: any) {
      console.log('Real API failed! Error Details:', JSON.stringify(err.response?.data || err.message, null, 2));
      console.log('Falling back to mock sandbox response...');
      otpResponse = {
        data: {
          reference_id: 'mock_txn_123456',
          status: 'SUCCESS',
          message: 'OTP sent successfully (MOCK)'
        }
      };
      console.log('OTP Response Data:', JSON.stringify(otpResponse.data, null, 2));
    }

    const referenceId = otpResponse.data?.reference_id || otpResponse.data?.data?.reference_id;
    if (!referenceId) {
       console.log('No reference_id received. Cannot proceed to verification.');
       return;
    }

    console.log('\n--- Sending OTP Verify Request (Dummy OTP: 123456) ---');
    let verifyResponse: any;
    try {
      const vResp = await axios.post(
        `${sandboxApiUrl}/okyc/verify`,
        {
          reference_id: referenceId,
          otp: '123456',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': sandboxApiKey,
            'x-api-secret': sandboxApiSecret,
            'x-api-version': '1.0'
          },
          timeout: 10000,
        }
      );
      verifyResponse = vResp;
      console.log('Verify Response Status:', verifyResponse.status);
      console.log('Verify Response Data:', JSON.stringify(verifyResponse.data, null, 2));
    } catch (err: any) {
      console.log('Real API verify failed. Falling back to mock sandbox response...');
      verifyResponse = {
        data: {
          reference_id: referenceId,
          status: 'SUCCESS',
          message: 'Aadhaar verification successful',
          data: {
            UidData: {
              uid: 'XXXX-XXXX-0014',
              poi: {
                name: 'Arjun Kumar',
                dob: '1990-05-15',
                gender: 'M',
                fathers_name: 'Ravi Kumar',
                nationality: 'Indian'
              },
              poa: {
                house: 'Flat 402',
                street: 'MG Road',
                locality: 'Indiranagar',
                district: 'Bengaluru',
                state: 'Karnataka',
                pincode: '560038'
              },
              pht: 'base64_photo'
            }
          }
        }
      };
      console.log('Verify Response Data:', JSON.stringify(verifyResponse.data, null, 2));
    }

  } catch (error: any) {
    console.error('Test Script Error:', error.message);
  }
}

testSandboxApi();
