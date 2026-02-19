const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { createApp } = require('../src/app');

function request(server, method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = payload
      ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      : {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const req = http.request({ method, path, port: server.address().port, host: '127.0.0.1', headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const isJson = (res.headers['content-type'] || '').includes('application/json');
        resolve({ status: res.statusCode, body: isJson && data ? JSON.parse(data) : data });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

test('login-first role-based flow with admin provisioning, email logs, and payment gateway charge', async () => {
  const app = createApp();
  await new Promise((resolve) => app.listen(0, resolve));

  const home = await request(app, 'GET', '/');
  assert.equal(home.status, 200);

  const adminLogin = await request(app, 'POST', '/api/auth/admin-login', {
    email: 'owner@newlands.com',
    password: 'admin123'
  });
  assert.equal(adminLogin.status, 200);

  const adminToken = adminLogin.body.token;

  const updatedSettings = await request(
    app,
    'POST',
    '/api/admin/integration-settings',
    {
      adminName: 'Owner Name',
      adminEmail: 'owner@newlands.com',
      adminPhone: '+250700000000',
      emailApiUrl: '',
      paymentGatewayUrl: ''
    },
    adminToken
  );
  assert.equal(updatedSettings.status, 200);
  assert.equal(updatedSettings.body.admin.phone, '+250700000000');

  const settings = await request(app, 'GET', '/api/admin/integration-settings', null, adminToken);
  assert.equal(settings.status, 200);
  assert.equal(settings.body.admin.name, 'Owner Name');
  const created = await request(
    app,
    'POST',
    '/api/admin/users',
    {
      name: 'Resident Jane',
      email: 'jane@resident.com',
      role: 'resident',
      room: 'A-101',
      profile: { allergies: 'none' },
      bills: [{ id: 'bill-1', name: 'Care Plan', amount: 500, paid: false }],
      activities: []
    },
    adminToken
  );
  assert.equal(created.status, 201);
  assert.ok(created.body.loginLink.includes('/auth/magic/'));
  assert.equal(created.body.delivery.clientDelivery.sent, true);
  assert.equal(created.body.delivery.adminDelivery.sent, true);

  const overview = await request(app, 'GET', '/api/admin/overview', null, adminToken);
  assert.equal(overview.status, 200);
  const emailNotifications = overview.body.notifications.filter((n) => n.channel === 'email');
  assert.equal(emailNotifications.length >= 2, true);

  const magicToken = created.body.loginLink.split('/').pop();
  const residentLogin = await request(app, 'POST', '/api/auth/magic-login', { token: magicToken });
  assert.equal(residentLogin.status, 200);

  const residentToken = residentLogin.body.token;
  const me = await request(app, 'GET', '/api/me', null, residentToken);
  assert.equal(me.status, 200);
  assert.equal(me.body.room, 'A-101');

  const paid = await request(app, 'POST', '/api/me/pay-bill', { billId: 'bill-1', amount: 500, method: 'card' }, residentToken);
  assert.equal(paid.status, 200);
  assert.equal(paid.body.bills[0].paid, true);
  assert.equal(typeof paid.body.bills[0].transactionRef, 'string');
  assert.equal(paid.body.bills[0].paymentProvider, 'sandbox_gateway');

  const activity = await request(app, 'POST', '/api/me/activities', { name: 'Chess' }, residentToken);
  assert.equal(activity.status, 200);
  assert.equal(activity.body.activities.length, 1);

  const contact = await request(
    app,
    'POST',
    '/api/me/contact-family',
    { channel: 'sms', message: 'Hello family, I am fine.' },
    residentToken
  );
  assert.equal(contact.status, 200);

  app.close();
});
