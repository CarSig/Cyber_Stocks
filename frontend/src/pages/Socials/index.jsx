import { Link } from "react-router-dom";
import Page from "@/components/atoms/Page.jsx";

function SocialCard({ to, icon, title, description }) {
  return (
    <Link to={to} className="ti-card">
      <div className="ti-card-head">
        <span className="ti-card-icon">{icon}</span>
        <span className="ti-card-title">{title}</span>
      </div>
      <div className="ti-card-body">
        <p className="ti-empty" style={{ marginTop: 0 }}>{description}</p>
      </div>
    </Link>
  );
}

export default function Socials() {
  return (
    <Page title="Socials">
      <div className="ti-grid">
        <SocialCard
          to="/socials/truth-social"
          icon="🇺🇸"
          title="Truth Social"
          description="Trump posts and activity on Truth Social"
        />
        <SocialCard
          to="/socials/reddit"
          icon="🤖"
          title="Reddit"
          description="Posts from r/ExperiencedDevs and r/cybersecurity"
        />
      </div>
    </Page>
  );
}
