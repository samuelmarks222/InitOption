/** Phase 1 always runs as a demo; never enable real-money features from client configuration. */
export const fieldbookConfig = Object.freeze({ mode: 'demo' as const, apiBase: '/api/fieldbook' });
