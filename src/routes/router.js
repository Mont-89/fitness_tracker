const { respond } = require('../controllers/careController');

function createRouter(controller) {
  const routes = {
    'POST /api/auth/admin-login': controller.adminLogin,
    'GET /api/admin/integration-settings': controller.getIntegrationSettings,
    'POST /api/admin/integration-settings': controller.updateIntegrationSettings,
    'POST /api/admin/users': controller.createUser,
    'POST /api/auth/magic-login': controller.magicLogin,
    'GET /api/me': controller.me,
    'POST /api/me/pay-bill': controller.payBill,
    'POST /api/me/activities': controller.chooseActivity,
    'POST /api/me/contact-family': controller.contactFamily,
    'GET /api/admin/overview': controller.adminOverview
  };

  return async function router(req, res) {
    const key = `${req.method} ${req.url}`;
    const handler = routes[key];

    if (!handler) {
      respond(res, 404, { error: 'Not found' });
      return;
    }

    try {
      await handler(req, res);
    } catch (error) {
      respond(res, 400, { error: error.message });
    }
  };
}

module.exports = { createRouter };
