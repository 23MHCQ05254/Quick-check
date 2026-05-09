import { isDemoMode } from '../config/db.js';
import ActivityLog from '../models/ActivityLog.js';
import { demoStore } from './demoStore.js';

export const recordActivity = async ({ req, actor, actorRole, action, entityType, entityId, severity = 'INFO', message, metadata = {} }) => {
  const payload = {
    actor: actor?._id || actor?.id,
    actorRole,
    action,
    entityType,
    entityId,
    severity,
    message,
    metadata,
    ipAddress: req?.ip,
    userAgent: req?.headers?.['user-agent']
  };

  if (isDemoMode()) {
    return demoStore.addActivity(payload);
  }

  return ActivityLog.create(payload);
};

