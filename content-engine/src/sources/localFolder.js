// src/sources/localFolder.js — intake adapter: Local Upload Folder.
import { readInboxRaws } from "../intake.js";
import { PATHS } from "../env.js";

export default {
  id: "folder",
  label: "Local Upload Folder",
  source: "upload",
  async pull({ folder = PATHS.inbox } = {}) {
    return readInboxRaws(folder, "upload");
  },
};
