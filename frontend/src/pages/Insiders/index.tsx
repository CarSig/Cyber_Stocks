import { Link } from 'react-router-dom';
import Page from '@/components/common/layout/Page';
import './Insiders.css';

export default function InsidersIndex() {
  return (
    <Page title="Insiders">
      <p className="insiders-blurb">
        Officers, directors, and 10%+ owners across covered companies. Source: SEC Forms 3, 4, 5.
      </p>
      <div className="insiders-cards">
        <Link to="/insiders/companies" className="insiders-card">
          <div className="insiders-card-icon">🏢</div>
          <div className="insiders-card-label">Per Company</div>
          <div className="insiders-card-sub">Pick a ticker → see its insiders</div>
        </Link>
        <Link to="/insiders/all" className="insiders-card">
          <div className="insiders-card-icon">👥</div>
          <div className="insiders-card-label">All Insiders</div>
          <div className="insiders-card-sub">Flat list across all companies</div>
        </Link>
        <Link to="/insiders/leaderboard" className="insiders-card">
          <div className="insiders-card-icon">📊</div>
          <div className="insiders-card-label">Impact Leaderboard</div>
          <div className="insiders-card-sub">Ranked by same-day price delta</div>
        </Link>
      </div>
    </Page>
  );
}
