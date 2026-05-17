export const quarterWindowDays = 21;

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function isWindowOpen(openDate: Date, closeDate: Date, bypassWindow: boolean, now = new Date()): boolean {
  return bypassWindow || (now >= openDate && now <= closeDate);
}

export function cycleStatus(cycle: {
  goalSettingOpen: Date;
  q1Open: Date;
  q2Open: Date;
  q3Open: Date;
  q4Open: Date;
  endDate: Date;
  bypassWindow: boolean;
}) {
  const checkIns = {
    Q1: {
      opensAt: cycle.q1Open,
      closesAt: addDays(cycle.q1Open, quarterWindowDays),
      isOpen: isWindowOpen(cycle.q1Open, addDays(cycle.q1Open, quarterWindowDays), cycle.bypassWindow)
    },
    Q2: {
      opensAt: cycle.q2Open,
      closesAt: addDays(cycle.q2Open, quarterWindowDays),
      isOpen: isWindowOpen(cycle.q2Open, addDays(cycle.q2Open, quarterWindowDays), cycle.bypassWindow)
    },
    Q3: {
      opensAt: cycle.q3Open,
      closesAt: addDays(cycle.q3Open, quarterWindowDays),
      isOpen: isWindowOpen(cycle.q3Open, addDays(cycle.q3Open, quarterWindowDays), cycle.bypassWindow)
    },
    Q4: {
      opensAt: cycle.q4Open,
      closesAt: cycle.endDate,
      isOpen: isWindowOpen(cycle.q4Open, cycle.endDate, cycle.bypassWindow)
    }
  } as const;

  const activeQuarter = (Object.entries(checkIns).find(([, value]) => value.isOpen)?.[0] ?? null) as
    | 'Q1'
    | 'Q2'
    | 'Q3'
    | 'Q4'
    | null;

  const now = new Date();
  const nextWindow =
    [...Object.values(checkIns)]
      .map((window) => window.opensAt)
      .find((date) => date > now) ?? null;
  const daysRemaining =
    activeQuarter != null
      ? Math.max(0, Math.ceil((checkIns[activeQuarter].closesAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : null;

  return {
    bypassWindow: cycle.bypassWindow,
    goalSetting: {
      opensAt: cycle.goalSettingOpen,
      closesAt: cycle.q1Open,
      isOpen: isWindowOpen(cycle.goalSettingOpen, cycle.q1Open, cycle.bypassWindow)
    },
    checkIns,
    activeQuarter,
    nextWindowDate: nextWindow?.toISOString() ?? null,
    daysRemaining
  };
}
