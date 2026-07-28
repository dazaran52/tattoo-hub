'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function OnlinePresenceTracker() {
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let currentSession: any = null;

    const ping = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/profile/ping`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
      } catch (err) {
        // Ignore ping errors
      }
    };

    const startPinging = () => {
      ping();
      interval = setInterval(ping, 2 * 60 * 1000);
    };

    const stopPinging = () => {
      if (interval) clearInterval(interval);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        currentSession = session;
        startPinging();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        if (!currentSession) {
          currentSession = session;
          startPinging();
        }
      } else {
        currentSession = null;
        stopPinging();
      }
    });

    return () => {
      stopPinging();
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
