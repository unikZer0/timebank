import { getDashboardStatsQuery, getMonthlyStatsQuery } from "../db/queries_admin/dashboard.js";

export const getDashboardStats = async (req, res) => {
  try {
    const stats = await getDashboardStatsQuery();

    return res.status(200).json({
      success: true,
      data: {
        total_members: stats.total_members,
        total_system_hours: stats.total_system_hours,
        successful_missions: stats.successful_missions,
        requests_or_in_progress: stats.requests_or_in_progress,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const getDashboardMonthlyStats = async (req, res) => {
  try {
    const rows = await getMonthlyStatsQuery();
    return res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error("Error fetching dashboard monthly stats:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};


