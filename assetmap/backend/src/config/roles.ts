export const ROLES = {
  USER: 'user',           // Standard user — own assets only
  LEGAL_HEIR: 'legal_heir', // Can access estate cases they filed
  ADMIN: 'admin'          // Internal staff — verify estates, view audit logs
} as const

export const PERMISSIONS = {
  // Assets
  'assets:read:own':       [ROLES.USER, ROLES.LEGAL_HEIR, ROLES.ADMIN],
  'assets:refresh':        [ROLES.USER, ROLES.LEGAL_HEIR, ROLES.ADMIN],
  // Consent
  'consent:create':        [ROLES.USER, ROLES.LEGAL_HEIR, ROLES.ADMIN],
  'consent:revoke':        [ROLES.USER, ROLES.LEGAL_HEIR, ROLES.ADMIN],
  // Estate
  'estate:file':           [ROLES.USER, ROLES.LEGAL_HEIR],
  'estate:read:own':       [ROLES.LEGAL_HEIR, ROLES.ADMIN],
  'estate:verify':         [ROLES.ADMIN],
  // Reports
  'report:generate':       [ROLES.USER, ROLES.LEGAL_HEIR, ROLES.ADMIN],
  // Admin only
  'audit:read:all':        [ROLES.ADMIN],
  'users:read:all':        [ROLES.ADMIN],
} as const
