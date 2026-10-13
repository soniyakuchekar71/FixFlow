import { db } from 'hatchable';
export const access = 'user';
export default async function(req,res){try{const r=await db.query('SELECT id,actor,action,entity_type,entity_id,details,created_at FROM audit_events ORDER BY created_at DESC LIMIT 200');res.json({events:r.rows})}catch(e){res.status(500).json({error:'Could not load audit log',detail:String(e.message)})}}