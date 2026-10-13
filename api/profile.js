import { db, auth } from 'hatchable';

export const access = 'user';
export const methods = ['GET'];

export default async function(req, res) {
  try {
    const user = await auth.getUser(req);
    if (!user || !user.email) return res.status(401).json({ error: 'Sign in with a verified email to continue.' });
    const email = String(user.email).trim().toLowerCase();
    const suppliedName = String(user.name || '').trim();
    const name = suppliedName || email.split('@')[0].replace(/[._+-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).slice(0, 100);
    let result = await db.query('SELECT id,name,email,company,created_at FROM customers WHERE lower(email)=lower($1) LIMIT 1', [email]);
    if (!result.rows.length) {
      try {
        result = await db.query('INSERT INTO customers(name,email,company) VALUES($1,$2,$3) RETURNING id,name,email,company,created_at', [name, email, null]);
      } catch (error) {
        if (!String(error.message || error).toLowerCase().includes('duplicate') && !String(error.message || error).toLowerCase().includes('unique')) throw error;
        result = await db.query('SELECT id,name,email,company,created_at FROM customers WHERE lower(email)=lower($1) LIMIT 1', [email]);
      }
    }
    return res.json({ user: { id: user.id, email, name }, customer: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: 'Could not initialize your FixFlow profile.', detail: String(error.message || error).slice(0, 240) });
  }
}