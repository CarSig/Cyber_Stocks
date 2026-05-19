import { useState } from 'react';
import type { SimulationResult } from '@/types';

export function useSimulation() {
  const [result, setResult] = useState<SimulationResult | null>(null);
  return { result, onResult: setResult };
}
