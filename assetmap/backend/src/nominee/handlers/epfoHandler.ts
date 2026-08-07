/**
 * EPFO Handler — Guided OTP Session
 * 
 * EPFO explicitly prohibits third-party credential usage.
 * We provide the user with a guided WebView session — they log in themselves,
 * and we show them step-by-step instructions with nominee data pre-copied.
 */

export interface GuidedSessionResult {
  sessionUrl:   string;
  instructions: string[];
}

export const epfoHandler = {

  prepareSession(): GuidedSessionResult {
    return {
      sessionUrl: 'https://unifiedportal-mem.epfindia.gov.in/memberinterface/',
      instructions: [
        'Log in with your UAN and password',
        'Click "Manage" in the top menu',
        'Select "E-Nomination"',
        'Click "Enter new nomination"',
        'Verify your profile details and click Proceed',
        'Enter nominee details — we have them ready for you below',
        'Complete e-sign with Aadhaar OTP',
        'Save the acknowledgement number',
      ],
    };
  },
};
