// ─────────────────────────────────────────────────────────────────────────────
// roiCalc.js
// Single source of truth for all ROI calculations.
// Used by auditEngine.js at generation time AND by AssumptionsEditor at runtime
// so the live sliders always produce identical numbers to the original report.
// ─────────────────────────────────────────────────────────────────────────────

export function calcROI(automationName, {
  avgJobValue   = 150,
  monthlyJobs   = 20,
  missedCallRate = 0.25,   // decimal  e.g. 0.27
  noShowRate    = 0.15,    // decimal  e.g. 0.18
  leadCloseRate = 0.13,    // decimal  e.g. 0.13  (% of non-bookers who convert with follow-up)
  industry      = "Healthcare",
  bizName       = "your business",
} = {}) {
  const r50 = n => Math.max(50, Math.round(n / 50) * 50);
  const pct = n => `${Math.round(n * 100)}%`;
  const $   = n => `$${Math.round(n).toLocaleString()}`;
  // Don't cite a healthcare-specific source under a barber or a law firm.
  const isHealth = ["Healthcare", "Dental", "Chiropractic", "Med Spa"].includes(industry);

  switch (automationName) {

    case "Missed Call Text Back": {
      const missed    = Math.max(3, Math.round(monthlyJobs * missedCallRate));
      const recovered = Math.max(1, Math.round(missed * 0.22));
      const amount    = recovered * avgJobValue;
      return {
        roiAmt: r50(amount),
        steps: [
          `${bizName} is estimated to miss ~${missed} calls/month (${pct(missedCallRate)} miss rate for ${industry})`,
          `Text-back systems recover ~22% of those missed callers into actual bookings`,
          `${missed} missed calls × 22% = ${recovered} extra bookings × ${$(avgJobValue)} avg = ${$(amount)}/mo`,
        ],
        source: "BrightLocal 2023 Local Business Benchmark Report",
      };
    }

    case "Appointment Reminder Messages": {
      const noShows   = Math.max(1, Math.round(monthlyJobs * noShowRate));
      const prevented = Math.max(1, Math.round(noShows * 0.52));
      const amount    = prevented * avgJobValue;
      return {
        roiAmt: r50(amount),
        steps: [
          `${pct(noShowRate)} no-show rate × ${monthlyJobs} ${bizName} appointments = ~${noShows} no-shows/month`,
          `Day-before + 1-hour reminder texts prevent ~52% of those no-shows`,
          `${noShows} no-shows × 52% prevented = ${prevented} recovered × ${$(avgJobValue)} avg = ${$(amount)}/mo`,
        ],
        source: isHealth
          ? "MGMA healthcare no-show data; appointment-reminder meta-analysis (Guse et al.)"
          : "Appointment-reminder no-show studies (Guse et al.); industry no-show benchmarks",
      };
    }

    case "Automatic Review Requests": {
      const extra  = Math.max(1, Math.round(monthlyJobs * 0.12));
      const amount = extra * avgJobValue;
      return {
        roiAmt: r50(amount),
        steps: [
          `${industry} businesses going 3.8→4.5 stars on Google see ~12% more calls from the map listing`,
          `${monthlyJobs} current ${bizName} jobs/month × 12% = ${extra} extra bookings per month`,
          `${extra} extra bookings × ${$(avgJobValue)} avg = ${$(amount)}/mo`,
        ],
        source: "Harvard Business School study: 1-star Google increase = 5–9% revenue increase",
      };
    }

    case "Automatic Customer Follow-Up": {
      const nonBookers = Math.max(2, Math.round(monthlyJobs * 0.42));
      const converted  = Math.max(1, Math.round(nonBookers * leadCloseRate));
      const amount     = converted * avgJobValue;
      return {
        roiAmt: r50(amount),
        steps: [
          `~42% of people who contact ${bizName} don't book on their first enquiry`,
          `Your follow-up system converts ~${pct(leadCloseRate)} of those into bookings over 14 days`,
          `${nonBookers} non-bookers/month × ${pct(leadCloseRate)} = ${converted} recovered × ${$(avgJobValue)} avg = ${$(amount)}/mo`,
        ],
        source: "Salesforce State of Sales Report; Marketing Sherpa follow-up conversion data",
      };
    }

    case "24/7 Website Chat": {
      const extra  = Math.max(1, Math.round(monthlyJobs * 0.13));
      const amount = extra * avgJobValue;
      return {
        roiAmt: r50(amount),
        steps: [
          `~40% of visits to ${bizName}'s website happen outside business hours — no one can respond`,
          `Businesses with 24/7 chat book ~13% more appointments by capturing those after-hours visitors`,
          `${monthlyJobs} current jobs × 13% = ${extra} extra bookings × ${$(avgJobValue)} avg = ${$(amount)}/mo`,
        ],
        source: "Drift 2022 Live Chat Benchmark Report; Intercom conversion research",
      };
    }

    case "Customer Enquiry Tracker": {
      const extra  = Math.max(1, Math.round(monthlyJobs * 0.11));
      const amount = extra * avgJobValue;
      return {
        roiAmt: r50(amount),
        steps: [
          `Without a tracking system, ~15–20% of ${bizName}'s enquiries get forgotten or never followed up`,
          `Businesses that track every enquiry convert ~11% more of them into paying jobs`,
          `${monthlyJobs} current jobs × 11% = ${extra} extra bookings × ${$(avgJobValue)} avg = ${$(amount)}/mo`,
        ],
        source: "HubSpot CRM adoption study; Salesforce SMB pipeline data",
      };
    }

    case "Monthly Customer Emails": {
      const returning = Math.max(1, Math.round(monthlyJobs * 0.09));
      const amount    = returning * avgJobValue;
      return {
        roiAmt: r50(amount),
        steps: [
          `${industry} businesses that stay in regular contact with past customers see ~9% more repeat visits`,
          `These are customers who would have gone elsewhere — or simply forgotten about ${bizName}`,
          `${monthlyJobs} current jobs × 9% = ${returning} extra returning customers × ${$(avgJobValue)} avg = ${$(amount)}/mo`,
        ],
        source: "Bain & Company: 5% retention increase = 25–95% revenue growth",
      };
    }

    case "Win-Back Messages": {
      const dormant     = Math.max(3, Math.round(monthlyJobs * 0.22));
      const reactivated = Math.max(1, Math.round(dormant * 0.10));
      const amount      = reactivated * avgJobValue;
      return {
        roiAmt: r50(amount),
        steps: [
          `~22% of ${bizName}'s past customers haven't returned in 90+ days — they've drifted without noticing`,
          `A personal win-back text with a simple offer reactivates ~10% of those customers`,
          `${dormant} dormant customers × 10% = ${reactivated} returning × ${$(avgJobValue)} avg = ${$(amount)}/mo`,
        ],
        source: "Klaviyo win-back campaign benchmark data (2023)",
      };
    }

    case "Online Booking": {
      const extra  = Math.max(1, Math.round(monthlyJobs * 0.21));
      const amount = extra * avgJobValue;
      return {
        roiAmt: r50(amount),
        steps: [
          `People book at 9pm, on weekends — if ${bizName} doesn't have online booking, they call a competitor who does`,
          `Businesses adding online booking fill ~21% more appointments within 90 days`,
          `${monthlyJobs} current jobs × 21% = ${extra} extra bookings × ${$(avgJobValue)} avg = ${$(amount)}/mo`,
        ],
        source: "Acuity Scheduling customer data; Square Appointments 2023 report",
      };
    }

    default: {
      const amount = monthlyJobs * avgJobValue * 0.12;
      return {
        roiAmt: r50(amount),
        steps: [
          `Estimated based on ${industry} industry averages for businesses like ${bizName}`,
          `Typical improvement: ~12% more bookings with this system in place`,
          `${monthlyJobs} current jobs × 12% × ${$(avgJobValue)} avg = ${$(amount)}/mo`,
        ],
        source: "Industry benchmark data",
      };
    }
  }
}
