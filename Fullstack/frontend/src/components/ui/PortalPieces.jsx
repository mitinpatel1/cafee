import React from 'react';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PortalBanner = ({ eyebrow, title, description, children }) => (
  <section className="ob-portal-hero">
    <div className="ob-portal-hero-copy">
      <span className="ob-kicker">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
      {children && <div className="ob-portal-hero-actions">{children}</div>}
    </div>
    <div className="ob-portal-hero-picture" role="presentation" />
  </section>
);

export const PortalMetric = ({ title, value, subtitle, icon: Icon, theme = 'orange' }) => (
  <article className="ob-metric">
    <div className={`ob-metric-icon ${theme}`}><Icon size={22} strokeWidth={2}/></div>
    <span className="ob-metric-label">{title}</span>
    <strong className="ob-metric-number">{value}</strong>
    <small className="ob-metric-subtitle">{subtitle}</small>
  </article>
);

export const PortalSectionHeading = ({ title, description, to, toLabel, onRefresh, loading }) => (
  <div className="ob-section-heading">
    <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
    {to ? <Link to={to} className="ob-section-action">{toLabel || 'View all'} <ArrowUpRight size={17}/></Link> : onRefresh ? <button type="button" onClick={onRefresh} disabled={loading} className="ob-section-action"><RefreshCw size={15}/> Refresh</button> : null}
  </div>
);

export const PortalBadge = ({ status }) => <span className={`ob-status ob-status-${String(status || 'pending').toLowerCase().replace(/[^a-z]+/g, '-')}`}>{status || 'Pending'}</span>;
export const portalMoney = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;
