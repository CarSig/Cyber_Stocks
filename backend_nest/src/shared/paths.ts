import path from "path";

// At runtime (compiled): __dirname = backend_nest/dist/shared/
// At runtime (tsx dev):   __dirname = backend_nest/src/shared/
// Walk up 3 levels to reach backend_nest/
const BACKEND_ROOT = path.resolve(__dirname, "../../..");
const STORAGE = path.join(BACKEND_ROOT, "storage");
const SOCIALS = path.join(STORAGE, "socials");
const THREAT_INTEL = path.join(STORAGE, "threat-intel");

export const PATHS = {
  redditPosts: (subreddit: string) => path.join(SOCIALS, `reddit_${subreddit}.json`),
  kev: path.join(THREAT_INTEL, "kev.json"),
  nvd: path.join(THREAT_INTEL, "nvd.json"),
  otx: path.join(THREAT_INTEL, "otx.json"),
  misp: path.join(THREAT_INTEL, "misp.json"),
};
