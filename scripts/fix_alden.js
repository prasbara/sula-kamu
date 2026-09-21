import { getDatabase } from '../dist/database/db.js';

const db = getDatabase();
const userId = '091f2018-1173-4cc5-aca8-f52844fce601';

db.prepare(`
  UPDATE profiles 
  SET display_name = 'Alden', updated_at = datetime('now') 
  WHERE user_id = ?
`).run(userId);

const updated = db.prepare(`
  SELECT p.*, i.name as inst_name, i.short_name as inst_short 
  FROM profiles p 
  JOIN institutions i ON i.id = p.institution_id 
  WHERE p.user_id = ?
`).get(userId);

console.log('Successfully updated Alden profile:', updated);
