import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/api';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Mail,
  ShieldCheck,
  Store,
  UserRound,
} from 'lucide-react';

const maskEmail = (value = '') => {
  const [name, domain] = value.split('@');
  if (!name || !domain) return value;
  const visible = name.length <= 2 ? name.slice(0, 1) : name.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(2, name.length - visible.length))}@${domain}`;
};

export const LoginPage = ({ portal = 'user' }) => {
  const { login, register, logout } = useAuth();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authView, setAuthView] = useState('login'); // login | request | verify | reset
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const settings = {
    user: { title: isRegister ? 'Create your account' : 'Customer login', icon: UserRound, redirect: '/', label: 'Customer' },
    franchise: { title: 'Franchise owner login', icon: Store, redirect: '/franchise/dashboard', label: 'Franchise Owner' },
    admin: { title: 'Service administration', icon: ShieldCheck, redirect: '/admin/dashboard', label: 'Administrator' },
  };
  const config = settings[portal] || settings.user;
  const Icon = config.icon;
  const canResetPassword = portal === 'admin' || portal === 'franchise';

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = window.setTimeout(() => setResendIn((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const clearMessages = () => {
    setError('');
    setNotice('');
  };

  const returnToLogin = () => {
    setAuthView('login');
    setOtp('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setResendIn(0);
    clearMessages();
  };

  const submit = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      const account = isRegister && portal === 'user'
        ? await register({ name: name.trim(), email: email.trim(), password })
        : await login(email.trim(), password);
      const role = account?.role;
      const valid = portal === 'user' ? ['user', 'employee'].includes(role) : role === portal;
      if (!valid) {
        logout();
        setError(`This login is for ${config.label.toLowerCase()} accounts only.`);
        return;
      }
      navigate(config.redirect, { replace: true });
    } catch (err) {
      setError(err.message || 'Could not sign in.');
    } finally {
      setLoading(false);
    }
  };

  const requestReset = async (e) => {
    e?.preventDefault();
    clearMessages();
    if (!email.trim()) {
      setError('Enter your registered email address.');
      return;
    }
    setLoading(true);
    try {
      const response = await api.requestPasswordReset({ email: email.trim(), portal });
      setAuthView('verify');
      setOtp('');
      setResendIn(response.resendAfterSeconds || 60);
      setNotice(response.message || 'If an eligible account exists, a reset code has been sent.');
    } catch (err) {
      setError(err.message || 'Could not send the reset code.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setLoading(true);
    try {
      const response = await api.verifyPasswordResetOtp({ email: email.trim(), portal, otp: otp.trim() });
      setResetToken(response.resetToken);
      setAuthView('reset');
      setNotice('Email verified. Create your new password.');
    } catch (err) {
      setError(err.message || 'Could not verify the code.');
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (resendIn > 0 || loading) return;
    clearMessages();
    setLoading(true);
    try {
      const response = await api.requestPasswordReset({ email: email.trim(), portal });
      setResendIn(response.resendAfterSeconds || 60);
      setNotice(response.message || 'If an eligible account exists, a new reset code has been sent.');
    } catch (err) {
      setError(err.message || 'Could not resend the code.');
    } finally {
      setLoading(false);
    }
  };

  const saveNewPassword = async (e) => {
    e.preventDefault();
    clearMessages();
    if (newPassword.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }
    setLoading(true);
    try {
      const response = await api.resetPassword({
        email: email.trim(),
        portal,
        resetToken,
        newPassword,
      });
      setAuthView('login');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtp('');
      setResetToken('');
      setNotice(response.message || 'Password updated. Sign in with your new password.');
    } catch (err) {
      setError(err.message || 'Could not update your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-auth-wrap">
      <div className="portal-auth-card">
        <div className="portal-auth-icon">
          {authView === 'login' ? <Icon size={26} /> : authView === 'request' ? <Mail size={26} /> : <KeyRound size={26} />}
        </div>

        <h1>
          {authView === 'login' && config.title}
          {authView === 'request' && 'Forgot password?'}
          {authView === 'verify' && 'Verify your email'}
          {authView === 'reset' && 'Create new password'}
        </h1>
        <p>
          {authView === 'login' && `Sign in securely to your ${config.label.toLowerCase()} account.`}
          {authView === 'request' && 'Enter the registered email address for your account. We will send you a one-time code.'}
          {authView === 'verify' && <>Enter the 6-digit code sent to <strong>{maskEmail(email)}</strong>.</>}
          {authView === 'reset' && 'Choose a new password with at least 8 characters.'}
        </p>

        {error && <div className="portal-error" role="alert">{error}</div>}
        {notice && (
          <div role="status" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '12px 14px', margin: '12px 0', border: '1px solid #b7e2c5', background: '#effaf2', borderRadius: 10, color: '#17643a', fontSize: 13 }}>
            <CheckCircle2 size={17} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{notice}</span>
          </div>
        )}

        {authView === 'login' && (
          <form onSubmit={submit} className="portal-form">
            {isRegister && portal === 'user' && (
              <label>Full name<input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" /></label>
            )}
            <label>Email address<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
            <label>Password<input required type="password" minLength={isRegister ? 8 : undefined} autoComplete={isRegister ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" /></label>
            {canResetPassword && !isRegister && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -8 }}>
                <button type="button" onClick={() => { setAuthView('request'); clearMessages(); }} style={{ border: 0, padding: 0, background: 'transparent', color: '#8a1636', fontWeight: 700, cursor: 'pointer' }}>
                  Forgot password?
                </button>
              </div>
            )}
            <button disabled={loading} className="btn btn-primary" type="submit">
              {loading ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'} <ArrowRight size={16} />
            </button>
          </form>
        )}

        {authView === 'request' && (
          <form onSubmit={requestReset} className="portal-form">
            <label>Registered email address
              <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </label>
            <button disabled={loading} className="btn btn-primary" type="submit">
              {loading ? 'Sending code…' : 'Send verification code'} <ArrowRight size={16} />
            </button>
            <button type="button" onClick={returnToLogin} disabled={loading} style={{ border: 0, background: 'transparent', color: '#8a1636', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 7 }}>
              <ArrowLeft size={16} /> Back to login
            </button>
          </form>
        )}

        {authView === 'verify' && (
          <form onSubmit={verifyOtp} className="portal-form">
            <label>6-digit verification code
              <input required type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Enter OTP" style={{ letterSpacing: 8, textAlign: 'center', fontSize: 22, fontWeight: 800 }} />
            </label>
            <button disabled={loading} className="btn btn-primary" type="submit">
              {loading ? 'Verifying…' : 'Verify code'} <ArrowRight size={16} />
            </button>
            <div style={{ textAlign: 'center', fontSize: 13, color: '#706860' }}>
              Didn't receive the code?{' '}
              <button type="button" onClick={resendOtp} disabled={loading || resendIn > 0} style={{ border: 0, padding: 0, background: 'transparent', color: resendIn > 0 ? '#8b8178' : '#8a1636', fontWeight: 700, cursor: resendIn > 0 ? 'default' : 'pointer' }}>
                {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
              </button>
            </div>
            <button type="button" onClick={returnToLogin} disabled={loading} style={{ border: 0, background: 'transparent', color: '#8a1636', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 7 }}>
              <ArrowLeft size={16} /> Back to login
            </button>
          </form>
        )}

        {authView === 'reset' && (
          <form onSubmit={saveNewPassword} className="portal-form">
            <label>New password
              <input required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" />
            </label>
            <label>Confirm new password
              <input required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Enter password again" />
            </label>
            <button disabled={loading || !resetToken} className="btn btn-primary" type="submit">
              {loading ? 'Updating password…' : 'Update password'} <CheckCircle2 size={16} />
            </button>
            <button type="button" onClick={returnToLogin} disabled={loading} style={{ border: 0, background: 'transparent', color: '#8a1636', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 7 }}>
              <ArrowLeft size={16} /> Back to login
            </button>
          </form>
        )}

        {authView === 'login' && portal === 'user' && (
          <p className="portal-auth-foot">
            {isRegister ? 'Already have an account?' : 'New customer?'}{' '}
            <button type="button" onClick={() => { setIsRegister((value) => !value); clearMessages(); }}>
              {isRegister ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        )}
        {authView === 'login' && portal === 'franchise' && (
          <p className="portal-auth-foot">New franchise? <Link to="/franchise/register">Register your franchise</Link></p>
        )}
        <Link className="portal-back" to="/">Return to customer website</Link>
      </div>
    </div>
  );
};
