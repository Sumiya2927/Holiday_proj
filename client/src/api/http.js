import { demoApi } from '../demo/api';
import { isDemo } from '../demo/mode';

const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, code = 'NETWORK_ERROR', details = {}, status = 0) {
    super(message);
    Object.assign(this, { code, details, status });
  }
}

let previewActive = false;
const listeners = new Set();
export function getApiMode() {
  return previewActive ? 'fixtures' : 'live';
}
export function onApiModeChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function setMode(isFixture) {
  if (previewActive !== isFixture) {
    previewActive = isFixture;
    listeners.forEach(fn => fn(previewActive ? 'fixtures' : 'live'));
  }
}

export async function request(path, { signal, method = 'GET', body, download = false } = {}) {
  let response;
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 30000);

  try {
    response = await fetch(`${base}${path}`, {
      method,
      signal: controller.signal,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    if (controller.signal.aborted) {
      throw new ApiError('The holiday service is taking too long to respond. Please try again.', 'TIMEOUT');
    }
    throw new ApiError('We could not connect to the holiday service. Please try again shortly.', 'NETWORK_ERROR');
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }

  if (download && response.ok) return response.blob();

  let result;
  try {
    result = await response.json();
  } catch {
    throw new ApiError('The holiday service is unavailable. Please try again shortly.', 'SERVICE_UNAVAILABLE', {}, response.status);
  }

  if (!response.ok || result.success === false) {
    throw new ApiError(
      result.error?.message || 'This request could not be completed.',
      result.error?.code || 'REQUEST_FAILED',
      result.error?.details || {},
      response.status
    );
  }

  if (!('data' in result)) {
    throw new ApiError('The holiday service returned an unexpected response.', 'INVALID_RESPONSE');
  }

  return result.data;
}

async function runWithFallback(liveCall, fallbackCall) {
  if (isDemo()) {
    setMode(true);
    return await fallbackCall();
  }

  try {
    const res = await liveCall();
    setMode(false);
    return res;
  } catch (err) {
    // If server is offline or proxy returned 502/503/504
    if (err.code === 'NETWORK_ERROR' || err.code === 'SERVICE_UNAVAILABLE' || err.status >= 500) {
      if (fallbackCall) {
        setMode(true);
        return await fallbackCall();
      }
    }
    throw err;
  }
}

const id = encodeURIComponent;

export const api = {
  options: signal =>
    runWithFallback(
      () => request('/catalog/options', { signal }),
      () => demoApi.options()
    ),

  generate: body =>
    runWithFallback(
      () => request('/packages/generate', { method: 'POST', body }),
      () => demoApi.generate(body)
    ),

  package: (key, signal) =>
    runWithFallback(
      () => request(`/packages/${id(key)}`, { signal }),
      () => demoApi.package(key)
    ),

  alternatives: (key, query, signal) =>
    runWithFallback(
      () => request(`/packages/${id(key)}/alternatives?${new URLSearchParams(query)}`, { signal }),
      () => demoApi.alternatives(key, query)
    ),

  modify: (key, body) =>
    runWithFallback(
      () => request(`/packages/${id(key)}`, { method: 'PATCH', body }),
      () => demoApi.modify(key, body)
    ),

  confirm: key =>
    runWithFallback(
      () => request(`/packages/${id(key)}/confirm`, { method: 'POST' }),
      () => demoApi.confirm(key)
    ),

  reservation: (reference, signal) =>
    runWithFallback(
      () => request(`/reservations/${id(reference)}`, { signal }),
      () => demoApi.reservation(reference)
    ),

  export: key =>
    runWithFallback(
      () => request(`/packages/${id(key)}/export`, { download: true }),
      () => demoApi.export(key)
    ),
};

export async function downloadPackage(key) {
  const blob = await api.export(key);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `holiday-${key}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
