/**
 * inspect-dom-capture
 *
 * A standalone vanilla TypeScript module that injects a floating feedback button
 * into any web application. Supports element selection (DevTools-style), metadata
 * capture, and posting structured feedback to a configurable endpoint.
 *
 * Safe to use inside React/Vue/Angular apps — no framework dependencies.
 */

// ─────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────

export type FeedbackButtonConfig = {
  /** POST endpoint to send feedback to */
  endpoint: string;
  /** Button label text. Defaults to "Feedback" */
  buttonLabel?: string;
  /** Position of the button. Defaults to bottom-right */
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  /** Called after a successful send */
  onSuccess?: (payload: FeedbackPayload) => void;
  /** Called on send error */
  onError?: (error: Error) => void;
};

export type ElementMetadata = {
  tagName: string;
  id: string;
  classes: string[];
  innerTextPreview: string;
  cssSelector: string;
  domPath: string[];
  pageUrl: string;
  timestamp: string;
  screenshotPlaceholder: null; // Hook: replace with actual screenshot data if needed
  boundingRect: {
    top: number;
    left: number;
    bottom: number;
    right: number;
    width: number;
    height: number;
  };
};

export type FeedbackPayload = {
  message: string;
  metadata: ElementMetadata;
};

type ModalState = "idle" | "open" | "sending" | "success" | "error";

// ─────────────────────────────────────────────
// Constants — unique prefixes to avoid collisions
// ─────────────────────────────────────────────

const PREFIX = "idc"; // inspect-dom-capture

const ID = {
  styleTag: `${PREFIX}-styles`,
  button: `${PREFIX}-trigger-btn`,
  overlay: `${PREFIX}-highlight-overlay`,
  modal: `${PREFIX}-modal-root`,
  backdrop: `${PREFIX}-backdrop`,
  textarea: `${PREFIX}-textarea`,
  sendBtn: `${PREFIX}-send-btn`,
  cancelBtn: `${PREFIX}-cancel-btn`,
  statusMsg: `${PREFIX}-status`,
} as const;

// ─────────────────────────────────────────────
// CSS — injected dynamically, fully scoped
// ─────────────────────────────────────────────

function buildCSS(position: FeedbackButtonConfig["position"]): string {
  const positionStyles: Record<NonNullable<FeedbackButtonConfig["position"]>, string> = {
    "bottom-right": "bottom: 24px; right: 24px;",
    "bottom-left": "bottom: 24px; left: 24px;",
    "top-right": "top: 24px; right: 24px;",
    "top-left": "top: 24px; left: 24px;",
  };
  const pos = positionStyles[position ?? "bottom-right"];

  return `
    /* Floating trigger button */
    #${ID.button} {
      position: fixed;
      ${pos}
      z-index: 2147483647;
      background: #3b82f6;
      color: #fff;
      border: none;
      border-radius: 50px;
      padding: 10px 18px;
      font-size: 13px;
      font-family: system-ui, -apple-system, sans-serif;
      font-weight: 600;
      letter-spacing: 0.02em;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(59, 130, 246, 0.45);
      transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
      display: flex;
      align-items: center;
      gap: 6px;
      user-select: none;
    }
    #${ID.button}:hover {
      background: #2563eb;
      box-shadow: 0 6px 20px rgba(59, 130, 246, 0.6);
      transform: translateY(-2px);
    }
    #${ID.button}:active {
      transform: translateY(0);
    }
    #${ID.button}[aria-pressed="true"] {
      background: #f43f5e;
      box-shadow: 0 4px 16px rgba(244, 63, 94, 0.45);
      animation: ${PREFIX}-pulse 1.5s infinite;
    }

    @keyframes ${PREFIX}-pulse {
      0%, 100% { box-shadow: 0 4px 16px rgba(244, 63, 94, 0.45); }
      50%       { box-shadow: 0 4px 28px rgba(244, 63, 94, 0.75); }
    }

    /* Highlight overlay — tracks hovered element during selection mode */
    #${ID.overlay} {
      position: fixed;
      z-index: 2147483646;
      pointer-events: none;
      border: 2px solid #3b82f6;
      background: rgba(59, 130, 246, 0.08);
      border-radius: 3px;
      transition: top 0.05s, left 0.05s, width 0.05s, height 0.05s;
      box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.25);
    }
    #${ID.overlay}.${PREFIX}-hidden {
      display: none;
    }

    /* Modal backdrop */
    #${ID.backdrop} {
      position: fixed;
      inset: 0;
      z-index: 2147483645;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(2px);
      animation: ${PREFIX}-fade-in 0.2s ease;
    }

    /* Modal dialog */
    #${ID.modal} {
      position: fixed;
      z-index: 2147483646;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: min(560px, calc(100vw - 32px));
      max-height: calc(100vh - 48px);
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      color: #f4f4f5;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
      animation: ${PREFIX}-slide-up 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes ${PREFIX}-fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes ${PREFIX}-slide-up {
      from { opacity: 0; transform: translate(-50%, calc(-50% + 16px)); }
      to   { opacity: 1; transform: translate(-50%, -50%); }
    }

    .${PREFIX}-modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid #27272a;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    .${PREFIX}-modal-title {
      font-weight: 700;
      font-size: 15px;
      color: #f4f4f5;
    }
    .${PREFIX}-close-btn {
      background: none;
      border: none;
      color: #71717a;
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      line-height: 1;
      transition: color 0.15s, background 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .${PREFIX}-close-btn:hover {
      color: #f4f4f5;
      background: #27272a;
    }

    .${PREFIX}-modal-body {
      padding: 16px 20px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Metadata section */
    .${PREFIX}-meta-section {
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 8px;
      overflow: hidden;
    }
    .${PREFIX}-meta-label {
      padding: 8px 12px;
      background: #18181b;
      border-bottom: 1px solid #27272a;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #71717a;
    }
    .${PREFIX}-meta-grid {
      padding: 4px 0;
    }
    .${PREFIX}-meta-row {
      display: grid;
      grid-template-columns: 130px 1fr;
      padding: 5px 12px;
      gap: 8px;
    }
    .${PREFIX}-meta-row:nth-child(even) {
      background: rgba(255,255,255,0.02);
    }
    .${PREFIX}-meta-key {
      color: #71717a;
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .${PREFIX}-meta-val {
      color: #a1a1aa;
      font-size: 12px;
      font-family: ui-monospace, SFMono-Regular, monospace;
      word-break: break-all;
      white-space: pre-wrap;
    }

    /* Feedback textarea */
    .${PREFIX}-field-label {
      font-size: 12px;
      font-weight: 600;
      color: #a1a1aa;
      margin-bottom: 6px;
      display: block;
    }
    #${ID.textarea} {
      width: 100%;
      box-sizing: border-box;
      min-height: 90px;
      resize: vertical;
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 8px;
      color: #f4f4f5;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      padding: 10px 12px;
      line-height: 1.5;
      outline: none;
      transition: border-color 0.15s;
    }
    #${ID.textarea}:focus {
      border-color: #3b82f6;
    }

    /* Footer / actions */
    .${PREFIX}-modal-footer {
      padding: 12px 20px;
      border-top: 1px solid #27272a;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-shrink: 0;
    }
    #${ID.statusMsg} {
      font-size: 12px;
      flex: 1;
      transition: color 0.2s;
    }
    #${ID.statusMsg}.${PREFIX}-success { color: #4ade80; }
    #${ID.statusMsg}.${PREFIX}-error   { color: #f87171; }

    .${PREFIX}-btn-group {
      display: flex;
      gap: 8px;
    }
    #${ID.cancelBtn} {
      background: #27272a;
      border: none;
      color: #a1a1aa;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    #${ID.cancelBtn}:hover {
      background: #3f3f46;
      color: #f4f4f5;
    }
    #${ID.sendBtn} {
      background: #3b82f6;
      border: none;
      color: #fff;
      padding: 8px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, opacity 0.15s;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    #${ID.sendBtn}:hover:not(:disabled) {
      background: #2563eb;
    }
    #${ID.sendBtn}:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    /* Selection mode — body cursor override */
    body.${PREFIX}-selecting * {
      cursor: crosshair !important;
    }

    /* Spinner inside send button */
    .${PREFIX}-spinner {
      width: 12px;
      height: 12px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: ${PREFIX}-spin 0.7s linear infinite;
    }
    @keyframes ${PREFIX}-spin {
      to { transform: rotate(360deg); }
    }
  `;
}

// ─────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────

/** Build a unique CSS selector that identifies the element in the document */
function buildCSSSelector(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;

  while (current && current !== document.body && current !== document.documentElement) {
    let part = current.tagName.toLowerCase();
    if (current.id) {
      part += `#${CSS.escape(current.id)}`;
      parts.unshift(part);
      break; // ID is unique — stop here
    }
    const siblings = Array.from(current.parentElement?.children ?? []).filter(
      (c) => c.tagName === current!.tagName
    );
    if (siblings.length > 1) {
      const idx = siblings.indexOf(current) + 1;
      part += `:nth-of-type(${idx})`;
    }
    parts.unshift(part);
    current = current.parentElement;
  }

  return parts.join(" > ") || el.tagName.toLowerCase();
}

/** Build a human-readable DOM path array (tag + id/classes at each level) */
function buildDOMPath(el: Element): string[] {
  const path: string[] = [];
  let current: Element | null = el;

  while (current && current !== document.documentElement) {
    let label = current.tagName.toLowerCase();
    if (current.id) label += `#${current.id}`;
    else if (current.classList.length) label += `.${Array.from(current.classList).join(".")}`;
    path.unshift(label);
    current = current.parentElement;
  }

  return path;
}

/** Extract ElementMetadata from a DOM element */
function extractMetadata(el: Element): ElementMetadata {
  const rect = el.getBoundingClientRect();
  const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 200);

  return {
    tagName: el.tagName.toLowerCase(),
    id: el.id,
    classes: Array.from(el.classList),
    innerTextPreview: text,
    cssSelector: buildCSSSelector(el),
    domPath: buildDOMPath(el),
    pageUrl: window.location.href,
    timestamp: new Date().toISOString(),
    screenshotPlaceholder: null,
    boundingRect: {
      top: Math.round(rect.top),
      left: Math.round(rect.left),
      bottom: Math.round(rect.bottom),
      right: Math.round(rect.right),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    },
  };
}

/** Inject a <style> tag once into <head> */
function injectCSS(css: string): HTMLStyleElement {
  const existing = document.getElementById(ID.styleTag) as HTMLStyleElement | null;
  if (existing) return existing;

  const style = document.createElement("style");
  style.id = ID.styleTag;
  style.textContent = css;
  document.head.appendChild(style);
  return style;
}

function removeElement(id: string): void {
  document.getElementById(id)?.remove();
}

// ─────────────────────────────────────────────
// DOM builders
// ─────────────────────────────────────────────

function createTriggerButton(label: string): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.id = ID.button;
  btn.setAttribute("aria-label", "Open feedback tool");
  btn.setAttribute("aria-pressed", "false");
  btn.title = "Feedback — click to select an element";

  // SVG icon (comment bubble)
  btn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1C4.134 1 1 3.91 1 7.5c0 1.61.63 3.08 1.67 4.22L2 14l2.44-.97A7.25 7.25 0 0 0 8 14c3.866 0 7-2.91 7-6.5S11.866 1 8 1Z"
            fill="currentColor"/>
    </svg>
    <span>${label}</span>
  `;

  return btn;
}

function createHighlightOverlay(): HTMLDivElement {
  const overlay = document.createElement("div");
  overlay.id = ID.overlay;
  overlay.classList.add(`${PREFIX}-hidden`);
  overlay.setAttribute("aria-hidden", "true");
  return overlay;
}

function createMetadataHTML(meta: ElementMetadata): string {
  const rows: [string, string][] = [
    ["Tag", `<${meta.tagName}>`],
    ["ID", meta.id || "—"],
    ["Classes", meta.classes.length ? meta.classes.join(" ") : "—"],
    ["Text preview", meta.innerTextPreview || "—"],
    ["CSS selector", meta.cssSelector],
    ["DOM path", meta.domPath.join(" › ")],
    ["URL", meta.pageUrl],
    ["Timestamp", meta.timestamp],
    ["Top", `${meta.boundingRect.top}px`],
    ["Left", `${meta.boundingRect.left}px`],
    ["Width", `${meta.boundingRect.width}px`],
    ["Height", `${meta.boundingRect.height}px`],
    ["Screenshot", "—  (hook: replace null with base64 data)"],
  ];

  const rowsHTML = rows
    .map(
      ([k, v]) =>
        `<div class="${PREFIX}-meta-row">
           <span class="${PREFIX}-meta-key">${k}</span>
           <span class="${PREFIX}-meta-val">${escapeHTML(v)}</span>
         </div>`
    )
    .join("");

  return `
    <div class="${PREFIX}-meta-section">
      <div class="${PREFIX}-meta-label">Element metadata</div>
      <div class="${PREFIX}-meta-grid">${rowsHTML}</div>
    </div>
  `;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createModal(meta: ElementMetadata): {
  backdrop: HTMLDivElement;
  modal: HTMLDivElement;
} {
  const backdrop = document.createElement("div");
  backdrop.id = ID.backdrop;

  const modal = document.createElement("div");
  modal.id = ID.modal;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", `${PREFIX}-modal-title`);

  modal.innerHTML = `
    <div class="${PREFIX}-modal-header">
      <span class="${PREFIX}-modal-title" id="${PREFIX}-modal-title">Element Feedback</span>
      <button class="${PREFIX}-close-btn" id="${ID.cancelBtn}" aria-label="Close feedback dialog" title="Close">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <div class="${PREFIX}-modal-body">
      ${createMetadataHTML(meta)}

      <div>
        <label class="${PREFIX}-field-label" for="${ID.textarea}">
          Your feedback
        </label>
        <textarea
          id="${ID.textarea}"
          placeholder="Describe the issue or feedback…"
          aria-required="true"
          rows="4"
        ></textarea>
      </div>
    </div>

    <div class="${PREFIX}-modal-footer">
      <span id="${ID.statusMsg}" role="status" aria-live="polite"></span>
      <div class="${PREFIX}-btn-group">
        <button id="${ID.sendBtn}" type="button">Send</button>
      </div>
    </div>
  `;

  return { backdrop, modal };
}

// ─────────────────────────────────────────────
// API logic
// ─────────────────────────────────────────────

async function postFeedback(endpoint: string, payload: FeedbackPayload): Promise<void> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`Server responded with ${res.status}: ${text}`);
  }
}

// ─────────────────────────────────────────────
// Selection logic
// ─────────────────────────────────────────────

type SelectionHandlers = {
  mouseover: (e: MouseEvent) => void;
  mouseout: (e: MouseEvent) => void;
  click: (e: MouseEvent) => void;
  keydown: (e: KeyboardEvent) => void;
};

function startSelectionMode(
  overlay: HTMLDivElement,
  modalRoot: HTMLDivElement | null,
  onSelect: (el: Element) => void,
  onCancel: () => void
): SelectionHandlers {
  document.body.classList.add(`${PREFIX}-selecting`);

  const handlers: SelectionHandlers = {
    mouseover(e: MouseEvent) {
      const target = e.target as Element;

      // Do not highlight anything inside our own UI
      if (target.closest(`#${ID.button}`) || target.closest(`#${ID.modal}`) || target.closest(`#${ID.backdrop}`)) {
        overlay.classList.add(`${PREFIX}-hidden`);
        return;
      }

      const rect = target.getBoundingClientRect();
      overlay.style.top = `${rect.top}px`;
      overlay.style.left = `${rect.left}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      overlay.classList.remove(`${PREFIX}-hidden`);
    },

    mouseout(e: MouseEvent) {
      const related = e.relatedTarget as Element | null;
      if (!related || related === document.documentElement) {
        overlay.classList.add(`${PREFIX}-hidden`);
      }
    },

    click(e: MouseEvent) {
      const target = e.target as Element;

      // Ignore clicks on our own UI
      if (
        target.closest(`#${ID.button}`) ||
        target.closest(`#${ID.modal}`) ||
        target.closest(`#${ID.backdrop}`)
      ) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      onSelect(target);
    },

    keydown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCancel();
      }
    },
  };

  // Attach to document to work regardless of React synthetic events.
  // useCapture=true ensures we intercept before React's event system.
  document.addEventListener("mouseover", handlers.mouseover, { capture: true });
  document.addEventListener("mouseout", handlers.mouseout, { capture: true });
  document.addEventListener("click", handlers.click, { capture: true });
  document.addEventListener("keydown", handlers.keydown, { capture: true });

  return handlers;
}

function stopSelectionMode(handlers: SelectionHandlers, overlay: HTMLDivElement): void {
  document.body.classList.remove(`${PREFIX}-selecting`);
  overlay.classList.add(`${PREFIX}-hidden`);

  document.removeEventListener("mouseover", handlers.mouseover, { capture: true });
  document.removeEventListener("mouseout", handlers.mouseout, { capture: true });
  document.removeEventListener("click", handlers.click, { capture: true });
  document.removeEventListener("keydown", handlers.keydown, { capture: true });
}

// ─────────────────────────────────────────────
// Modal logic
// ─────────────────────────────────────────────

type ModalCleanup = () => void;

function openModal(
  meta: ElementMetadata,
  config: FeedbackButtonConfig,
  onClose: () => void
): ModalCleanup {
  const { backdrop, modal } = createModal(meta);
  document.body.appendChild(backdrop);
  document.body.appendChild(modal);

  const textarea = document.getElementById(ID.textarea) as HTMLTextAreaElement;
  const sendBtn = document.getElementById(ID.sendBtn) as HTMLButtonElement;
  const cancelBtn = document.getElementById(ID.cancelBtn) as HTMLButtonElement;
  const statusMsg = document.getElementById(ID.statusMsg) as HTMLSpanElement;

  let state: ModalState = "open";

  function setModalState(next: ModalState): void {
    state = next;

    statusMsg.className = "";
    statusMsg.textContent = "";

    switch (next) {
      case "sending":
        sendBtn.disabled = true;
        sendBtn.innerHTML = `<span class="${PREFIX}-spinner"></span>Sending…`;
        break;
      case "success":
        sendBtn.disabled = false;
        sendBtn.textContent = "Send";
        statusMsg.textContent = "Feedback sent — thank you!";
        statusMsg.classList.add(`${PREFIX}-success`);
        break;
      case "error":
        sendBtn.disabled = false;
        sendBtn.textContent = "Send";
        break;
      default:
        sendBtn.disabled = false;
        sendBtn.textContent = "Send";
    }
  }

  async function handleSend(): Promise<void> {
    if (state === "sending") return;

    const message = textarea.value.trim();
    if (!message) {
      textarea.focus();
      textarea.style.borderColor = "#f87171";
      setTimeout(() => {
        textarea.style.borderColor = "";
      }, 1500);
      return;
    }

    setModalState("sending");

    const payload: FeedbackPayload = { message, metadata: meta };

    try {
      await postFeedback(config.endpoint, payload);
      setModalState("success");
      config.onSuccess?.(payload);

      // Auto-close after success
      setTimeout(() => cleanup(), 1800);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setModalState("error");
      statusMsg.textContent = `Error: ${error.message}`;
      statusMsg.classList.add(`${PREFIX}-error`);
      config.onError?.(error);
    }
  }

  function cleanup(): void {
    backdrop.remove();
    modal.remove();
    onClose();
  }

  // Trap focus inside modal for accessibility
  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      cleanup();
      return;
    }

    if (e.key === "Tab") {
      const focusable = Array.from(
        modal.querySelectorAll<HTMLElement>(
          "button:not(:disabled), textarea, [tabindex]:not([tabindex='-1'])"
        )
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  sendBtn.addEventListener("click", () => void handleSend());
  cancelBtn.addEventListener("click", cleanup);
  backdrop.addEventListener("click", cleanup);
  document.addEventListener("keydown", handleKeydown, { capture: true });

  // Focus textarea on open
  setTimeout(() => textarea.focus(), 50);

  return () => {
    document.removeEventListener("keydown", handleKeydown, { capture: true });
    backdrop.remove();
    modal.remove();
  };
}

// ─────────────────────────────────────────────
// Main controller class (module-private)
// ─────────────────────────────────────────────

class FeedbackController {
  readonly #config: FeedbackButtonConfig;
  #button: HTMLButtonElement | null = null;
  #overlay: HTMLDivElement | null = null;
  #selectionHandlers: SelectionHandlers | null = null;
  #modalCleanup: ModalCleanup | null = null;
  #isSelecting = false;

  constructor(config: FeedbackButtonConfig) {
    this.#config = config;
  }

  mount(): void {
    injectCSS(buildCSS(this.#config.position));

    const button = createTriggerButton(this.#config.buttonLabel ?? "Feedback");
    const overlay = createHighlightOverlay();

    button.addEventListener("click", () => this.#handleButtonClick());

    document.body.appendChild(button);
    document.body.appendChild(overlay);

    this.#button = button;
    this.#overlay = overlay;
  }

  destroy(): void {
    this.#stopSelection();
    this.#modalCleanup?.();
    this.#modalCleanup = null;

    removeElement(ID.button);
    removeElement(ID.overlay);
    removeElement(ID.styleTag);
    removeElement(ID.backdrop);
    removeElement(ID.modal);

    document.body.classList.remove(`${PREFIX}-selecting`);

    this.#button = null;
    this.#overlay = null;
  }

  #handleButtonClick(): void {
    if (this.#isSelecting) {
      this.#stopSelection();
    } else {
      this.#startSelection();
    }
  }

  #startSelection(): void {
    if (!this.#button || !this.#overlay) return;

    this.#isSelecting = true;
    this.#button.setAttribute("aria-pressed", "true");
    this.#button.querySelector("span")!.textContent = "Click an element";

    this.#selectionHandlers = startSelectionMode(
      this.#overlay,
      document.getElementById(ID.modal) as HTMLDivElement | null,
      (el) => this.#onElementSelected(el),
      () => this.#stopSelection()
    );
  }

  #stopSelection(): void {
    if (!this.#button || !this.#overlay) return;

    this.#isSelecting = false;
    this.#button.setAttribute("aria-pressed", "false");
    this.#button.querySelector("span")!.textContent =
      this.#config.buttonLabel ?? "Feedback";

    if (this.#selectionHandlers) {
      stopSelectionMode(this.#selectionHandlers, this.#overlay);
      this.#selectionHandlers = null;
    }
  }

  #onElementSelected(el: Element): void {
    this.#stopSelection();

    const meta = extractMetadata(el);

    this.#modalCleanup = openModal(meta, this.#config, () => {
      this.#modalCleanup = null;
    });
  }
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/** Singleton reference — prevents duplicate initialization */
let _controller: FeedbackController | null = null;

/**
 * Initialize the feedback button.
 * Safe to call multiple times — subsequent calls are no-ops unless destroyed first.
 *
 * @example
 * import { initFeedbackButton } from "./inspect-dom-capture";
 * initFeedbackButton({ endpoint: "/api/feedback" });
 */
export function initFeedbackButton(config: FeedbackButtonConfig): void {
  if (_controller !== null) {
    // Already initialized — skip to prevent duplicates in React Strict Mode double-invoke
    return;
  }

  _controller = new FeedbackController(config);
  _controller.mount();
}

/**
 * Tear down the feedback button and all associated DOM / listeners.
 * Call this on SPA route changes if you want to remove it, or for testing cleanup.
 *
 * @example
 * destroyFeedbackButton();
 */
export function destroyFeedbackButton(): void {
  _controller?.destroy();
  _controller = null;
}
