import { BASE } from './core';

export function streamResearch(
  ticker: string,
  onSection: (section: string) => void,
  onText: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
): () => void {
  const token = localStorage.getItem('auth_token') ?? '';
  const es = new EventSource(`${BASE}/research/${ticker}?token=${encodeURIComponent(token)}`);
  es.onmessage = (e: MessageEvent<string>) => {
    const msg = JSON.parse(e.data) as {
      section?: string;
      text?: string;
      sectionDone?: boolean;
      done?: boolean;
      error?: string;
    };
    if (msg.section) onSection(msg.section);
    else if (msg.text) onText(msg.text);
    else if (msg.sectionDone) onText('\n\n');
    else if (msg.done) {
      onDone();
      es.close();
    } else if (msg.error) {
      onError(msg.error);
      es.close();
    }
  };
  es.onerror = () => {
    onError('Connection error');
    es.close();
  };
  return () => es.close();
}
