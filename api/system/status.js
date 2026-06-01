// api/system/status.js — PUBLIC, unauthenticated. Returns only the boolean
// operational flags so the client can show a maintenance screen, hide the
// signup form, etc. No secrets, no user data. Real enforcement of checkout/
// audit disabling happens server-side in the respective endpoints.
import { getSettings } from "../_lib/systemSettings.js";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ error: "method-not-allowed" });
  const s = await getSettings();
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    maintenance: !!s.maintenance_mode,
    signupsDisabled: !!s.signups_disabled,
    checkoutDisabled: !!s.checkout_disabled,
    auditsDisabled: !!s.audits_disabled,
  });
}
