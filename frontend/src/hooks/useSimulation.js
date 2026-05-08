import { useState } from "react";

export function useSimulation() {
  const [result, setResult] = useState(null);
  return { result, onResult: setResult };
}
