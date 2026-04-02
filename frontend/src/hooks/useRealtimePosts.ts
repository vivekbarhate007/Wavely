import { useEffect, useRef, useState } from "react";

export interface LivePost {
  post_id: string;
  subreddit: string;
  title: string;
  author: string;
  url: string;
  upvote_score: number;
  sentiment: "positive" | "negative" | "neutral";
  confidence: number;
  reasoning: string;
  topics: string[];
}

const WS_URL = `ws://${window.location.hostname}:8002/ws`;

export function useRealtimePosts(maxPosts = 10) {
  const [posts, setPosts]       = useState<LivePost[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen  = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        setTimeout(connect, 3000);   // auto-reconnect
      };
      ws.onerror = () => ws.close();

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "new_post") {
            setPosts((prev) => [msg.data, ...prev].slice(0, maxPosts));
          }
        } catch { /* ignore */ }
      };
    }

    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [maxPosts]);

  return { posts, connected };
}
