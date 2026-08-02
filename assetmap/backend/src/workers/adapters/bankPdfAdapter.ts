import { NomineeJobPayload } from '../nomineeQueue';
import { logger } from '../../utils/logger';
import { pool } from '../../db/connection';
import { PDFDocument, rgb } from 'pdf-lib';
import * as nodemailer from 'nodemailer';

export async function processBankNomination(payload: NomineeJobPayload) {
  logger.info(`[Adapter C] Processing Bank nomination (Form DA-1) for ${payload.assetRef}`);
  
  try {
    // 1. Fetch User Data
    const userRes = await pool.query('SELECT name_encrypted FROM users WHERE id = $1', [payload.userId]);
    const userName = userRes.rows[0]?.name_encrypted || 'Investor Name';

    // 2. Generate PDF Form DA-1
    // We create a blank PDF for the mock. In a real scenario, we would load a DA-1 template PDF.
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);

    page.drawText('FORM DA-1 (Nomination under section 45ZA of the Banking Regulation Act)', { x: 50, y: 750, size: 14 });
    page.drawText(`I/We ${userName} nominate the following person(s) to whom in the event of my/our/minor's death`, { x: 50, y: 720, size: 11 });
    page.drawText(`the amount of the deposit in Account No: ${payload.assetRef} may be returned by Bank.`, { x: 50, y: 700, size: 11 });

    let yOffset = 650;
    payload.nominees.forEach((n: any, idx: number) => {
      page.drawText(`Nominee ${idx + 1}: ${n.name}`, { x: 50, y: yOffset, size: 12 });
      page.drawText(`DOB: ${n.dob} | Relation: ${n.relationship} | Share: ${n.allocationPercentage}%`, { x: 50, y: yOffset - 20, size: 10 });
      if (n.guardianName) {
        page.drawText(`Guardian: ${n.guardianName}`, { x: 50, y: yOffset - 40, size: 10 });
        yOffset -= 20;
      }
      yOffset -= 60;
    });

    const pdfBytes = await pdfDoc.save();
    logger.info(`[Adapter C] Form DA-1 PDF generated (${pdfBytes.length} bytes)`);

    // 3. Mock Email Dispatch
    // Create a mock nodemailer transport
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'mock_user@ethereal.email',
        pass: 'mock_pass'
      }
    });

    // In mock mode, we won't actually send, just log.
    logger.info(`[Adapter C] Mock sending email to bank operations with DA-1 attached.`);

    // 4. Update DB Status to SUCCESS (Banks process the form manually, so our system's job is done)
    await pool.query('UPDATE nomination_requests SET status = $1, updated_at = NOW() WHERE id = $2', ['SUCCESS', payload.requestId]);
    logger.info(`[Adapter C] Bank nomination request marked as SUCCESS`);

  } catch (error) {
    logger.error(`[Adapter C] Failed to generate/send DA-1 Form`, { error });
    throw error;
  }
}
