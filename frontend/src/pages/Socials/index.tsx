import { Link } from 'react-router-dom';
import Page from '@/components/atoms/Page';
import BaseCard from '@/components/atoms/BaseCard';
import CardHeader from '@/components/atoms/CardHeader';

type SocialCardProps = {
  to: string;
  icon: string;
  title: string;
  description: string;
};

function SocialCard({ to, icon, title, description }: SocialCardProps) {
  return (
    <BaseCard variant="interactive" as={Link} to={to}>
      <CardHeader icon={icon} title={title} />
      <div className="ti-card-body">
        <p className="ti-empty ti-empty-no-top">
          {description}
        </p>
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
