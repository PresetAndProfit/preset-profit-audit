// src/sources/taggedPosts.js — intake adapter: Instagram Tagged Posts.
import { makeIgAdapter } from "./_igFeed.js";

export default makeIgAdapter({
  id: "tagged",
  label: "Tagged Posts",
  source: "tagged_post",
  file: "tagged_posts.jsonl",
  endpoint: "GET /{ig-user-id}/tags",
});
