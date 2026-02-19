let authToken = null;
let me = null;

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(path, { ...options, headers });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Request failed');
  return body;
}

function byId(id) {
  return document.getElementById(id);
}

function showMessage(targetId, message) {
  byId(targetId).textContent = typeof message === 'string' ? message : JSON.stringify(message, null, 2);
}

function showApp() {
  byId('loginPanel').classList.add('hidden');
  byId('appPanel').classList.remove('hidden');
  byId('welcome').textContent = `Welcome, ${me.name}`;
  byId('roleText').textContent = `Role: ${me.role}`;

  const isAdmin = me.role === 'administrator';
  const isResident = me.role === 'resident';
  byId('adminSection').classList.toggle('hidden', !isAdmin);
  byId('residentSection').classList.toggle('hidden', !isResident);
  if (isResident) renderResident(me);
}

function renderResident(user) {
  byId('residentDetails').textContent = JSON.stringify(
    {
      room: user.room,
      profile: user.profile,
      bills: user.bills,
      activities: user.activities
    },
    null,
    2
  );
}

function fillIntegrationForm(settings) {
  const form = byId('integrationForm');
  if (!form) return;
  form.adminName.value = settings.admin.name || '';
  form.adminEmail.value = settings.admin.email || '';
  form.adminPhone.value = settings.admin.phone || '';
  form.emailApiUrl.value = settings.integrations.emailApiUrl || '';
  form.emailApiKey.value = '';
  form.paymentGatewayUrl.value = settings.integrations.paymentGatewayUrl || '';
  form.paymentGatewayApiKey.value = '';
}

async function loadIntegrationSettings() {
  const settings = await api('/api/admin/integration-settings');
  showMessage('integrationOutput', settings);
  fillIntegrationForm(settings);
}

async function loadMe() {
  me = await api('/api/me');
  showApp();
  if (me.role === 'administrator') await loadIntegrationSettings();
}

byId('adminLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  try {
    const result = await api('/api/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ email: form.get('email'), password: form.get('password') })
    });
    authToken = result.token;
    await loadMe();
  } catch (err) {
    showMessage('roleText', err.message);
  }
});

byId('magicLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  try {
    const result = await api('/api/auth/magic-login', {
      method: 'POST',
      body: JSON.stringify({ token: form.get('token') })
    });
    authToken = result.token;
    await loadMe();
  } catch (err) {
    showMessage('roleText', err.message);
  }
});

byId('integrationForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  try {
    const payload = Object.fromEntries(form.entries());
    const result = await api('/api/admin/integration-settings', { method: 'POST', body: JSON.stringify(payload) });
    showMessage('integrationOutput', result);
  } catch (err) {
    showMessage('integrationOutput', err.message);
  }
});

byId('createUserForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  try {
    const role = form.get('role');
    const payload = {
      name: form.get('name'),
      email: form.get('email'),
      role,
      room: role === 'resident' ? form.get('room') || 'Not assigned' : null,
      profile: role === 'resident' ? { careNotes: 'Created by admin' } : {},
      bills: role === 'resident' ? [{ id: 'bill-1', name: 'Monthly Care', amount: 400, paid: false }] : [],
      activities: []
    };

    const result = await api('/api/admin/users', { method: 'POST', body: JSON.stringify(payload) });
    showMessage('adminOutput', result);
  } catch (err) {
    showMessage('adminOutput', err.message);
  }
});

byId('payBillForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  try {
    me = await api('/api/me/pay-bill', {
      method: 'POST',
      body: JSON.stringify({ billId: form.get('billId'), amount: Number(form.get('amount')), method: form.get('method') })
    });
    renderResident(me);
    showMessage('residentOutput', 'Bill paid successfully');
  } catch (err) {
    showMessage('residentOutput', err.message);
  }
});

byId('activityForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  try {
    me = await api('/api/me/activities', { method: 'POST', body: JSON.stringify({ name: form.get('name') }) });
    renderResident(me);
    showMessage('residentOutput', 'Activity selected');
  } catch (err) {
    showMessage('residentOutput', err.message);
  }
});

byId('contactForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  try {
    const note = await api('/api/me/contact-family', {
      method: 'POST',
      body: JSON.stringify({ channel: form.get('channel'), message: form.get('message') })
    });
    showMessage('residentOutput', `Communication sent: ${note.channel}`);
  } catch (err) {
    showMessage('residentOutput', err.message);
  }
});

const urlToken = new URLSearchParams(window.location.search).get('magicToken');
if (urlToken) {
  byId('magicLoginForm').querySelector('input[name="token"]').value = urlToken;
}
