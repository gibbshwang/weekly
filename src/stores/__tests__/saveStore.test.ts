import { describe, it, expect, beforeEach } from 'vitest';
import { useSaveStore } from '../saveStore';

describe('saveStore', () => {
  beforeEach(() => {
    useSaveStore.getState().reset();
  });

  it('has initial state: idle, null sessionId, null errorMessage', () => {
    const state = useSaveStore.getState();
    expect(state.status).toBe('idle');
    expect(state.sessionId).toBeNull();
    expect(state.errorMessage).toBeNull();
  });

  it('setStatus changes status to consent', () => {
    useSaveStore.getState().setStatus('consent');
    expect(useSaveStore.getState().status).toBe('consent');
  });

  it('setStatus changes status to google-login', () => {
    useSaveStore.getState().setStatus('google-login');
    expect(useSaveStore.getState().status).toBe('google-login');
  });

  it('setStatus changes status to saving', () => {
    useSaveStore.getState().setStatus('saving');
    expect(useSaveStore.getState().status).toBe('saving');
  });

  it('setStatus changes status to saved', () => {
    useSaveStore.getState().setStatus('saved');
    expect(useSaveStore.getState().status).toBe('saved');
  });

  it('setStatus changes status to error', () => {
    useSaveStore.getState().setStatus('error');
    expect(useSaveStore.getState().status).toBe('error');
  });

  it('setSessionId sets sessionId', () => {
    useSaveStore.getState().setSessionId('abc-123');
    expect(useSaveStore.getState().sessionId).toBe('abc-123');
  });

  it('setError sets errorMessage', () => {
    useSaveStore.getState().setError('something went wrong');
    expect(useSaveStore.getState().errorMessage).toBe('something went wrong');
  });

  it('reset returns all fields to initial state', () => {
    useSaveStore.getState().setStatus('saved');
    useSaveStore.getState().setSessionId('abc-123');
    useSaveStore.getState().setError('error msg');
    useSaveStore.getState().reset();
    const state = useSaveStore.getState();
    expect(state.status).toBe('idle');
    expect(state.sessionId).toBeNull();
    expect(state.errorMessage).toBeNull();
  });
});
