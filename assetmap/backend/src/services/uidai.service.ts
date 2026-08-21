import axios from 'axios';
import https from 'https';
import fs from 'fs';
import path from 'path';

let uidaiCert: Buffer | undefined;

try {
  if (process.env.UIDAI_PUBLIC_CERT) {
    const certString = process.env.UIDAI_PUBLIC_CERT.replace(/\\n/g, '\n');
    uidaiCert = Buffer.from(certString);
  } else {
    const certPath = path.resolve(process.cwd(), 'certs/uidai_cert.cer');
    uidaiCert = fs.readFileSync(certPath);
  }
} catch (error) {
  console.warn(`[UIDAI Service] Could not load UIDAI public certificate from env or file.`);
}

// Create a custom HTTPS agent configured to use the certificate
export const uidaiHttpsAgent = new https.Agent({
  ca: uidaiCert,
  // UIDAI developer staging environment often uses a self-signed or NIC certificate chain
  // that Node.js doesn't natively trust. Setting this to false allows the connection in dev.
  rejectUnauthorized: process.env.NODE_ENV === 'production' ? true : false,
  // Note: If UIDAI requires mutual TLS (2-way SSL) in the future, 
  // you would attach your client private key or .p12/.pfx file here like this:
  // pfx: fs.readFileSync(path.resolve(process.cwd(), 'certs/client_cert.p12')),
  // passphrase: process.env.UIDAI_CERT_PASSWORD
});

/**
 * Makes a secure API call to the UIDAI servers using the downloaded certificate
 * 
 * @param endpoint The specific UIDAI API path (e.g., '/auth/2.5/public/0/0/')
 * @param xmlPayload The XML formatted request body
 * @returns The XML/JSON response from UIDAI
 */
export async function callUidaiApi(endpoint: string, xmlPayload: string) {
  try {
    const apiUrl = process.env.UIDAI_API_URL || 'https://developer.uidai.gov.in';
    const url = `${apiUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const response = await axios.post(
      url,
      xmlPayload,
      {
        httpsAgent: uidaiHttpsAgent, // Attach the custom agent with the certificate here
        headers: {
          'Content-Type': 'application/xml', // UIDAI expects XML
          'Accept': 'application/xml'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error("[UIDAI Service] API call failed:", error);
    throw error;
  }
}
