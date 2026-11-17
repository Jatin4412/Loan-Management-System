const assistantService = require('../services/assistantservice');

exports.chat = async (req, res, next) => {
  try {
    const body = req.body || {};
    const message = body.message;

    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A message is required.'
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Message is too long. Keep it under 2,000 characters.'
      });
    }

    const result = await assistantService.chat({
      message,
      history: body.history,
      pageView: body.pageContext && body.pageContext.view,
      sessionId: body.sessionId,
      requesterId: req.user.id
    });

    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    return next(error);
  }
};