let cachedSessionId: string | null = null;

function generateId(): string {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `vb-session-${Math.random().toString(36).slice(2, 10)}`;
}

export function getSessionId(): string {
  if (cachedSessionId) {
    return cachedSessionId;
  }

  if (typeof window !== 'undefined') {
    try {
      const existing = window.localStorage.getItem('virtualbank.sessionId');
      if (existing && existing.trim().length > 0) {
        cachedSessionId = existing;
        return existing;
      }
    } catch (error) {
      console.warn('Unable to read session id from storage', error);
    }

    const generated = generateId();
    try {
      window.localStorage.setItem('virtualbank.sessionId', generated);
    } catch (error) {
      console.warn('Unable to persist session id to storage', error);
    }
    cachedSessionId = generated;
    return generated;
  }

  cachedSessionId = generateId();
  return cachedSessionId;
}
