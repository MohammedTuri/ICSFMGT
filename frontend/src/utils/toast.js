// Simple DOM-based toast utility (no external deps)
export function notify(type, message, timeout = 3000) {
  if (typeof document === 'undefined') return;
  let container = document.getElementById('ics-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'ics-toast-container';
    container.style.position = 'fixed';
    container.style.right = '16px';
    container.style.bottom = '16px';
    container.style.zIndex = 14000;
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '8px';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `ics-toast ics-toast-${type}`;
  toast.style.minWidth = '220px';
  toast.style.maxWidth = '360px';
  toast.style.padding = '10px 12px';
  toast.style.borderRadius = '8px';
  toast.style.boxShadow = '0 8px 24px rgba(2,6,23,0.2)';
  toast.style.color = '#fff';
  toast.style.fontWeight = '600';
  toast.style.fontFamily = 'inherit';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.gap = '8px';
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(8px)';
  toast.style.transition = 'opacity 180ms ease, transform 180ms ease';

  const icon = document.createElement('span');
  icon.style.fontSize = '14px';
  icon.style.flex = '0 0 auto';
  if (type === 'success') icon.textContent = '✓';
  else if (type === 'error') icon.textContent = '✖';
  else icon.textContent = 'ℹ';

  const text = document.createElement('span');
  text.style.flex = '1 1 auto';
  text.style.fontSize = '13px';
  text.textContent = message;

  toast.appendChild(icon);
  toast.appendChild(text);

  if (type === 'success') toast.style.background = '#16a34a';
  else if (type === 'error') toast.style.background = '#dc2626';
  else toast.style.background = '#2563eb';

  container.appendChild(toast);

  // Trigger enter
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  const remove = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(() => { try { container.removeChild(toast); } catch (e) {} }, 220);
  };

  const timer = setTimeout(remove, timeout);
  toast.addEventListener('click', () => { clearTimeout(timer); remove(); });

  return { remove };
}

export default notify;
