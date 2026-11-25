// Sri Lanka currently observes UTC+05:30 year-round. Use explicit Colombo
// calendar boundaries rather than the deployment server's local timezone.
const COLOMBO_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

export type DashboardPeriod = 'week' | 'month' | 'year';
type CalendarPeriod = DashboardPeriod | 'day';

/** Half-open [start, end) calendar period; weeks start on Monday. */
export function dashboardPeriodBounds(period: CalendarPeriod, now = new Date()): { start: Date; end: Date } {
    const colombo = new Date(now.getTime() + COLOMBO_OFFSET_MS);
    const year = colombo.getUTCFullYear();
    const month = colombo.getUTCMonth();
    const date = colombo.getUTCDate();
    const localMidnight = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d) - COLOMBO_OFFSET_MS);

    if (period === 'year') return {start: localMidnight(year, 0, 1), end: localMidnight(year + 1, 0, 1)};
    if (period === 'month') return {start: localMidnight(year, month, 1), end: localMidnight(year, month + 1, 1)};
    if (period === 'week') {
        const daysSinceMonday = (colombo.getUTCDay() + 6) % 7;
        return {
            start: localMidnight(year, month, date - daysSinceMonday),
            end: localMidnight(year, month, date - daysSinceMonday + 7)
        };
    }
    return {start: localMidnight(year, month, date), end: localMidnight(year, month, date + 1)};
}