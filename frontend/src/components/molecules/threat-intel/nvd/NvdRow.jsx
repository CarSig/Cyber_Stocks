import { formatDate } from "@/utils/date.js";

const SEVERITY_COLORS = {
  CRITICAL: "var(--color-red)",
  HIGH: "var(--color-amber)",
  MEDIUM: "#f59e0b",
  LOW: "var(--color-blue-toggle)",
};

export default function NvdRow({ cve }) {
  return (
    <tr key={cve.id}>
      <td>
        <a href={`https://nvd.nist.gov/vuln/detail/${cve.id}`} target="_blank" rel="noreferrer" className="ti-link">
          {cve.id}
        </a>
      </td>
      <td>
        <span className="ti-severity" style={{ color: SEVERITY_COLORS[cve.severity] ?? "var(--text-muted)" }}>
          {cve.severity}
        </span>
      </td>
      <td className="ti-score">{cve.score ?? "—"}</td>
      <td className="ti-desc">{cve.description}</td>
      <td className="ti-date">{formatDate(cve.published)}</td>
      <td className="ti-muted">{cve.status}</td>
    </tr>
  );
}
