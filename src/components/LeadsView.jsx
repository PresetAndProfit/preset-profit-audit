// LeadsView is now a thin wrapper over the unified PipelineBoard — the Lead
// Pipeline nav item renders the full CRM. Kept as a stable import surface so
// AppShell wiring and any deep links don't change.
import PipelineBoard from "./PipelineBoard.jsx";

export default function LeadsView(props) {
  return <PipelineBoard {...props} />;
}
