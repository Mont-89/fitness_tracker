const ROLES = {
  ADMIN: 'administrator',
  STAFF: 'staff',
  FAMILY: 'family_member',
  RESIDENT: 'resident'
};

class User {
  constructor({ id, name, email, role, room = null, profile = {}, bills = [], activities = [] }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.role = role;
    this.room = room;
    this.profile = profile;
    this.bills = bills;
    this.activities = activities;
    this.createdAt = new Date().toISOString();
  }
}

class Notification {
  constructor({ id, userId, channel, title, message, status = 'queued', deliveredTo = null, deliveryProvider = null, deliveryStatus = null }) {
    this.id = id;
    this.userId = userId;
    this.channel = channel;
    this.title = title;
    this.message = message;
    this.status = status;
    this.deliveredTo = deliveredTo;
    this.deliveryProvider = deliveryProvider;
    this.deliveryStatus = deliveryStatus;
    this.createdAt = new Date().toISOString();
  }
}

module.exports = { ROLES, User, Notification };
