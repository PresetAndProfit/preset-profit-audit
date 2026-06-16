// src/sources/mentions.js — intake adapter: Instagram Mentions.
import { makeIgAdapter } from "./_igFeed.js";

export default makeIgAdapter({
  id: "mentions",
  label: "Mentions",
  source: "mention",
  file: "mentions.jsonl",
  endpoint: "GET /{ig-user-id}/mentioned_media",
});
