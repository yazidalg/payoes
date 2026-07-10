"use client";

import { useCallback } from "react";
import { useAsyncData } from "@/hooks/use-async-data";
import { TableEmptyState } from "@/ui/shared/table-empty-state";
import { StackY3 } from "@dub/ui/icons";

type ApiLogRow = {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  createdAt: string;
};

export function ApiLogsTable({ organizationId }: { organizationId: string }) {
  const fetchLogs = useCallback(async () => {
    const response = await fetch(`/api/organizations/${organizationId}/api-logs`);
    const data = (await response.json()) as { logs?: ApiLogRow[] };
    return data.logs ?? [];
  }, [organizationId]);

  const { data: logs } = useAsyncData(fetchLogs, [organizationId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">API Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Inspect recent API requests made with your keys.
        </p>
      </div>

      {(logs ?? []).length === 0 ? (
        <TableEmptyState
          title="No API logs yet"
          description="API requests made with your keys will appear here."
          icon={<StackY3 className="size-4 text-neutral-700" />}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/80">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Path</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {(logs ?? []).map((log) => (
                <tr key={log.id} className="border-t border-border/60">
                  <td className="px-4 py-3 font-mono text-xs">{log.method}</td>
                  <td className="px-4 py-3 font-mono text-xs">{log.path}</td>
                  <td className="px-4 py-3">{log.statusCode}</td>
                  <td className="px-4 py-3">{log.durationMs}ms</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
