declare module "*.tsx" {
  import type { ReactElement } from "react";

  const component: (props: Record<string, unknown>) => ReactElement;
  export default component;
}
