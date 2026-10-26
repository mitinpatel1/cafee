import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/api';
import {
  X,
  ShieldCheck,
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Smartphone,
  Wallet,
  Building,
  Banknote,
  Clock,
  ArrowRight,
} from 'lucide-react';

const PAYMENT_STEPS = {
  INITIATING: 'initiating',
  GATEWAY: 'gateway',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  FAILED: 'failed',
};

export const PaymentModal = ({ order, paymentMethod, onSuccess, onClose }) => {
  const [step, setStep] = useState(PAYMENT_STEPS.INITIATING);
  const [paymentData, setPaymentData] = useState(null);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(300); // 5 min countdown for UPI
  const [upiId, setUpiId] = useState('');
  const countdownRef = useRef(null);

  // Step 1: Initiate payment on mount
  useEffect(() => {
    const initiate = async () => {
      try {
        const res = await api.initiatePayment(order._id, paymentMethod);
        if (res.success) {
          setPaymentData(res.payment);
          setStep(PAYMENT_STEPS.GATEWAY);
        }
      } catch (err) {
        setError(err.message || 'Failed to initiate payment');
        setStep(PAYMENT_STEPS.FAILED);
      }
    };
    initiate();
  }, [order._id, paymentMethod]);

  // Countdown timer for UPI
  useEffect(() => {
    if (step === PAYMENT_STEPS.GATEWAY && paymentMethod === 'UPI / QR') {
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            setStep(PAYMENT_STEPS.FAILED);
            setError('Payment timed out. Please try again.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(countdownRef.current);
  }, [step, paymentMethod]);

  const handleConfirmPayment = async () => {
    if (!paymentData) return;
    setStep(PAYMENT_STEPS.PROCESSING);

    try {
      // Simulate 2s processing delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const res = await api.verifyPayment(
        order._id,
        paymentData.paymentId,
        paymentData.gatewayOrderId,
        paymentMethod
      );

      if (res.success) {
        clearInterval(countdownRef.current);
        setStep(PAYMENT_STEPS.SUCCESS);
        setTimeout(() => {
          onSuccess(res);
        }, 2500);
      }
    } catch (err) {
      setError(err.message || 'Payment verification failed');
      setStep(PAYMENT_STEPS.FAILED);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getPaymentIcon = () => {
    switch (paymentMethod) {
      case 'UPI / QR': return QrCode;
      case 'Cafeteria Wallet': return Wallet;
      case 'Payroll Deduction': return Building;
      case 'Cash on Pickup': return Banknote;
      default: return CreditCard;
    }
  };

  const PayIcon = getPaymentIcon();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '1rem',
        animation: 'fadeIn 0.3s ease',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#ffffff',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 30px 60px -12px rgba(0,0,0,0.25)',
          animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e1915 0%, #2b231d 100%)',
            padding: '1.5rem 1.75rem',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PayIcon size={22} color="#ff5722" />
            </div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '1.1rem' }}>
                Office<span style={{ color: '#ff5722' }}>Bite</span> Pay
              </div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>
                Secure Payment Gateway
              </div>
            </div>
          </div>

          {step !== PAYMENT_STEPS.PROCESSING && step !== PAYMENT_STEPS.SUCCESS && (
            <button
              onClick={onClose}
              style={{
                color: 'rgba(255,255,255,0.6)',
                padding: '6px',
                borderRadius: '8px',
                transition: 'color 0.2s',
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '1.75rem' }}>
          {/* Initiating State */}
          {step === PAYMENT_STEPS.INITIATING && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div className="spinner-payment" style={{ margin: '0 auto 1.5rem' }}>
                <Loader2 size={36} color="#ff5722" className="spin-icon" />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '0.4rem' }}>
                Initializing Payment...
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#64748b' }}>
                Creating secure payment session
              </p>
            </div>
          )}

          {/* Gateway - UPI / QR */}
          {step === PAYMENT_STEPS.GATEWAY && paymentMethod === 'UPI / QR' && (
            <div>
              {/* QR Code Box */}
              <div
                style={{
                  background: '#f8f9fa',
                  borderRadius: '18px',
                  padding: '1.5rem',
                  textAlign: 'center',
                  marginBottom: '1.25rem',
                  border: '1px solid #edf0f3',
                }}
              >
                <div
                  style={{
                    width: '180px',
                    height: '180px',
                    margin: '0 auto 1rem',
                    background: '#ffffff',
                    borderRadius: '14px',
                    border: '2px solid #edf0f3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Simulated QR Pattern */}
                  <div style={{ position: 'relative' }}>
                    <QrCode size={120} color="#1e1915" strokeWidth={1.5} />
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%,-50%)',
                        background: '#ffffff',
                        borderRadius: '6px',
                        padding: '4px',
                      }}
                    >
                      <Smartphone size={18} color="#ff5722" />
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e1915', marginBottom: '0.25rem' }}>
                  Scan QR with any UPI App
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  GooglePay • PhonePe • Paytm • BHIM
                </div>
              </div>

              {/* OR Divider */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  margin: '1rem 0',
                }}
              >
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '600' }}>
                  OR PAY VIA UPI ID
                </span>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
              </div>

              {/* UPI ID Input */}
              <div style={{ marginBottom: '1.25rem' }}>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@upi"
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    background: '#f8f9fa',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                />
              </div>

              {/* Timer */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginBottom: '1.25rem',
                  fontSize: '0.85rem',
                  color: countdown < 60 ? '#dc2626' : '#64748b',
                  fontWeight: '600',
                }}
              >
                <Clock size={16} />
                <span>Expires in {formatTime(countdown)}</span>
              </div>

              {/* Pay Button */}
              <button
                onClick={handleConfirmPayment}
                style={{
                  width: '100%',
                  padding: '0.95rem',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #ff5722, #e64a19)',
                  color: '#ffffff',
                  fontSize: '1rem',
                  fontWeight: '750',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px -4px rgba(255, 87, 34, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'transform 0.2s',
                }}
              >
                Pay ₹{order.total || paymentData?.amount} <ArrowRight size={18} />
              </button>
            </div>
          )}

          {/* Gateway - Wallet / Payroll / Cash (instant confirm) */}
          {step === PAYMENT_STEPS.GATEWAY && paymentMethod !== 'UPI / QR' && (
            <div>
              <div
                style={{
                  background: '#f8f9fa',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  textAlign: 'center',
                  marginBottom: '1.5rem',
                  border: '1px solid #edf0f3',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#fff2ee',
                    color: '#ff5722',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                  }}
                >
                  <PayIcon size={28} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '750', marginBottom: '0.3rem' }}>
                  {paymentMethod}
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {paymentMethod === 'Cafeteria Wallet'
                    ? 'Amount will be deducted from your prepaid wallet balance'
                    : paymentMethod === 'Payroll Deduction'
                    ? 'Amount will be deducted from your next month salary'
                    : 'Pay at the counter when picking up your order'}
                </p>
              </div>

              {/* Amount Card */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid #edf0f3',
                  padding: '1rem 1.25rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontWeight: '600', color: '#64748b' }}>Amount to Pay</span>
                <span
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.5rem',
                    fontWeight: '800',
                    color: '#ff5722',
                  }}
                >
                  ₹{order.total || paymentData?.amount}
                </span>
              </div>

              <button
                onClick={handleConfirmPayment}
                style={{
                  width: '100%',
                  padding: '0.95rem',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #ff5722, #e64a19)',
                  color: '#ffffff',
                  fontSize: '1rem',
                  fontWeight: '750',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px -4px rgba(255, 87, 34, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                Confirm Payment ₹{order.total || paymentData?.amount} <ArrowRight size={18} />
              </button>
            </div>
          )}

          {/* Processing State */}
          {step === PAYMENT_STEPS.PROCESSING && (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  border: '4px solid #edf0f3',
                  borderTopColor: '#ff5722',
                  margin: '0 auto 1.5rem',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <h3 style={{ fontSize: '1.15rem', fontWeight: '750', marginBottom: '0.4rem' }}>
                Processing Payment...
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#64748b' }}>
                Please do not close this window
              </p>
            </div>
          )}

          {/* Success State */}
          {step === PAYMENT_STEPS.SUCCESS && (
            <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: '#ecfdf5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                  animation: 'scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <CheckCircle2 size={40} color="#059669" />
              </div>
              <h3
                style={{
                  fontSize: '1.35rem',
                  fontWeight: '800',
                  color: '#059669',
                  marginBottom: '0.4rem',
                }}
              >
                Payment Successful!
              </h3>
              <p style={{ fontSize: '0.92rem', color: '#64748b', marginBottom: '0.5rem' }}>
                ₹{order.total || paymentData?.amount} paid via {paymentMethod}
              </p>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                }}
              >
                <ShieldCheck size={14} color="#059669" />
                Transaction ID: {paymentData?.paymentId?.substring(0, 16)}...
              </div>
            </div>
          )}

          {/* Failed State */}
          {step === PAYMENT_STEPS.FAILED && (
            <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: '#fef2f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                }}
              >
                <AlertCircle size={40} color="#dc2626" />
              </div>
              <h3
                style={{
                  fontSize: '1.2rem',
                  fontWeight: '800',
                  color: '#dc2626',
                  marginBottom: '0.4rem',
                }}
              >
                Payment Failed
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '1.5rem' }}>
                {error || 'Something went wrong. Please try again.'}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button
                  onClick={onClose}
                  style={{
                    padding: '0.7rem 1.5rem',
                    borderRadius: '12px',
                    background: '#f8f9fa',
                    color: '#64748b',
                    fontWeight: '600',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setStep(PAYMENT_STEPS.INITIATING);
                    setError('');
                    setCountdown(300);
                    // Re-initiate
                    api.initiatePayment(order._id, paymentMethod).then((res) => {
                      if (res.success) {
                        setPaymentData(res.payment);
                        setStep(PAYMENT_STEPS.GATEWAY);
                      }
                    });
                  }}
                  style={{
                    padding: '0.7rem 1.5rem',
                    borderRadius: '12px',
                    background: '#ff5722',
                    color: '#ffffff',
                    fontWeight: '700',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Retry Payment
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Security Badge */}
        {step !== PAYMENT_STEPS.SUCCESS && (
          <div
            style={{
              padding: '0.85rem 1.75rem',
              borderTop: '1px solid #edf0f3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              fontSize: '0.75rem',
              color: '#94a3b8',
            }}
          >
            <ShieldCheck size={14} color="#059669" />
            256-bit SSL Encrypted • PCI DSS Compliant
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes scaleIn {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .spin-icon {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};
