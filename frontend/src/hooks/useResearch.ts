import { useState, useCallback, useRef } from 'react';
import { streamResearch } from '@/api/research';
import type { ResearchSection } from '@/types';

export function useResearch(ticker: string) {
  const [sections, setSections] = useState<ResearchSection[] | null>(null);
  const [isPending, setIsPending] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);

  const run = useCallback(() => {
    if (cancelRef.current) cancelRef.current();
    setSections([]);
    setIsPending(true);
    let current: ResearchSection[] = [];
    cancelRef.current = streamResearch(
      ticker,
      (section) => {
        current = [...current, { title: section, text: '' }];
        setSections([...current]);
      },
      (text) => {
        if (!current.length) return;
        current = current.map((s, i) => (i === current.length - 1 ? { ...s, text: s.text + text } : s));
        setSections([...current]);
      },
      () => setIsPending(false),
      (err) => {
        setSections([{ title: 'Error', text: err }]);
        setIsPending(false);
      },
    );
  }, [ticker]);

  return { sections, isPending, run };
}
