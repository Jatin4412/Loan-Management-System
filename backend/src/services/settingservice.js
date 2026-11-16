const db = require('../config/db');
const bcrypt = require('bcryptjs');

exports.getSettings = async (userId) => {
  const [rows] = await db.execute(
    `SELECT id, name, email, role, phone, status FROM users WHERE id = ? LIMIT 1`,
    [userId]
  );
  return rows[0];
};

exports.updateSettings = async (userId, data) => {
  const { name, email } = data;
  await db.execute(
    `UPDATE users SET name=?, email=? WHERE id=?`,
    [name, email, userId]
  );
  return true;
};

exports.updatePassword = async (userId, currentPassword, newPassword) => {
  const [rows] = await db.execute(`SELECT password FROM users WHERE id = ?`, [userId]);
  if (rows.length === 0) return { success: false, message: 'User not found' };

  const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
  if (!isMatch) {
    return { success: false, message: 'Incorrect current password' };
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  await db.execute(`UPDATE users SET password = ? WHERE id = ?`, [hashedPassword, userId]);
  return { success: true };
};