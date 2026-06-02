// Public marketing routes. Each page's body is authored as a static HTML
// fragment (easy to edit) and imported as a raw string; MarketingPage wraps it
// in the isolated .ppm shell and wires interactions. Keeps the premium serif/
// gold marketing layer fully separate from the application's design system.
import { MarketingPage } from "./MarketingLayout.jsx";

import home from "./pages/home.html?raw";
import about from "./pages/about.html?raw";
import methodology from "./pages/methodology.html?raw";
import sampleReport from "./pages/sample-report.html?raw";
import faq from "./pages/faq.html?raw";
import contact from "./pages/contact.html?raw";
import pricing from "./pages/pricing.html?raw";

export const Home          = () => <MarketingPage html={home} active="/" />;
export const About         = () => <MarketingPage html={about} active="/about" />;
export const Methodology   = () => <MarketingPage html={methodology} active="/methodology" />;
export const SampleReport  = () => <MarketingPage html={sampleReport} active="/sample-report" />;
export const Faq           = () => <MarketingPage html={faq} active="/faq" />;
export const Contact       = () => <MarketingPage html={contact} active="/contact" />;
export const Pricing       = () => <MarketingPage html={pricing} active="/pricing" />;
