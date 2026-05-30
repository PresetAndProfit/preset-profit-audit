// api/send-report.js — Vercel Serverless Function stub
// Upgrade path: send the branded HTML audit report via SendGrid or Resend.
//
// Example implementation with Resend:
//   import { Resend } from "resend";
//   const resend = new Resend(process.env.RESEND_API_KEY);
//
// POST /api/send-report
// Body: { to: string, reportHtml: string, businessName: string }
// Returns: { success: true } or { error: string }

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // TODO: Replace with real email delivery
  // const { to, reportHtml, businessName } = req.body;
  //
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: "Preset & Profit <reports@presetandprofit.com>",
  //   to,
  //   subject: `Your Automation Audit Report — ${businessName}`,
  //   html: reportHtml,
  // });
  //
  // return res.status(200).json({ success: true });

  return res.status(501).json({
    error: "Not implemented — wire up RESEND_API_KEY and replace this stub.",
  });
}
