import { classifyUrgency, URGENCY_CONFIG } from "./src/utils/urgencyUtils.js";

// Test articles
const articles = [
  {
    id: 1,
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    globalSignals: ["breaking", "alert"],
    companySignals: []
  },
  {
    id: 2,
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    globalSignals: [],
    companySignals: []
  },
  {
    id: 3,
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    globalSignals: [],
    companySignals: []
  },
  {
    id: 4,
    timestamp: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(), // 100 days ago
    globalSignals: ["guidance", "outlook"],
    companySignals: []
  }
];

articles.forEach(a => {
  const urgency = classifyUrgency(a.timestamp, a.globalSignals, a.companySignals);
  const config = URGENCY_CONFIG[urgency];
  console.log(`Article ${a.id}: ${urgency} (${config?.label || 'unknown'})`);
});
