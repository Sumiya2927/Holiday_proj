export function isDemo() {
  try { return sessionStorage.getItem('holiday-demo-mode') === 'on'; } catch { return false; }
}
export function setDemo(enabled) {
  sessionStorage.setItem('holiday-demo-mode', enabled ? 'on' : 'off');
}
export function configureDemo() {
  if (new URLSearchParams(window.location.search).get('demo') === '1') setDemo(true);
}
