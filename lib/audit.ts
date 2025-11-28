type AuditEntry = { teamId: string; action: string; timestamp: string; details?: string };
const MAX_ENTRIES = 5000;
const buffer: AuditEntry[] = [];

export function pushAudit(entry: AuditEntry) {
  buffer.unshift(entry);
  if (buffer.length > MAX_ENTRIES) buffer.length = MAX_ENTRIES;
}

export function getRecentForTeam(teamId: string, limit = 20) {
  return buffer.filter(e => e.teamId === teamId).slice(0, limit);
}
