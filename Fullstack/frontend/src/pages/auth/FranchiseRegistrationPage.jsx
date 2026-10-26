import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, ArrowRight } from 'lucide-react';
import { api } from '../../api/api';
import {useFranchiseSelection} from '../../context/FranchiseSelectionContext';

const initial = { ownerName: '', email: '', password: '', name: '', brandName: '', city: '', location: '', address: '', phone: '' };
const fields = [
  { key: 'ownerName', title: 'Owner full name', autoComplete: 'name' },
  { key: 'email', title: 'Owner email', type: 'email', autoComplete: 'email' },
  { key: 'password', title: 'Owner password (at least 8 characters)', type: 'password', autoComplete: 'new-password' },
  { key: 'name', title: 'Franchise / Branch name' },
  { key: 'brandName', title: 'Brand name' },
  { key: 'city', title: 'City' },
  { key: 'address', title: 'Full business address' },
  { key: 'location', title: 'Floor / Landmark (optional)', optional: true },
  { key: 'phone', title: 'Contact phone', type: 'tel' },
];
export const FranchiseRegistrationPage = () => {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const {reload,selectFranchise}=useFranchiseSelection();
  const submit = async e => {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      const result = await api.registerFranchise(form);
      await reload();
      if (result.franchise?.id) selectFranchise(result.franchise.id);
      navigate('/', { replace: true, state: { registered: true } });
    } catch (err) { setError(err.message || 'Unable to register your franchise.'); }
    finally { setSaving(false); }
  };
  return <div className="portal-auth-wrap">
    <div className="portal-auth-card" style={{ maxWidth: 680 }}>
      <div className="portal-auth-icon"><Building2 size={26}/></div>
      <h1>Franchise registration</h1>
      <p>Register your business and create your private franchise owner account. After successful registration, the customer website opens.</p>
      {error && <div className="portal-error" role="alert">{error}</div>}
      <form className="portal-form" onSubmit={submit}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:'1rem'}}>
          {fields.map(f => <label key={f.key}>{f.title}<input required={!f.optional} minLength={f.key === 'password' ? 8 : undefined}
            type={f.type || 'text'} autoComplete={f.autoComplete} value={form[f.key]} onChange={e => setForm(v => ({...v,[f.key]:e.target.value}))}/></label>)}
        </div>
        <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Registering…' : 'Register franchise'} <ArrowRight size={17}/></button>
      </form>
      <p className="portal-auth-foot">Already registered? <Link to="/franchise/login">Franchise owner login</Link></p>
    </div>
  </div>;
};
