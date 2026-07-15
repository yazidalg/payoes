import { FeaturesSection } from "@/ui/marketing/placeholders/features-section";
import { Hero } from "./hero";
import { Logos } from "./logos";

const UTM_PARAMS = {
  utm_source: "Custom Domain",
  utm_medium: "Welcome Page",
};

export default function Home() {
  return (
    <div>
      <Hero />
      <Logos />
      <FeaturesSection utmParams={UTM_PARAMS} />
    </div>
  );
}
