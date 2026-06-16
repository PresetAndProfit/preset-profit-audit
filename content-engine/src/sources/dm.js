// src/sources/dm.js — intake adapter: Instagram DM Submissions.
import { makeIgAdapter } from "./_igFeed.js";

export default makeIgAdapter({
  id: "dm",
  label: "DM Submissions",
  source: "dm",
  file: "dm.jsonl",
  endpoint: "GET /{ig-user-id}/conversations (messaging)",
});
