import { query } from "../prosgresql.js";

// Aggregate high-level dashboard metrics for admins
export const getDashboardStatsQuery = async () => {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM users)::int AS total_members,
      COALESCE((SELECT SUM(balance) FROM wallets), 0)::float AS total_system_hours,
      (SELECT COUNT(*) FROM job_applications WHERE status = 'complete')::int AS successful_missions,
      (
        SELECT COUNT(*)
        FROM job_applications
        WHERE status IN ('pending','accepted','matched')
      )::int AS requests_or_in_progress
  `;

  const result = await query(sql);
  return result.rows[0];
};

// Monthly statistics for the last 12 months:
// - help requests: number of jobs created
// - successful: number of job completion transactions
export const getMonthlyStatsQuery = async () => {
  const sql = `
    WITH months AS (
      SELECT date_trunc('month', (CURRENT_DATE - INTERVAL '11 months')) + (INTERVAL '1 month' * gs.n) AS month_start
      FROM generate_series(0, 11) AS gs(n)
    ),
    jobs_by_month AS (
      SELECT date_trunc('month', created_at) AS month_start, COUNT(*) AS cnt
      FROM jobs
      GROUP BY 1
    ),
    success_by_month AS (
      SELECT date_trunc('month', created_at) AS month_start, COUNT(*) AS cnt
      FROM transactions
      WHERE type = 'job_completion'
      GROUP BY 1
    )
    SELECT 
      to_char(m.month_start, 'YYYY-MM') AS month,
      COALESCE(j.cnt, 0)::int AS help_requests,
      COALESCE(s.cnt, 0)::int AS successful
    FROM months m
    LEFT JOIN jobs_by_month j ON j.month_start = m.month_start
    LEFT JOIN success_by_month s ON s.month_start = m.month_start
    ORDER BY m.month_start
  `;

  const result = await query(sql);
  return result.rows;
};


