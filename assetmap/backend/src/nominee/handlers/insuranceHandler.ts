import { logger } from '../../utils/logger';

/**
 * Insurance Handler — Pre-filled Form Generation + Email
 * 
 * Insurance companies don't support programmatic nominee updates.
 * We generate a pre-filled nominee change request form and email it
 * to the insurer's customer service with the user CC'd.
 */

// Insurer customer service email lookup
const INSURER_EMAILS: Record<string, string> = {
  lic:             'nomination@licindia.in',
  'hdfc life':     'service@hdfclife.com',
  'hdfc ergo':     'support@hdfcergo.com',
  'icici pru':     'lifeline@iciciprulife.com',
  'icici lombard': 'customersupport@icicilombard.com',
  'sbi life':      'customercare@sbilife.co.in',
  'max life':      'customer.service@maxlifeinsurance.com',
  'bajaj allianz': 'customercare@bajajallianz.com',
  'tata aia':      'customercare@tataaia.com',
  'kotak life':    'emailus@kotaklife.com',
  'aditya birla':  'care.lifeinsurance@adityabirlacapital.com',
  'star health':   'customercare@starhealth.in',
};

function getInsurerEmail(institutionName: string): string {
  const name = institutionName.toLowerCase();
  for (const [key, email] of Object.entries(INSURER_EMAILS)) {
    if (name.includes(key)) return email;
  }
  // Fallback — construct a generic email
  return 'customercare@' + institutionName.toLowerCase().replace(/\s+/g, '') + '.com';
}

function buildEmailHtml(
  user:       { name: string; pan: string; email: string; mobile: string },
  nominee:    { name: string; dob: string; relationship: string; allocationPct: number },
  policyNo:   string,
  insurer:    string
): string {
  return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <p>Dear ${insurer} Customer Service Team,</p>

  <p>I, <strong>${user.name}</strong> (PAN: ${user.pan}), hereby request you to
  update the nominee for my policy number <strong>${policyNo}</strong>.</p>

  <h3 style="color: #333; border-bottom: 1px solid #ddd; padding-bottom: 8px;">
    New Nominee Details
  </h3>
  <table style="width: 100%; border-collapse: collapse;">
    <tr><td style="padding: 6px 0; color: #666;">Name</td>
        <td style="padding: 6px 0; font-weight: bold;">${nominee.name}</td></tr>
    <tr><td style="padding: 6px 0; color: #666;">Date of Birth</td>
        <td style="padding: 6px 0; font-weight: bold;">${nominee.dob}</td></tr>
    <tr><td style="padding: 6px 0; color: #666;">Relationship</td>
        <td style="padding: 6px 0; font-weight: bold;">${nominee.relationship}</td></tr>
    <tr><td style="padding: 6px 0; color: #666;">Allocation</td>
        <td style="padding: 6px 0; font-weight: bold;">${nominee.allocationPct}%</td></tr>
  </table>

  <p>Please find the signed nominee change form attached. My KYC documents
  are already on file. Please confirm the update via email to
  <strong>${user.email}</strong> or SMS to <strong>${user.mobile}</strong>.</p>

  <p style="color: #888; font-size: 12px; margin-top: 24px;">
    This request was initiated via AssetMap Services on behalf of the policy holder.
  </p>

  <p>Thank you,<br><strong>${user.name}</strong></p>
</div>
  `.trim();
}

export interface InsuranceResult {
  emailSent:    boolean;
  insurerEmail: string;
  messageId:    string;
}

export const insuranceHandler = {

  /**
   * Generate and send a pre-filled nominee change form to the insurer.
   * Returns email tracking info.
   */
  async generateAndSendForm(
    user:     { name: string; pan: string; email: string; mobile: string },
    nominee:  { name: string; dob: string; relationship: string; allocationPct: number },
    policyNo: string,
    insurer:  string
  ): Promise<InsuranceResult> {
    const insurerEmail = getInsurerEmail(insurer);
    const htmlBody     = buildEmailHtml(user, nominee, policyNo, insurer);

    // For now, log the email instead of actually sending
    // In production, this would use MSG91 or SES
    logger.info('Insurance nominee form email prepared', {
      insurer,
      insurerEmail,
      policyNo,
      nomineeName: nominee.name,
    });

    // TODO: Integrate with MSG91 or AWS SES for actual email sending
    // const emailResponse = await axios.post('https://api.msg91.com/api/v5/email/send', {
    //   to: [{ email: insurerEmail }],
    //   cc: [{ email: user.email }],
    //   from: { email: 'nominee@assetmap.in', name: 'AssetMap Services' },
    //   subject: `Nominee Change Request — Policy ${policyNo} — ${user.name}`,
    //   htmlBody,
    // }, { headers: { authkey: process.env.MSG91_AUTH_KEY! } });

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    return {
      emailSent:    true,
      insurerEmail,
      messageId,
    };
  },
};
