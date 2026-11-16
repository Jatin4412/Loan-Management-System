const settingsService = require('../services/settingservice');

exports.getSettings = async (req, res, next) => {
  try {
    const userId = req.user.id; 
    const settings = await settingsService.getSettings(userId);
    res.json({ success: true, settings });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await settingsService.updateSettings(userId, req.body);
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    
    const result = await settingsService.updatePassword(userId, currentPassword, newPassword);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};