/**
 * Example usage — import this module into any web app entry point.
 * Works with React, Vue, Angular, or plain HTML.
 */
import { initFeedbackButton, destroyFeedbackButton } from "./inspect-dom-capture";

// Minimal usage
initFeedbackButton({
  endpoint: "/api/feedback",
});

// Full config
initFeedbackButton({
  endpoint: "https://myapp.example.com/api/feedback",
  buttonLabel: "Report issue",
  position: "bottom-right",
  onSuccess(payload) {
    console.log("Feedback sent", payload);
  },
  onError(err) {
    console.error("Feedback failed", err);
  },
});

// SPA route-change cleanup (e.g. React Router, Next.js)
// router.beforeEach(() => destroyFeedbackButton());
void destroyFeedbackButton; // referenced to avoid unused-import lint warnings
