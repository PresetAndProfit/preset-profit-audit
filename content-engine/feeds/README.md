# Intake feed queues

Each Instagram intake source drains a newline-delimited JSON (`.jsonl`) queue here.
A real connector (Graph API poller or webhook receiver) appends one object per line;
`node cli.js intake-pull` drains them into the submission queue. Set `IG_ACCESS_TOKEN`
to enable live polling (the adapter then also reads these files).

| Source | File |
|---|---|
| Tagged Posts | `tagged_posts.jsonl` |
| Mentions | `mentions.jsonl` |
| DM Submissions | `dm.jsonl` |

One line = one submission. Fields (all optional except a media reference):

```json
{"instagram_username":"sprint_b7","media_url":"https://instagram.com/p/ABC/","caption_original":"tagged you!","car_model":"Audi RS4 B7","color":"Sprint Blue","mods":"coilovers, CH-R"}
```

For an image the engine can analyze with vision, include `local_image_path` instead of
(or alongside) `media_url`. Generic niches can use `subject`/`descriptor`/`details`
instead of `car_model`/`color`/`mods`.
