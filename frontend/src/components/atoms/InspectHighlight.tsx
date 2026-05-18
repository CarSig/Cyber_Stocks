import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Reads ?inspect=<selector> after every navigation and draws a pulsing highlight.
// Uses MutationObserver so it works on conditionally rendered elements too.
export default function InspectHighlight() {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const selector = params.get('inspect');
    if (!selector) return;

    try { document.querySelector(selector); } catch { return; }

    let observer: MutationObserver | null = null;
    let giveUpTimer: ReturnType<typeof setTimeout> | null = null;
    let startTimer: ReturnType<typeof setTimeout> | null = null;
    let bannerTimer: ReturnType<typeof setTimeout> | null = null;
    let overlayEl: HTMLDivElement | null = null;
    let overlayTimer: ReturnType<typeof setTimeout> | null = null;

    if (!document.getElementById('idc-ri-styles')) {
      const style = document.createElement('style');
      style.id = 'idc-ri-styles';
      style.textContent = `
        @keyframes idc-inspect-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.5); }
          50%       { box-shadow: 0 0 0 8px rgba(59,130,246,0); }
        }
      `;
      document.head.appendChild(style);
    }

    function highlight(el: Element) {
      overlayEl?.remove();
      if (overlayTimer !== null) { clearTimeout(overlayTimer); overlayTimer = null; }

      const rect = el.getBoundingClientRect();
      const overlay = document.createElement('div');
      overlay.id = 'idc-inspect-highlight';
      Object.assign(overlay.style, {
        position: 'absolute',
        top: `${rect.top + window.scrollY - 4}px`,
        left: `${rect.left + window.scrollX - 4}px`,
        width: `${rect.width + 8}px`,
        height: `${rect.height + 8}px`,
        border: '2px solid #3b82f6',
        borderRadius: '4px',
        background: 'rgba(59,130,246,0.1)',
        pointerEvents: 'none',
        zIndex: '2147483640',
        animation: 'idc-inspect-pulse 1s ease-in-out 3',
      });
      overlayEl = overlay;

      document.body.appendChild(overlay);
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });

      const removeOverlay = () => { overlay.remove(); if (overlayEl === overlay) overlayEl = null; };
      overlayTimer = setTimeout(removeOverlay, 4000);
      window.addEventListener('click', () => {
        if (overlayTimer !== null) { clearTimeout(overlayTimer); overlayTimer = null; }
        removeOverlay();
      }, { once: true });
    }

    function showNotFound(sel: string) {
      const banner = document.createElement('div');
      banner.id = 'idc-inspect-notfound';
      Object.assign(banner.style, {
        position: 'fixed',
        bottom: '80px',
        right: '24px',
        zIndex: '2147483647',
        background: '#1c1917',
        border: '1px solid #3b82f6',
        borderRadius: '10px',
        padding: '14px 16px 12px',
        maxWidth: '360px',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#e4e4e7',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        lineHeight: '1.5',
      });
      banner.innerHTML = `
        <div style="font-weight:600;color:#3b82f6;margin-bottom:6px;">Element not visible</div>
        <div style="color:#a1a1aa;margin-bottom:10px;">Trigger the interaction that reveals it — it will highlight automatically.</div>
        <div style="font-size:11px;color:#71717a;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em;">Selector</div>
        <div id="idc-inspect-sel" title="Click to copy selector" style="font-family:monospace;font-size:11px;color:#a1a1aa;word-break:break-all;cursor:pointer;padding:4px 6px;background:rgba(255,255,255,0.04);border-radius:4px;border:1px solid #27272a;">${sel}</div>
        <div id="idc-inspect-copied" style="display:none;margin-top:6px;font-size:11px;color:#4ade80;">Copied to clipboard!</div>
        <button id="idc-inspect-notfound-close" style="position:absolute;top:8px;right:10px;background:none;border:none;color:#71717a;cursor:pointer;font-size:14px;">✕</button>
      `;
      document.body.appendChild(banner);

      const copiedEl = banner.querySelector<HTMLElement>('#idc-inspect-copied')!;
      banner.querySelector('#idc-inspect-sel')?.addEventListener('click', () => {
        navigator.clipboard.writeText(sel).catch(() => {});
        copiedEl.style.display = 'block';
        setTimeout(() => { copiedEl.style.display = 'none'; }, 1500);
      });

      observer?.disconnect();
      observer = new MutationObserver(() => {
        if (cancelled) return;
        const target = document.querySelector(sel);
        if (target) {
          observer?.disconnect();
          observer = null;
          banner.remove();
          if (bannerTimer !== null) { clearTimeout(bannerTimer); bannerTimer = null; }
          highlight(target);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      const closeBanner = () => {
        banner.remove();
        observer?.disconnect();
        observer = null;
        bannerTimer = null;
      };
      banner.querySelector('#idc-inspect-notfound-close')?.addEventListener('click', closeBanner);
      bannerTimer = setTimeout(closeBanner, 60_000);
    }

    function tryFind(): boolean {
      const el = document.querySelector(selector!);
      if (!el) return false;
      stop();
      highlight(el);
      return true;
    }

    let cancelled = false;

    function stop() {
      cancelled = true;
      observer?.disconnect();
      observer = null;
      if (giveUpTimer !== null) { clearTimeout(giveUpTimer); giveUpTimer = null; }
      if (startTimer !== null) { clearTimeout(startTimer); startTimer = null; }
      if (bannerTimer !== null) { clearTimeout(bannerTimer); bannerTimer = null; }
      if (overlayTimer !== null) { clearTimeout(overlayTimer); overlayTimer = null; }
      overlayEl?.remove(); overlayEl = null;
      document.getElementById('idc-inspect-notfound')?.remove();
    }

    function begin() {
      if (cancelled) return;
      if (!tryFind()) {
        observer = new MutationObserver(() => { if (!cancelled) tryFind(); });
        observer.observe(document.body, { childList: true, subtree: true });
        giveUpTimer = setTimeout(() => {
          if (cancelled) return;
          observer?.disconnect();
          observer = null;
          giveUpTimer = null;
          showNotFound(selector!);
        }, 1_000);
      }
    }

    startTimer = setTimeout(begin, 150);

    return stop;
  }, [location.search]);

  return null;
}
