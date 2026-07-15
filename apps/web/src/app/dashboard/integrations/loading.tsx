import { IntegrationPlaceholder } from "@/ui/integrations/integration-placeholder";

export default function IntegrationsLoading() {
  return (
    <div
      className="grid grid-cols-1 gap-3 md:grid-cols-2"
      aria-busy="true"
      aria-label="Loading integrations"
    >
      <IntegrationPlaceholder />
      <IntegrationPlaceholder />
    </div>
  );
}
