import path from "path";

// At runtime (compiled): __dirname = backend_nest/dist/shared/
// At runtime (tsx dev):   __dirname = backend_nest/src/shared/
// Walk up 3 levels to reach backend_nest/
const BACKEND_ROOT = path.resolve(__dirname, "../../..");
const PROJECT_ROOT = path.resolve(BACKEND_ROOT, "..");
const STORAGE = path.join(PROJECT_ROOT, "storage");
const SOCIALS = path.join(STORAGE, "socials");
const THREAT_INTEL = path.join(STORAGE, "threat-intel");

const SEC_ARCHIVE = path.join(STORAGE, "SEC_Archive");

export const PATHS = {
  redditPosts: (subreddit: string) => path.join(SOCIALS, `reddit_${subreddit}.json`),
  kev: path.join(THREAT_INTEL, "kev.json"),
  nvd: path.join(THREAT_INTEL, "nvd.json"),
  otx: path.join(THREAT_INTEL, "otx.json"),
  misp: path.join(THREAT_INTEL, "misp.json"),
  secArchive: (ticker: string) => path.join(SEC_ARCHIVE, ticker),
};
