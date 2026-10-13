import { email } from 'hatchable';

export const access = 'user';
export const methods = ['POST'];

export default async function(req, res) {
  try {
    const user = req.user;
    if (!user || !user.email) return res.status(401).json({ error: 'Sign in with your email before sending a test.' });
    const recipient = String(user.email).trim().toLowerCase();
    const result = await email.send({
      to: recipient,
      subject: 'FixFlow email delivery test',
      html: '<h2>FixFlow email test</h2><p>Your FixFlow account is signed in and the transactional email provider accepted a test message for this address.</p><p>If this message arrives in your inbox, outbound delivery is working for your account.</p>',
      text: 'FixFlow email test. Your FixFlow account is signed in and the transactional email provider accepted a test message for this address. If this arrives in your inbox, outbound delivery is working for your account.'
    });
    return res.json({ ok: true, recipient, status: 'Accepted by email provider', messageId: result?.message_id || result?.ses_message_id || null, note: 'Provider acceptance is not proof of inbox delivery; check the recipient inbox and spam folder.' });
  } catch (error) {
    return res.status(502).json({ error: 'Email provider could not send the test message.', detail: String(error.message || error).slice(0,300) });
  }
}