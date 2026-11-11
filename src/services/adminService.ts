import { AuditLogEntry, UserAccount, UserRole, Restaurant, Reservation } from '../types';

const AUDIT_LOGS_STORAGE_KEY = 'flashtable_audit_logs';
const USER_ACCOUNTS_STORAGE_KEY = 'flashtable_user_accounts';

// Initial platform seed logs for realistic administrative monitoring
const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log-101',
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    userId: 'USR-ADMIN-1',
    userName: 'Company Super Admin',
    userRole: 'company-admin',
    action: 'restaurant_details_changed',
    entityType: 'restaurant',
    entityId: 'rest-1',
    restaurantId: 'rest-1',
    restaurantName: 'The Ember Room',
    details: 'Verified venue license and 500m geofence parameters',
  },
  {
    id: 'log-102',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    userId: 'USR-1788787060247',
    userName: 'Customer Srushti',
    userRole: 'customer',
    action: 'booking_created',
    entityType: 'reservation',
    entityId: 'FT-BLR-10492',
    restaurantId: 'rest-1',
    restaurantName: 'The Ember Room',
    details: 'Created reservation for Table T02 (Time In: 07:30 PM, Time Out: 09:15 PM)',
  },
];

// Initial user accounts list
const INITIAL_USERS: UserAccount[] = [
  {
    userId: 'USR-ADMIN-1',
    fullName: 'FlashTable Security Team',
    email: 'admin@flashtable.com',
    mobile: '9845000001',
    phone: '+91 98450 00001',
    role: 'company-admin',
    isEmailVerified: true,
    isMobileVerified: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    preferredLanguage: 'en',
  },
  {
    userId: 'USR-OWNER-1',
    fullName: 'Vikramaditya Rathore',
    email: 'ember.room@flashtable.com',
    mobile: '9845012260',
    phone: '+91 98450 12260',
    role: 'restaurant-owner',
    isEmailVerified: true,
    isMobileVerified: true,
    createdAt: '2026-02-15T00:00:00.000Z',
    restaurantId: 'rest-1',
    preferredLanguage: 'en',
  },
  {
    userId: 'USR-1788787060247',
    fullName: 'Srushti Halagi',
    email: 'srushtihalagi2454@gmail.com',
    mobile: '9845012345',
    phone: '+91 98450 12345',
    role: 'customer',
    isEmailVerified: true,
    isMobileVerified: true,
    createdAt: '2026-03-01T00:00:00.000Z',
    preferredLanguage: 'en',
  },
];

export const getAuditLogs = (): AuditLogEntry[] => {
  try {
    const raw = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return INITIAL_AUDIT_LOGS;
};

export const recordAuditLog = (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry => {
  const newEntry: AuditLogEntry = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };

  try {
    const current = getAuditLogs();
    const updated = [newEntry, ...current].slice(0, 500); // keep last 500 logs
    localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  return newEntry;
};

export const getUserAccounts = (): UserAccount[] => {
  try {
    const raw = localStorage.getItem(USER_ACCOUNTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return INITIAL_USERS;
};

export const saveUserAccounts = (users: UserAccount[]): void => {
  try {
    localStorage.setItem(USER_ACCOUNTS_STORAGE_KEY, JSON.stringify(users));
  } catch {}
};

export const findUserByEmailOrPhone = (identifier: string): UserAccount | undefined => {
  const clean = identifier.trim().toLowerCase();
  const digits = identifier.replace(/\D/g, '');
  const users = getUserAccounts();

  return users.find((u) => {
    if (u.isDeleted) return false;
    if (u.email && u.email.toLowerCase() === clean) return true;
    if (u.mobile && digits && u.mobile.replace(/\D/g, '').endsWith(digits.slice(-10))) return true;
    return false;
  });
};

export const registerOrUpdateUser = (userData: Partial<UserAccount> & { role: UserRole }): UserAccount => {
  const users = getUserAccounts();
  const cleanEmail = (userData.email || '').trim().toLowerCase();
  const digits = (userData.mobile || userData.phone || '').replace(/\D/g, '').slice(-10);

  const existingIndex = users.findIndex((u) => {
    if (userData.userId && u.userId === userData.userId) return true;
    if (cleanEmail && u.email.toLowerCase() === cleanEmail) return true;
    if (digits && u.mobile.replace(/\D/g, '').endsWith(digits)) return true;
    return false;
  });

  const now = new Date().toISOString();
  let resultUser: UserAccount;

  if (existingIndex >= 0) {
    resultUser = {
      ...users[existingIndex],
      ...userData,
      email: cleanEmail || users[existingIndex].email,
      mobile: digits || users[existingIndex].mobile,
      lastLoginAt: now,
    };
    users[existingIndex] = resultUser;
  } else {
    resultUser = {
      userId: userData.userId || `USR-${Date.now()}`,
      fullName: userData.fullName || 'Customer',
      email: cleanEmail,
      mobile: digits,
      phone: digits ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : '+91 98450 12260',
      role: userData.role,
      isEmailVerified: Boolean(userData.isEmailVerified),
      isMobileVerified: Boolean(userData.isMobileVerified),
      createdAt: now,
      lastLoginAt: now,
      preferredLanguage: userData.preferredLanguage || 'en',
      restaurantId: userData.restaurantId,
    };
    users.unshift(resultUser);
  }

  saveUserAccounts(users);
  return resultUser;
};

export const suspendAccount = (userId: string, reason: string, adminName: string): boolean => {
  const users = getUserAccounts();
  const user = users.find((u) => u.userId === userId);
  if (!user) return false;

  user.isSuspended = true;
  user.suspendedAt = new Date().toISOString();
  user.suspensionReason = reason;
  saveUserAccounts(users);

  recordAuditLog({
    userId: 'USR-ADMIN-1',
    userName: adminName,
    userRole: 'company-admin',
    action: 'account_suspended',
    entityType: 'user',
    entityId: userId,
    details: `Suspended account ${user.fullName} (${user.email || user.mobile}). Reason: ${reason}`,
    isSuspicious: true,
    suspiciousReason: reason,
  });

  return true;
};

export const restoreAccount = (userId: string, adminName: string): boolean => {
  const users = getUserAccounts();
  const user = users.find((u) => u.userId === userId);
  if (!user) return false;

  user.isSuspended = false;
  user.suspendedAt = undefined;
  user.suspensionReason = undefined;
  saveUserAccounts(users);

  recordAuditLog({
    userId: 'USR-ADMIN-1',
    userName: adminName,
    userRole: 'company-admin',
    action: 'account_restored',
    entityType: 'user',
    entityId: userId,
    details: `Restored access for account ${user.fullName} (${user.email || user.mobile})`,
  });

  return true;
};

export const deleteUserAccount = (userId: string, customerName: string): boolean => {
  const users = getUserAccounts();
  const user = users.find((u) => u.userId === userId);
  if (!user) return false;

  // Mark account as deactivated / deleted and anonymize personal identity
  user.isDeleted = true;
  user.fullName = 'Deactivated Customer';
  user.email = `deleted_${userId.slice(-6)}@flashtable.anonymized`;
  user.mobile = '0000000000';
  user.phone = '0000000000';
  saveUserAccounts(users);

  recordAuditLog({
    userId,
    userName: customerName,
    userRole: 'customer',
    action: 'account_deleted',
    entityType: 'user',
    entityId: userId,
    details: `Customer requested permanent deletion of account. Personal information anonymized; transaction history retained for audit compliance.`,
  });

  return true;
};
