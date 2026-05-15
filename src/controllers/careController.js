function respond(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (_error) {
        reject(new Error('Invalid JSON payload'));
      }
    });
  });
}

function authToken(req) {
  const raw = req.headers.authorization || '';
  return raw.startsWith('Bearer ') ? raw.slice(7) : null;
}

function createCareController(service) {
  return {
    async adminLogin(req, res) {
      respond(res, 200, service.adminLogin(await parseBody(req)));
    },
    async updateIntegrationSettings(req, res) {
      respond(res, 200, service.updateIntegrationSettings(authToken(req), await parseBody(req)));
    },
    async getIntegrationSettings(req, res) {
      respond(res, 200, service.getIntegrationSettings(authToken(req)));
    },
    async createUser(req, res) {
      respond(res, 201, await service.adminCreateUser(authToken(req), await parseBody(req)));
    },
    async magicLogin(req, res) {
      respond(res, 200, service.magicLogin(await parseBody(req)));
    },
    async me(req, res) {
      respond(res, 200, service.me(authToken(req)));
    },
    async payBill(req, res) {
      respond(res, 200, await service.payBill(authToken(req), await parseBody(req)));
    },
    async chooseActivity(req, res) {
      respond(res, 200, service.chooseActivity(authToken(req), await parseBody(req)));
    },
    async contactFamily(req, res) {
      respond(res, 200, service.contactFamily(authToken(req), await parseBody(req)));
    },
    async adminOverview(req, res) {
      respond(res, 200, service.adminOverview(authToken(req)));
    }
  };
}

module.exports = { createCareController, respond };
