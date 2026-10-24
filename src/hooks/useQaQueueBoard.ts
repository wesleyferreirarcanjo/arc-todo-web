import { useEffect, useState } from 'react';
import { fetchQaQueue } from '../lib/api/qaQueue';

export function useQaQueueBoard() {
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void fetchQaQueue()
      .then((queue) => {
        if (!cancelled) setQueueCount(queue.items.length);
      })
      .catch(() => {
        if (!cancelled) setQueueCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { queueCount };
}
