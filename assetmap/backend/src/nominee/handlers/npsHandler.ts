/**
 * NPS Handler — Guided OTP Session
 * 
 * NPS CRA (Central Recordkeeping Agency) requires the user to log in
 * and complete OTP verification themselves. We provide guided instructions.
 */

export interface GuidedSessionResult {
  sessionUrl:   string;
  instructions: string[];
}

export const npsHandler = {

  prepareSession(): GuidedSessionResult {
    return {
      sessionUrl: 'https://cra-nsdl.com/CRA/',
      instructions: [
        'Log in with your PRAN and password',
        'Go to "Subscriber Corner" → "Nomination"',
        'Click "Update Nomination"',
        'Enter nominee details — we have them ready for you below',
        'Complete OTP verification',
        'Submit and save the confirmation',
      ],
    };
  },
};
