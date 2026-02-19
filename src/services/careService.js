const { createId } = require('../utils/id');
const { User, Notification, ROLES } = require('../models/entities');

class CareService {
  constructor(repositories) {
    this.repositories = repositories;
    this.adminIdentity = {
      id: 'admin-1',
      name: process.env.ADMIN_NAME || 'System Owner',
      email: process.env.ADMIN_EMAIL || 'owner@newlands.com',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      phone: process.env.ADMIN_PHONE || ''
    };

    this.integrationConfig = {
      emailApiUrl: process.env.EMAIL_API_URL || '',
      emailApiKey: process.env.EMAIL_API_KEY || '',
      paymentGatewayUrl: process.env.PAYMENT_GATEWAY_URL || '',
      paymentGatewayApiKey: process.env.PAYMENT_GATEWAY_API_KEY || ''
    };
  }

  createSession(userId, role) {
    const token = createId();
    this.repositories.sessions.create({ id: token, userId, role, createdAt: new Date().toISOString() });
    return token;
  }

  sessionFromToken(token) {
    if (!token) throw new Error('Unauthorized');
    const session = this.repositories.sessions.findById(token);
    if (!session) throw new Error('Unauthorized');
    return session;
  }

  requireAdmin(token) {
    const session = this.sessionFromToken(token);
    if (session.role !== ROLES.ADMIN) throw new Error('Admin access required');
    return session;
  }

  adminLogin(payload) {
    if (payload.email !== this.adminIdentity.email || payload.password !== this.adminIdentity.password) {
      throw new Error('Invalid admin credentials');
    }

    return {
      token: this.createSession(this.adminIdentity.id, ROLES.ADMIN),
      role: ROLES.ADMIN,
      name: this.adminIdentity.name
    };
  }

  updateIntegrationSettings(token, payload) {
    this.requireAdmin(token);

    if (payload.adminName) this.adminIdentity.name = payload.adminName;
    if (payload.adminEmail) this.adminIdentity.email = payload.adminEmail;
    if (payload.adminPhone !== undefined) this.adminIdentity.phone = payload.adminPhone;

    if (payload.emailApiUrl !== undefined) this.integrationConfig.emailApiUrl = payload.emailApiUrl;
    if (payload.emailApiKey !== undefined) this.integrationConfig.emailApiKey = payload.emailApiKey;
    if (payload.paymentGatewayUrl !== undefined) this.integrationConfig.paymentGatewayUrl = payload.paymentGatewayUrl;
    if (payload.paymentGatewayApiKey !== undefined) this.integrationConfig.paymentGatewayApiKey = payload.paymentGatewayApiKey;

    return this.getIntegrationSettings(token);
  }

  getIntegrationSettings(token) {
    this.requireAdmin(token);
    return {
      admin: {
        name: this.adminIdentity.name,
        email: this.adminIdentity.email,
        phone: this.adminIdentity.phone
      },
      integrations: {
        emailApiUrl: this.integrationConfig.emailApiUrl,
        emailApiKeyConfigured: Boolean(this.integrationConfig.emailApiKey),
        paymentGatewayUrl: this.integrationConfig.paymentGatewayUrl,
        paymentGatewayApiKeyConfigured: Boolean(this.integrationConfig.paymentGatewayApiKey)
      }
    };
  }

  deliverEmail({ to, subject, body }) {
    const { emailApiUrl, emailApiKey } = this.integrationConfig;

    if (emailApiUrl) {
      return fetch(emailApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(emailApiKey ? { Authorization: `Bearer ${emailApiKey}` } : {})
        },
        body: JSON.stringify({ to, subject, body })
      })
        .then(async (res) => {
          if (!res.ok) {
            const text = await res.text();
            throw new Error(`Email provider error (${res.status}): ${text}`);
          }
          return { sent: true, provider: 'remote_api' };
        })
        .catch((error) => ({ sent: false, provider: 'remote_api', error: error.message }));
    }

    return Promise.resolve({ sent: true, provider: 'in_memory_outbox' });
  }

  async notifyUserAndAdmin(user, loginLink) {
    const clientSubject = 'Your Elders Monitor access link';
    const clientMessage = `Hi ${user.name}, use this secure link to access your account: ${loginLink}`;
    const adminSubject = `User provisioned: ${user.name} (${user.role})`;
    const adminMessage = `${user.name} was provisioned by admin. Login link sent to ${user.email}.`;

    const [clientDelivery, adminDelivery] = await Promise.all([
      this.deliverEmail({ to: user.email, subject: clientSubject, body: clientMessage }),
      this.deliverEmail({ to: this.adminIdentity.email, subject: adminSubject, body: adminMessage })
    ]);

    this.sendNotification({
      userId: user.id,
      channel: 'email',
      title: clientSubject,
      message: clientMessage,
      deliveredTo: user.email,
      deliveryProvider: clientDelivery.provider,
      deliveryStatus: clientDelivery.sent ? 'sent' : 'failed'
    });

    this.sendNotification({
      userId: this.adminIdentity.id,
      channel: 'email',
      title: adminSubject,
      message: adminMessage,
      deliveredTo: this.adminIdentity.email,
      deliveryProvider: adminDelivery.provider,
      deliveryStatus: adminDelivery.sent ? 'sent' : 'failed'
    });

    return { clientDelivery, adminDelivery };
  }

  async adminCreateUser(adminToken, payload) {
    this.requireAdmin(adminToken);
    if (![ROLES.STAFF, ROLES.FAMILY, ROLES.RESIDENT].includes(payload.role)) {
      throw new Error('Invalid role for provisioned user');
    }

    const exists = this.repositories.users.findAll((u) => u.email.toLowerCase() === payload.email.toLowerCase()).length;
    if (exists) throw new Error('User already exists');

    const user = new User({ id: createId(), ...payload });
    this.repositories.users.create(user);

    const magicToken = createId();
    this.repositories.magicLinks.create({ id: magicToken, userId: user.id, used: false, createdAt: new Date().toISOString() });
    const link = `/auth/magic/${magicToken}`;

    const delivery = await this.notifyUserAndAdmin(user, link);
    return { user, loginLink: link, delivery };
  }

  magicLogin(payload) {
    const link = this.repositories.magicLinks.findById(payload.token);
    if (!link || link.used) throw new Error('Invalid or expired login link');
    const user = this.repositories.users.findById(link.userId);
    if (!user) throw new Error('User not found');
    this.repositories.magicLinks.update(link.id, { used: true });
    return { token: this.createSession(user.id, user.role), role: user.role, name: user.name };
  }

  sendNotification(payload) {
    const note = new Notification({ id: createId(), ...payload, status: 'delivered' });
    return this.repositories.notifications.create(note);
  }

  me(token) {
    const session = this.sessionFromToken(token);
    if (session.role === ROLES.ADMIN) {
      return {
        id: this.adminIdentity.id,
        name: this.adminIdentity.name,
        email: this.adminIdentity.email,
        phone: this.adminIdentity.phone,
        role: ROLES.ADMIN
      };
    }
    return this.repositories.users.findById(session.userId);
  }

  async chargePaymentGateway({ amount, method, residentId, billId }) {
    const { paymentGatewayUrl, paymentGatewayApiKey } = this.integrationConfig;

    if (paymentGatewayUrl) {
      const response = await fetch(paymentGatewayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(paymentGatewayApiKey ? { Authorization: `Bearer ${paymentGatewayApiKey}` } : {})
        },
        body: JSON.stringify({ amount, method, residentId, billId, currency: 'USD' })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Payment gateway declined transaction: ${text || response.status}`);
      }

      const payload = await response.json().catch(() => ({}));
      return { approved: true, transactionRef: payload.transactionRef || `GW-${createId()}`, provider: 'remote_gateway' };
    }

    return { approved: true, transactionRef: `SIM-${Date.now()}`, provider: 'sandbox_gateway' };
  }

  async payBill(token, payload) {
    const user = this.me(token);
    if (!user || user.role !== ROLES.RESIDENT) throw new Error('Only residents can pay bills here');

    const bill = (user.bills || []).find((b) => b.id === payload.billId);
    if (!bill) throw new Error('Bill not found');
    if (Number(payload.amount) <= 0) throw new Error('Invalid payment amount');

    const charge = await this.chargePaymentGateway({
      amount: Number(payload.amount),
      method: payload.method,
      residentId: user.id,
      billId: payload.billId
    });

    if (!charge.approved) throw new Error('Payment was not approved');

    const nextBills = user.bills.map((b) =>
      b.id === payload.billId
        ? {
            ...b,
            paid: true,
            paidAmount: Number(payload.amount),
            method: payload.method,
            transactionRef: charge.transactionRef,
            paymentProvider: charge.provider,
            paidAt: new Date().toISOString()
          }
        : b
    );

    return this.repositories.users.update(user.id, { bills: nextBills });
  }

  chooseActivity(token, payload) {
    const user = this.me(token);
    if (!user || user.role !== ROLES.RESIDENT) throw new Error('Only residents can select activities');
    const activities = [...(user.activities || []), { id: createId(), name: payload.name, selectedAt: new Date().toISOString() }];
    return this.repositories.users.update(user.id, { activities });
  }

  contactFamily(token, payload) {
    const user = this.me(token);
    if (!user) throw new Error('Unauthorized');

    const allowedChannels = ['sms', 'email', 'call'];
    if (!allowedChannels.includes(payload.channel)) throw new Error('Unsupported channel');

    return this.sendNotification({
      userId: user.id,
      channel: payload.channel,
      title: `Family communication via ${payload.channel}`,
      message: payload.message
    });
  }

  adminOverview(token) {
    this.requireAdmin(token);
    const users = this.repositories.users.findAll();
    return {
      counts: {
        residents: users.filter((u) => u.role === ROLES.RESIDENT).length,
        staff: users.filter((u) => u.role === ROLES.STAFF).length,
        familyMembers: users.filter((u) => u.role === ROLES.FAMILY).length
      },
      users,
      notifications: this.repositories.notifications.findAll(),
      settings: this.getIntegrationSettings(token)
    };
  }
}

module.exports = { CareService };
