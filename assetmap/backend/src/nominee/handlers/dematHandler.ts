/**
 * Demat Handler — Guided OTP Session
 * 
 * CDSL/NSDL depository participants require the user to
 * log in and complete OTP verification themselves.
 */

export interface GuidedSessionResult {
  sessionUrl:   string;
  instructions: string[];
}

export const dematHandler = {

  prepareSession(institutionName: string): GuidedSessionResult {
    const name = institutionName.toLowerCase();

    let sessionUrl = 'https://web.cdslindia.com/myeasi/home/login';

    // Try to match specific broker/DP portals
    if (name.includes('zerodha'))  sessionUrl = 'https://console.zerodha.com/';
    if (name.includes('groww'))    sessionUrl = 'https://groww.in/';
    if (name.includes('angel'))    sessionUrl = 'https://www.angelone.in/';
    if (name.includes('upstox'))   sessionUrl = 'https://upstox.com/';
    if (name.includes('5paisa'))   sessionUrl = 'https://www.5paisa.com/';
    if (name.includes('iifl'))     sessionUrl = 'https://www.iiflsecurities.com/';
    if (name.includes('motilal'))  sessionUrl = 'https://www.motilaloswal.com/';
    if (name.includes('sharekhan')) sessionUrl = 'https://www.sharekhan.com/';

    return {
      sessionUrl,
      instructions: [
        'Log in to your broker app or CDSL easi portal',
        'Go to "Profile" → "Nominee"',
        'Click "Add Nominee" or "Update Nominee"',
        'Enter nominee details — we have them ready for you below',
        'Complete OTP verification',
        'Download and save the nomination acknowledgement',
      ],
    };
  },
};
