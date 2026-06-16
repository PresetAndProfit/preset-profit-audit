// src/sources/manualUrl.js — intake adapter: Manual URL Input.
export default {
  id: "url",
  label: "Manual URL Input",
  source: "url",
  async pull({ url, ...rest } = {}) {
    return url ? [{ source: "url", media_url: url, ...rest }] : [];
  },
};
