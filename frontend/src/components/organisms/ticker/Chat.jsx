import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const CHAT_URL = 'http://localhost:3000/chat';

export default function Chat({ context }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');

    const userMsg = { role: 'user', content: text };
    const nextMessages = [...messages.filter((m) => typeof m.content === 'string'), userMsg];
    setMessages([...nextMessages, { role: 'assistant', content: '' }]);
    setStreaming(true);

    try {
      const token = localStorage.getItem('auth_token') ?? '';
      const res = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: nextMessages, context }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = JSON.parse(line.slice(6));
          if (payload.text) {
            setMessages((prev) => {
              const copy = [...prev];
              copy[copy.length - 1] = { role: 'assistant', content: copy[copy.length - 1].content + payload.text };
              return copy;
            });
          }
          if (payload.error) {
            setMessages((prev) => {
              const copy = [...prev];
              copy[copy.length - 1] = { role: 'assistant', content: `Error: ${payload.error}` };
              return copy;
            });
          }
        }
      }
    } catch (e) {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: 'assistant', content: `Error: ${e.message}` };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="chat">
      <div className="chat-messages">
        {messages.length === 0 && <p className="chat-empty">Ask anything about this stock…</p>}
        {messages
          .filter((m) => typeof m.content === 'string')
          .map((m, i) => (
            <div key={i} className={`chat-row chat-row--${m.role}`}>
              <div className={`chat-bubble chat-bubble--${m.role}`}>
                {m.content}
                {streaming && i === messages.length - 1 && m.role === 'assistant' && (
                  <span className="chat-cursor">▋</span>
                )}
              </div>
            </div>
          ))}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-row">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask about this stock…"
          disabled={streaming}
          className="chat-input"
        />
        <Button onClick={send} disabled={streaming || !input.trim()}>
          {streaming ? '…' : 'Send'}
        </Button>
      </div>
    </div>
  );
}
