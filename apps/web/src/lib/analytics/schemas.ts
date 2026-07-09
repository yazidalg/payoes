import { z } from "zod";

const MAX_RANGE_MS = 366 * 24 * 60 * 60 * 1000;

export const analyticsQuerySchema = z
  .object({
    from: z.string().datetime({ offset: true }),
    to: z.string().datetime({ offset: true }),
  })
  .superRefine((value, ctx) => {
    const from = new Date(value.from);
    const to = new Date(value.to);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid date range",
      });
      return;
    }

    if (from > to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Start date must be before end date",
      });
      return;
    }

    if (to.getTime() - from.getTime() > MAX_RANGE_MS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Date range cannot exceed one year",
      });
    }
  });

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
