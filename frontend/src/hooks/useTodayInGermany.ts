// Today in Germany for the rule checks and the personas (research R9): the one clock of the date
// that rules about ages and dates are judged on
import { TODAY_REFRESH_MS } from '@connection-portal/rules/checks/constants';
import { todayInGermany } from '@connection-portal/rules/dates';
import { useEffect, useState } from 'react';

/** Today in Germany, `YYYY-MM-DD`, read again every minute and when the page becomes visible */
export function useTodayInGermany(): string {
  const [today, setToday] = useState(() => todayInGermany());

  useEffect(() => {
    function refresh() {
      setToday(todayInGermany());
    }
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    }
    const timer = window.setInterval(refresh, TODAY_REFRESH_MS);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return today;
}
