import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search, ShoppingBag } from 'lucide-react';
import { PortalBadge, portalMoney } from './PortalPieces';
import { menuPhoto } from '../../constants/menuPhotography';

export const PageHead = ({title, subtitle, action, children}) => <div className="cf-page-head"><div><h1>{title}</h1><p>{subtitle}</p></div><div className="cf-head-actions">{children}{action}</div></div>;
export const Metric = ({ label, value, icon: Icon, sub, tint='orange' }) => <div className="cf-stat"><span className={`cf-stat-icon ${tint}`}><Icon size={21}/></span><span className="cf-stat-label">{label}</span><strong>{value}</strong><small>{sub}</small></div>;
export const DataTable = ({ headers, children, empty, loading }) => <div className="cf-table-scroll"><table className="cf-table"><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table>{loading ? <p className="cf-no-results">Loading data…</p> : empty ? <p className="cf-no-results">{empty}</p> : null}</div>;
export const Tabs = ({ items, value, onChange }) => <div className="cf-tabs" role="group" aria-label="Filter items">{items.map(item=><button type="button" className={value===item?'active':''} key={item} onClick={()=>onChange(item)} aria-pressed={value===item}>{item}</button>)}</div>;
export const SearchField = ({value, onChange, placeholder='Search...'}) => <label className="cf-search"><Search size={17}/><input placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)}/></label>;
export const FoodTile = ({item, controls}) => <article className="cf-food-tile"><div className="cf-food-photo"><img src={menuPhoto(item) || '/menu-reference/veg-fried-rice.webp'} alt={item.name} loading="lazy"/><span className="cf-category-tag">{item.category}</span></div><div className="cf-food-body"><h3>{item.name}</h3><p>{item.description||'Freshly prepared at your cafeteria'}</p><strong>{portalMoney(item.price)}</strong>{controls && <div className="cf-food-controls">{controls}</div>}</div></article>;
export const TrendChart = ({ data=[], mode='revenue' }) => {
  const cleaned = data.length ? data : [];
  const max = Math.max(1,...cleaned.map(d=>Number(d[mode]||0)));
  const points = cleaned.map((d,i)=>`${20 + (i/Math.max(1,cleaned.length-1))*620},${178-(Number(d[mode]||0)/max)*141}`).join(' ');
  const area = points ? `20,180 ${points} 640,180` : '';
  return <div className="cf-trend">{cleaned.length ? <><svg viewBox="0 0 660 198" preserveAspectRatio="none" role="img" aria-label="Revenue trend chart"><defs><linearGradient id="cf-grad" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#ff790a" stopOpacity="0.19"/><stop offset="1" stopColor="#ff790a" stopOpacity="0.01"/></linearGradient></defs>{[40,88,136,180].map(y=><line key={y} x1="20" x2="640" y1={y} y2={y} stroke="#f2e9df" strokeDasharray="5 7"/>)}<polygon points={area} fill="url(#cf-grad)"/><polyline points={points} fill="none" stroke="#ff7809" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round"/>{cleaned.map((d,i)=><circle key={i} cx={20+(i/Math.max(1,cleaned.length-1))*620} cy={178-(Number(d[mode]||0)/max)*141} r="4" fill="#fff" stroke="#ff790a" strokeWidth="3"/>)}</svg><div className="cf-chart-labels">{cleaned.map((d,i)=><span key={i}>{d.day||d.label||d.date?.slice(5)||i+1}</span>)}</div></>:<div className="cf-chart-empty">No sales data in this period</div>}</div>;
};
export const Section = ({ title, subtitle, action, children, className='' }) => <section className={`cf-panel ${className}`}><div className="cf-panel-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>{children}</section>;
export const SoftLink = ({to,children}) => <Link to={to} className="cf-soft-link">{children}<ArrowRight size={15}/></Link>;
export const Status = ({status}) => <PortalBadge status={status}/>;
export const FoodThumb = ({item}) => <img className="cf-food-thumb" src={menuPhoto(item) || '/menu-reference/veg-fried-rice.webp'} alt="" loading="lazy" />;
export const orderItemsText = order => (order.items||[]).map(i=>`${i.quantity||1}× ${i.name}`).join(', ') || '—';
export const orderName = order => order.userId?.name || 'Customer';
export const orderId = order => `#${order.orderNumber||String(order._id||'').slice(-6)}`;
export const Spinner = ({text='Loading…'}) => <div className="cf-loading"><ShoppingBag size={24}/>{text}</div>;
