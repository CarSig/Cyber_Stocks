import { Link } from "react-router-dom";
import Page from "@/components/atoms/Page.jsx";
import BaseCard from "@/components/atoms/BaseCard.jsx";
import CardHeader from "@/components/atoms/CardHeader.jsx";

function SocialCard({ to, icon, title, description }) {
  return (
    <BaseCard variant="interactive" as={Link} to={to}>
      <CardHeader icon={icon} title={title} />
      <div className="ti-card-body">
        <p className="ti-empty" style={{ marginTop: 0 }}>{description}</p>
      </div>
    </BaseCard>
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
