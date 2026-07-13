import { CTA } from "./cta";
import { Developers } from "./developers";
import { Features } from "./features";
import { Hero } from "./hero";
import { Logos } from "./logos";

export default function Home() {
  return (
    <>
      <Hero />
      <Logos />
      <Features />
      <Developers />
      <CTA />
    </>
  );
}
