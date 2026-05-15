import { BASE } from "./core.js";

export function streamResearch(ticker, onSection, onText, onDone, onError) {
  const token = localStorage.getItem("auth_token") ?? "";
  const es = new EventSource(`${BASE}/research/${ticker}?token=${encodeURIComponent(token)}`);
  es.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.section) onSection(msg.section);
    else if (msg.text) onText(msg.text);
    else if (msg.sectionDone) onText("\n\n");
    else if (msg.done) { onDone(); es.close(); }
    else if (msg.error) { onError(msg.error); es.close(); }
  };
  es.onerror = () => { onError("Connection error"); es.close(); };
  return () => es.close();
}
