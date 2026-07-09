export type MetricTab = "volume" | "payments" | "successRate";

export type AnalyticsBreakdownItem = {
  key: string;
  label: string;
  value: number;
};

export type DashboardAnalyticsTimeseriesPoint = {
  date: string;
  volume: number;
  payments: number;
  successRate: number;
};

export type DashboardAnalytics = {
  totals: {
    volume: number;
    payments: number;
    successRate: number;
  };
  timeseries: DashboardAnalyticsTimeseriesPoint[];
  breakdowns: {
    paymentMethods: AnalyticsBreakdownItem[];
    assets: AnalyticsBreakdownItem[];
    status: AnalyticsBreakdownItem[];
    customers: AnalyticsBreakdownItem[];
  };
};
