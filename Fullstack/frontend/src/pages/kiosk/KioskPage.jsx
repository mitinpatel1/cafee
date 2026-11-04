
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
const [paymentComplete, setPaymentComplete] = useState(false);

import {
  Armchair,
  ArrowDownUp,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Coffee,
  CreditCard,
  QrCode,
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Utensils,
  Wallet,
  X,
} from "lucide-react";

// ============================================
// OFFICEBITE STYLING
// CSS IS INSIDE THIS JSX FILE
// ============================================

const KIOSK_STYLES = String.raw`
.cafe-kiosk {
  --forest: #173f35;
  --forest-dark: #102f27;
  --orange: #ee7843;
  --orange-dark: #d65b2e;
  --cream: #faf9f5;
  --paper: #ffffff;
  --ink: #233b32;
  --muted: #74867c;
  --line: #e5ebe4;
  --success: #198754;

  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow-x: clip;

  background:
    radial-gradient(
      circle at 6% 5%,
      #fff0dd,
      transparent 34%
    ),
    var(--cream);

  color: var(--ink);
  font-family: Inter, "Segoe UI", system-ui, sans-serif;
  font-size: 15px;
}

.cafe-kiosk *,
.cafe-kiosk *::before,
.cafe-kiosk *::after {
  box-sizing: border-box;
}

.cafe-kiosk button,
.cafe-kiosk input,
.cafe-kiosk select {
  font: inherit;
}

.cafe-kiosk button {
  cursor: pointer;
}

.cafe-kiosk button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cafe-kiosk button:focus-visible,
.cafe-kiosk input:focus-visible,
.cafe-kiosk select:focus-visible {
  outline: 3px solid #f3b98d;
  outline-offset: 2px;
}

.cafe-kiosk h1,
.cafe-kiosk h2,
.cafe-kiosk h3,
.cafe-kiosk p {
  margin-top: 0;
}

.cafe-container {
  width: 100%;
  max-width: 1360px;
  margin: 0 auto;
  padding: 0 25px;
}

/* ============================================
   HEADER
============================================ */

.cafe-header {
  position: sticky;
  top: 0;
  z-index: 30;

  background: rgba(255,255,255,.97);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--line);
  box-shadow: 0 4px 22px #173f350c;
}

.cafe-header-inner {
  height: 82px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
}

.cafe-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--forest);
  font-size: 28px;
  font-weight: 900;
  letter-spacing: -1.4px;
  line-height: 1;
}

.cafe-logo-icon {
  width: 47px;
  height: 47px;
  display: grid;
  place-items: center;
  border-radius: 15px;
  background: var(--forest);
  color: white;
}

.cafe-logo small {
  display: block;
  margin-top: 7px;
  color: #829b8d;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.8px;
}

.cafe-orange {
  color: var(--orange);
}

.cafe-header-end {
  display: flex;
  align-items: center;
  gap: 20px;
}

.cafe-live {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #637d70;
  font-size: 12px;
  font-weight: 750;
}

.cafe-live i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #29ad73;
  box-shadow: 0 0 0 4px #e3f8ec;
}

.cafe-cart-icon {
  position: relative;
  width: 49px;
  height: 49px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: white;
  color: var(--forest);
  transition: .2s ease;
}

.cafe-cart-icon:hover {
  background: #f0f7f0;
  transform: translateY(-2px);
}

.cafe-cart-icon b {
  position: absolute;
  right: -7px;
  top: -7px;
  min-width: 22px;
  height: 22px;
  padding: 0 5px;
  display: grid;
  place-items: center;
  background: var(--orange);
  color: white;
  border-radius: 100px;
  border: 2px solid white;
  font-size: 10px;
}

/* ============================================
   ORDER PROGRESS
============================================ */

.cafe-progress {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 25px;
  flex-wrap: wrap;
  margin: 23px 0 28px;
  color: #a0ada4;
  font-size: 12px;
  font-weight: 800;
}

.cafe-progress > div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cafe-progress span {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  background: #e9eee8;
  border-radius: 50%;
  flex-shrink: 0;
}

.cafe-progress .active {
  color: var(--forest);
}

.cafe-progress .active span {
  color: white;
  background: var(--orange);
}

.cafe-error {
  margin-bottom: 18px;
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  color: #a33b25;
  background: #fff0e9;
  border: 1px solid #f3cdbb;
  border-radius: 13px;
  font-size: 13px;
}

.cafe-error button {
  border: 0;
  color: inherit;
  background: transparent;
}

/* ============================================
   HERO SECTION
============================================ */

.cafe-menu-page {
  animation: cafeFade .35s ease;
}

.cafe-hero {
  min-height: 320px;
  display: grid;
  grid-template-columns: 1.12fr .88fr;
  overflow: hidden;
  background: linear-gradient(
    115deg,
    #123329,
    #215744
  );
  border-radius: 25px;
  box-shadow: 0 18px 40px #173f3522;
}

.cafe-hero-copy {
  padding: 46px 32px 42px 52px;
}

.cafe-eyebrow {
  margin-bottom: 15px;
  color: #ffcd93;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 1.5px;
}

.cafe-hero h1 {
  margin-bottom: 18px;
  color: white;
  font-size: clamp(36px,4.5vw,61px);
  font-weight: 900;
  letter-spacing: -2px;
  line-height: 1.07;
}

.cafe-hero h1 em {
  color: #ffb981;
  font-style: normal;
}

.cafe-hero-copy > p:not(.cafe-eyebrow) {
  max-width: 450px;
  margin-bottom: 0;
  color: #d6e9df;
  font-size: 14px;
  line-height: 1.7;
}

.cafe-hero-features {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 23px;
  color: white;
  font-size: 12px;
  font-weight: 750;
}

.cafe-hero-features span {
  display: flex;
  align-items: center;
  gap: 7px;
}

.cafe-hero-features svg {
  color: #ffb981;
}

.cafe-hero-photo {
  position: relative;
  min-height: 320px;
  overflow: hidden;
  background: #477764;
}

.cafe-hero-photo::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(
    90deg,
    #173f35,
    transparent 70%
  );
}

.cafe-hero-photo img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cafe-hero-placeholder {
  height: 100%;
  display: grid;
  place-items: center;
  font-size: 130px;
}

.cafe-photo-badge {
  position: absolute;
  z-index: 2;
  right: 25px;
  bottom: 25px;
  width: 95px;
  height: 95px;
  display: grid;
  place-content: center;
  background: #fff4df;
  color: var(--forest);
  border-radius: 50%;
  text-align: center;
  font-size: 12px;
  font-weight: 900;
  transform: rotate(9deg);
  box-shadow: 0 8px 23px #0003;
}

.cafe-photo-badge strong {
  font-size: 18px;
}

/* ============================================
   MENU SECTION
============================================ */

.cafe-menu-section {
  padding: 42px 0 120px;
}

.cafe-section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 23px;
}

.cafe-kicker {
  margin-bottom: 9px;
  color: var(--orange-dark);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 2px;
}

.cafe-section-head h2 {
  margin-bottom: 8px;
  font-size: clamp(26px,3vw,36px);
  font-weight: 900;
  letter-spacing: -1px;
}

.cafe-section-head p:not(.cafe-kicker) {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.cafe-items-count {
  padding: 8px 14px;
  background: #edf5ec;
  color: var(--forest);
  border-radius: 30px;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.cafe-tools {
  display: grid;
  grid-template-columns: minmax(0,.85fr) minmax(0,1.25fr) minmax(0,.85fr);
  gap: 15px;
}

.cafe-location,
.cafe-search,
.cafe-price-sort {
  height: 52px;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 16px;
  background: white;
  border: 1px solid var(--line);
  border-radius: 13px;
  color: #6b8979;
}

.cafe-location:focus-within,
.cafe-search:focus-within,
.cafe-price-sort:focus-within {
  border-color: var(--orange);
}

.cafe-location select,
.cafe-search input,
.cafe-price-sort select {
  min-width: 0;
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--ink);
  font-size: 14px;
}

.cafe-search input::placeholder {
  color: #a1b0a5;
}

.cafe-price-sort {
  background: #f2f8f1;
  color: var(--forest);
  border-color: #cfe1d2;
}

.cafe-price-sort select {
  color: var(--forest);
  font-weight: 750;
  cursor: pointer;
}

.cafe-categories {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 24px 0 27px;
  padding: 3px 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.cafe-categories::-webkit-scrollbar {
  display: none;
}

.cafe-categories button {
  flex-shrink: 0;
  padding: 10px 18px;
  border: 1px solid var(--line);
  border-radius: 25px;
  background: white;
  color: #708579;
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
  transition: .2s;
}

.cafe-categories button:hover {
  background: #eff6ed;
}

.cafe-categories .selected {
  background: var(--forest);
  color: white;
  border-color: var(--forest);
}

/* ============================================
   FOOD CARDS
============================================ */

.cafe-grid {
  display: grid;
  grid-template-columns: repeat(4,minmax(0,1fr));
  gap: 19px;
}

.cafe-food-card {
  min-width: 0;
  overflow: hidden;
  background: white;
  border: 1px solid #e8ede6;
  border-radius: 20px;
  box-shadow: 0 5px 22px #173f350b;
  transition: transform .25s, box-shadow .25s;
}

.cafe-food-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 32px #173f3520;
}

.cafe-food-photo {
  position: relative;
  height: 190px;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: #f8eddb;
}

.cafe-food-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform .35s;
}

.cafe-food-card:hover img {
  transform: scale(1.06);
}

.cafe-food-emoji {
  font-size: 75px;
}

.cafe-food-tag {
  position: absolute;
  left: 12px;
  top: 12px;
  padding: 6px 12px;
  background: #ffffffed;
  color: var(--forest);
  border-radius: 30px;
  font-size: 10px;
  font-weight: 850;
}

.cafe-food-info {
  padding: 17px;
}

.cafe-food-name {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.cafe-food-name h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 850;
  line-height: 1.4;
}

.cafe-food-name i {
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  border: 2px solid #198754;
  border-radius: 2px;
  flex-shrink: 0;
}

.cafe-food-name i::after {
  content: "";
  width: 8px;
  height: 8px;
  background: #198754;
  border-radius: 50%;
}

.cafe-food-name i.cafe-nonveg {
  border-color: #c54435;
}

.cafe-food-name i.cafe-nonveg::after {
  background: #c54435;
}

.cafe-food-info > p {
  margin: 9px 0 17px;
  color: #99aa9c;
  font-size: 11px;
}

.cafe-food-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 7px;
}

.cafe-food-bottom > strong {
  color: var(--forest);
  font-size: 19px;
  font-weight: 900;
  white-space: nowrap;
}

.cafe-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 9px 13px;
  color: white;
  background: var(--orange);
  border: none;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 850;
}

.cafe-add:hover {
  background: var(--orange-dark);
}

.cafe-qty {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 3px;
  background: white;
  border: 1px solid #e9caaa;
  border-radius: 10px;
}

.cafe-qty button {
  width: 29px;
  height: 29px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 7px;
  background: #fff1df;
  color: var(--orange-dark);
}

.cafe-qty b {
  min-width: 14px;
  text-align: center;
  font-size: 13px;
}

.cafe-empty {
  padding: 65px 20px;
  background: white;
  border: 1px solid var(--line);
  border-radius: 18px;
  color: var(--muted);
  text-align: center;
}

.cafe-menu-footnote {
  margin: 34px 0 0;
  color: #98aa9a;
  text-align: center;
  font-size: 12px;
}

/* ============================================
   FLOATING CART
============================================ */

.cafe-floating {
  position: fixed;
  z-index: 25;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%);

  width: min(830px,calc(100vw - 30px));
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 13px 20px;

  color: white;
  background: var(--forest);
  border: 0;
  border-radius: 18px;
  box-shadow: 0 16px 35px #102f2780;
  text-align: left;
}

.cafe-floating-icon {
  width: 47px;
  height: 47px;
  display: grid;
  place-items: center;
  background: #ffffff23;
  border-radius: 12px;
  flex-shrink: 0;
}

.cafe-floating-description {
  min-width: 0;
  flex: 1;
  display: grid;
  gap: 4px;
}

.cafe-floating-description b {
  font-size: 15px;
}

.cafe-floating-description small {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: #c8e1d2;
  font-size: 11px;
}

.cafe-floating > strong {
  color: #ffcb9e;
  font-size: 20px;
  white-space: nowrap;
}

/* ============================================
   CART DRAWER
============================================ */

.cafe-overlay {
  position: fixed;
  z-index: 50;
  inset: 0;
  display: flex;
  justify-content: flex-end;
}

.cafe-scrim {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  background: #102f279a;
}

.cafe-drawer {
  position: relative;
  width: min(450px,100%);
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: white;
  box-shadow: -15px 0 35px #0002;
}

.cafe-drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 27px;
  border-bottom: 1px solid var(--line);
}

.cafe-drawer-head h2 {
  margin: 0;
  font-size: 25px;
}

.cafe-drawer-head h2 span {
  color: var(--orange);
}

.cafe-drawer-head button {
  width: 39px;
  height: 39px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 11px;
  background: #edf3ec;
  color: var(--forest);
}

.cafe-drawer-items {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 15px 27px;
}

.cafe-cart-line {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 0;
  border-bottom: 1px solid var(--line);
}

.cafe-cart-line > div:first-child {
  display: grid;
  gap: 6px;
}

.cafe-cart-line strong {
  font-size: 14px;
}

.cafe-cart-line small {
  color: var(--muted);
  font-size: 12px;
}

.cafe-cart-right {
  display: grid;
  justify-items: end;
  gap: 10px;
}

.cafe-cart-right > b {
  color: var(--forest);
}

.cafe-drawer-bottom {
  padding: 21px 27px 28px;
  border-top: 1px solid var(--line);
}

.cafe-drawer-bottom > div:not(.cafe-drawer-total) {
  display: flex;
  justify-content: space-between;
  color: var(--muted);
}

.cafe-drawer-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 15px 0;
  padding: 17px 0;
  border-top: 1px dashed var(--line);
  font-size: 20px;
  font-weight: 900;
}

.cafe-drawer-total strong {
  color: var(--forest);
}

/* ============================================
   BUTTONS
============================================ */

.cafe-primary,
.cafe-secondary {
  min-height: 49px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 13px 20px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 850;
  transition: .2s ease;
}

.cafe-primary {
  color: white;
  background: var(--orange);
  border: 1px solid var(--orange);
}

.cafe-primary:hover:not(:disabled) {
  background: var(--orange-dark);
}

.cafe-secondary {
  color: var(--forest);
  background: #eff5ed;
  border: 1px solid #dce8dd;
}

.cafe-secondary:hover:not(:disabled) {
  background: #e4f0e3;
}

.cafe-full {
  width: 100%;
}

.cafe-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  margin-bottom: 23px;
  background: transparent;
  border: 0;
  color: #6a8777;
  font-size: 13px;
  font-weight: 750;
}

/* ============================================
   CHECKOUT
============================================ */

.cafe-flow {
  display: grid;
  grid-template-columns: 1.2fr .8fr;
  align-items: start;
  gap: 25px;
  max-width: 1050px;
  margin: 35px auto 85px;
}

.cafe-panel {
  min-width: 0;
  padding: 35px;
  background: white;
  border: 1px solid var(--line);
  border-radius: 23px;
  box-shadow: 0 12px 32px #173f350c;
}

.cafe-panel h1 {
  margin-bottom: 10px;
  font-size: 34px;
  font-weight: 900;
  letter-spacing: -1px;
}

.cafe-panel h2 {
  font-size: 24px;
  font-weight: 900;
}

.cafe-panel-icon {
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  margin-bottom: 20px;
  background: #fff0e3;
  color: var(--orange);
  border-radius: 16px;
}

.cafe-subtitle {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.7;
}

.cafe-payment-list {
  display: grid;
  gap: 11px;
  margin: 26px 0;
}

.cafe-payment {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: white;
  border: 1.5px solid var(--line);
  border-radius: 14px;
  cursor: pointer;
}

.cafe-payment.selected {
  background: #fffaf3;
  border-color: var(--orange);
}

.cafe-payment input {
  position: absolute;
  opacity: 0;
}

.cafe-payment:focus-within {
  outline: 3px solid #f5c9a3;
  outline-offset: 2px;
}

.cafe-payment-icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: #f0f5ee;
  color: var(--forest);
  border-radius: 11px;
}

.cafe-payment > span:nth-of-type(2) {
  display: grid;
  flex: 1;
  gap: 5px;
}

.cafe-payment strong {
  font-size: 14px;
}

.cafe-payment small {
  color: var(--muted);
  font-size: 12px;
}

.cafe-payment > i {
  width: 19px;
  height: 19px;
  border: 2px solid #cbd8cf;
  border-radius: 50%;
}

.cafe-payment.selected > i {
  border: 6px solid var(--orange);
}

.cafe-hint {
  display: flex;
  align-items: center;
  gap: 11px;
  margin: 19px 0;
  padding: 15px;
  background: #f0f7ee;
  border-radius: 12px;
  color: #597f68;
  font-size: 12px;
  line-height: 1.6;
  text-align: left;
}

.cafe-hint svg {
  flex-shrink: 0;
}

.cafe-summary h2 {
  margin-bottom: 26px;
}

.cafe-summary-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin: 17px 0;
  color: #748579;
  font-size: 13px;
}

.cafe-summary-row b {
  color: var(--forest);
  white-space: nowrap;
}

.cafe-summary-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 23px;
  padding-top: 20px;
  border-top: 1px dashed var(--line);
  font-size: 17px;
  font-weight: 900;
}

.cafe-summary-total strong {
  color: var(--forest);
  font-size: 25px;
}

/* ============================================
   PAYMENT STATUS
============================================ */

.cafe-status {
  max-width: 875px;
  margin: 35px auto 90px;
}

.cafe-status-panel {
  text-align: center;
}

.cafe-status-panel > h1 {
  font-size: 35px;
}

.cafe-status-panel > .cafe-subtitle {
  max-width: 630px;
  margin: 0 auto;
}

.cafe-status-icon {
  width: 75px;
  height: 75px;
  display: grid;
  place-items: center;
  margin: 0 auto 22px;
  border-radius: 50%;
  background: #fff0e4;
  color: var(--orange);
}

.cafe-status-icon.paid {
  color: #198754;
  background: #e5f7e9;
}

.cafe-order-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 15px;
  margin: 23px 0 28px;
}

.cafe-order-meta > span {
  padding: 10px 15px;
  background: #f4f7f3;
  border-radius: 30px;
  font-size: 12px;
  font-weight: 800;
}

.cafe-order-meta .cafe-paid {
  background: #e4f7ea;
  color: #18814c;
}

.cafe-order-meta .cafe-pending {
  background: #fff0d7;
  color: #a46d1d;
}

/* ============================================
   PAYMENT COUNTDOWN
============================================ */

.cafe-deadline {
  max-width: 500px;
  margin: 20px auto;
  padding: 20px;
  background: #fff8ee;
  border: 1px solid #f0d9b6;
  border-radius: 16px;
}

.cafe-deadline > div:first-child {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #9b642c;
  font-size: 13px;
  font-weight: 800;
}

.cafe-deadline > strong {
  display: block;
  margin: 12px 0;
  color: var(--orange-dark);
  font-size: 42px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.cafe-deadline-track {
  height: 9px;
  overflow: hidden;
  background: #f2dec7;
  border-radius: 30px;
}

.cafe-deadline-track span {
  display: block;
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--orange),
    #f5ad64
  );
  border-radius: inherit;
  transition: width .5s linear;
}

/* ============================================
   SEAT SELECTION
============================================ */

.cafe-seat-section {
  margin-top: 28px;
  padding-top: 28px;
  border-top: 1px solid var(--line);
  text-align: left;
}

.cafe-seat-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
}

.cafe-seat-heading h2 {
  margin-bottom: 8px;
}

.cafe-seat-heading p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.cafe-seat-heading > span {
  padding: 9px 13px;
  background: #e5f7e9;
  color: #16834b;
  border-radius: 30px;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.cafe-seat-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin: 23px 0;
  color: #829489;
  font-size: 12px;
}

.cafe-seat-legend span {
  display: flex;
  align-items: center;
  gap: 7px;
}

.cafe-seat-legend i {
  width: 12px;
  height: 12px;
  background: #e5f7e9;
  border: 1px solid #198754;
  border-radius: 3px;
}

.cafe-seat-legend i.taken {
  background: #e7e9e6;
  border-color: #c6cec7;
}

.cafe-seat-legend i.mine {
  background: var(--orange);
  border-color: var(--orange);
}

.cafe-seat-grid {
  display: grid;
  grid-template-columns: repeat(5,minmax(0,1fr));
  gap: 12px;
}

.cafe-seat {
  min-height: 91px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: #f0fbf3;
  color: #198754;
  border: 1.5px solid #bbe4c7;
  border-radius: 14px;
  transition: .2s ease;
}

.cafe-seat:hover:not(:disabled) {
  transform: translateY(-3px);
  background: #e1f7e8;
}

.cafe-seat strong {
  font-size: 17px;
}

.cafe-seat small {
  font-size: 10px;
}

.cafe-seat.occupied {
  background: #f0f1ef;
  border-color: #dfe4df;
  color: #a3aea5;
}

.cafe-seat.chosen {
  color: white;
  background: var(--orange);
  border-color: var(--orange);
  opacity: 1;
  box-shadow: 0 7px 16px #ee784340;
}

.cafe-seat-actions {
  display: flex;
  justify-content: space-between;
  gap: 13px;
  margin-top: 26px;
}

.cafe-seat-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  margin-top: 22px;
  padding: 30px 15px;
  background: #eff9f1;
  color: #198754;
  border: 1px solid #d5edd9;
  border-radius: 18px;
}

.cafe-seat-success > span {
  font-size: 57px;
  font-weight: 900;
  line-height: 1;
}

.cafe-seat-success h2 {
  margin: 0;
  color: var(--forest);
}

.cafe-seat-success p {
  margin: 0;
  color: #5f806a;
  font-size: 13px;
  text-align: center;
}

.cafe-seat-success small {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #6c8975;
  text-align: center;
}

.cafe-tracking {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  margin-top: 27px;
  padding: 19px 22px;
  background: #f8faf6;
  border: 1px solid var(--line);
  border-radius: 14px;
  color: var(--forest);
  text-align: left;
}

.cafe-tracking > div {
  min-width: 0;
  display: grid;
  gap: 6px;
}

.cafe-tracking small {
  color: #8ba393;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1.5px;
}

.cafe-tracking strong {
  overflow-wrap: anywhere;
  color: var(--forest);
  font-family: monospace;
  font-size: 16px;
  letter-spacing: 1px;
}

.cafe-footer {
  margin-top: auto;
  padding: 27px 15px;
  color: #9aab9b;
  text-align: center;
  font-size: 12px;
}

.cafe-spin {
  animation: cafeSpin 1s linear infinite;
}

/* ============================================
   RESPONSIVENESS
============================================ */

@media (max-width: 1100px) {
  .cafe-grid {
    grid-template-columns: repeat(3,minmax(0,1fr));
  }

  .cafe-hero-copy {
    padding-left: 35px;
  }
}

@media (max-width: 850px) {
  .cafe-tools {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cafe-price-sort {
    grid-column: 1 / -1;
  }

  .cafe-container {
    padding: 0 19px;
  }

  .cafe-grid {
    grid-template-columns: repeat(3,minmax(0,1fr));
    gap: 14px;
  }

  .cafe-flow {
    grid-template-columns: 1fr;
    max-width: 620px;
  }

  .cafe-seat-grid {
    grid-template-columns: repeat(4,minmax(0,1fr));
  }

  .cafe-food-photo {
    height: 165px;
  }
}

@media (max-width: 650px) {
  .cafe-container {
    padding: 0 14px;
  }

  .cafe-header-inner {
    height: 69px;
  }

  .cafe-logo {
    font-size: 23px;
    gap: 9px;
  }

  .cafe-logo-icon {
    width: 41px;
    height: 41px;
  }

  .cafe-logo small {
    font-size: 7px;
  }

  .cafe-live {
    display: none;
  }

  .cafe-progress {
    justify-content: space-between;
    flex-wrap: nowrap;
    gap: 5px;
    margin: 17px 0;
    font-size: 9px;
  }

  .cafe-progress > div {
    gap: 4px;
  }

  .cafe-progress span {
    width: 22px;
    height: 22px;
    font-size: 10px;
  }

  .cafe-hero {
    grid-template-columns: 1fr;
    border-radius: 18px;
  }

  .cafe-hero-copy {
    padding: 32px 24px;
  }

  .cafe-hero h1 {
    font-size: 37px;
  }

  .cafe-hero-photo {
    display: none;
  }

  .cafe-menu-section {
    padding-top: 32px;
  }

  .cafe-section-head h2 {
    font-size: 27px;
  }

  .cafe-tools {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .cafe-price-sort {
    grid-column: auto;
  }

  .cafe-grid {
    grid-template-columns: repeat(2,minmax(0,1fr));
    gap: 12px;
  }

  .cafe-food-photo {
    height: 145px;
  }

  .cafe-food-info {
    padding: 12px;
  }

  .cafe-food-name h3 {
    font-size: 14px;
  }

  .cafe-food-bottom > strong {
    font-size: 16px;
  }

  .cafe-qty {
    gap: 4px;
  }

  .cafe-qty button {
    width: 26px;
    height: 27px;
  }

  .cafe-flow,
  .cafe-status {
    margin: 20px 0 65px;
  }

  .cafe-panel {
    padding: 23px;
  }

  .cafe-panel h1,
  .cafe-status-panel > h1 {
    font-size: 29px;
  }

  .cafe-seat-grid {
    grid-template-columns: repeat(3,minmax(0,1fr));
    gap: 9px;
  }

  .cafe-seat-actions {
    flex-direction: column;
  }

  .cafe-seat-actions button {
    width: 100%;
  }

  .cafe-floating {
    bottom: 12px;
    padding: 11px 13px;
    gap: 10px;
  }

  .cafe-floating-icon {
    width: 40px;
    height: 40px;
  }

  .cafe-floating > strong {
    font-size: 16px;
  }

  .cafe-drawer-head,
  .cafe-drawer-bottom {
    padding: 20px;
  }

  .cafe-drawer-items {
    padding: 13px 20px;
  }
}

@media (max-width: 400px) {
  .cafe-hero h1 {
    font-size: 33px;
  }

  .cafe-hero-features {
    font-size: 10px;
    gap: 9px;
  }

  .cafe-food-photo {
    height: 120px;
  }

  .cafe-food-name h3 {
    font-size: 12px;
  }

  .cafe-food-bottom {
    flex-wrap: wrap;
  }

  .cafe-food-info {
    padding: 10px;
  }

  .cafe-seat-heading {
    flex-wrap: wrap;
  }

  .cafe-tracking strong {
    font-size: 12px;
  }

  .cafe-deadline > strong {
    font-size: 35px;
  }
}

@keyframes cafeSpin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes cafeFade {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .cafe-kiosk *,
  .cafe-kiosk *::before,
  .cafe-kiosk *::after {
    animation-duration: .01ms !important;
    transition-duration: .01ms !important;
  }
}

/* Visible Scan UPI QR option on the main menu */
.cafe-qr-shortcut {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 16px 20px;
  margin: 16px 0;
  background: #f1f8f3;
  border: 1px solid #cfe4d4;
  border-radius: 16px;
}
.cafe-qr-shortcut-description {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #173f35;
}
.cafe-qr-shortcut-description span { display: grid; gap: 4px; }
.cafe-qr-shortcut-description small { color: #587268; line-height: 1.45; }
.cafe-qr-shortcut button {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  border-radius: 12px;
  background: #173f35;
  color: #fff;
  padding: 12px 17px;
  border: none;
  font-weight: 700;
}
@media (max-width: 640px) {
  .cafe-qr-shortcut { flex-direction: column; align-items: stretch; }
  .cafe-qr-shortcut button { width: 100%; }
}
`;

// ============================================
// HELPERS
// ============================================

const PAYMENT_TIMEOUT = 60_000;

const fmt = (value) =>
  `₹${Number(value || 0).toFixed(2)}`;

const paid = (order) =>
  order?.paymentStatus === "Paid";

const hasSeat = (order) =>
  Number.isInteger(Number(order?.seatNumber)) &&
  Number(order?.seatNumber) > 0;

function categoryEmoji(name = "") {
  if (/breakfast/i.test(name)) return "🥪";
  if (/lunch/i.test(name)) return "🍛";
  if (/snack/i.test(name)) return "🍟";
  if (/beverage|drink/i.test(name)) return "🥤";
  return "🍽️";
}

// ============================================
// API REQUEST HELPER
// ============================================

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    cache: "no-store",
    ...options,

    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response
    .json()
    .catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(
      data.message ||
      `Request failed (${response.status})`
    );
  }

  return data;
}

// ============================================
// RAZORPAY SCRIPT
// ============================================

let razorpayScriptPromise;

function loadRazorpay() {
  if (window.Razorpay) {
    return Promise.resolve();
  }

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise(
      (resolve, reject) => {
        const script = document.createElement("script");

        script.src =
          "https://checkout.razorpay.com/v1/checkout.js";

        script.async = true;

        script.onload = resolve;

        script.onerror = () =>
          reject(
            new Error(
              "Payment gateway could not load."
            )
          );

        document.head.appendChild(script);
      }
    ).catch((error) => {
      razorpayScriptPromise = null;
      throw error;
    });
  }

  return razorpayScriptPromise;
}


// ============================================
// KEEP THE CURRENT GUEST ORDER ON PAGE REFRESH
// sessionStorage persists in the SAME browser tab
// until admin confirms an order or it is cancelled.
// ============================================

const KIOSK_SESSION_KEY = "officebite_active_guest_order_v3";

function readSavedKioskOrder() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(KIOSK_SESSION_KEY);
    if (!raw) return null;

    const saved = JSON.parse(raw);
    const order = saved?.order;

    const valid =
      typeof order?._id === "string" &&
      /^[0-9a-f]{24}$/i.test(order._id) &&
      typeof order?.trackingCode === "string" &&
      /^[0-9A-F]{16}$/i.test(order.trackingCode) &&
      typeof saved?.key === "string" &&
      /^[0-9a-f]{64}$/i.test(saved.key) &&
      Number.isFinite(saved.createdAtMs) &&
      saved.createdAtMs > 0 &&
      saved.createdAtMs <= Date.now() + PAYMENT_TIMEOUT;

    if (!valid) {
      window.sessionStorage.removeItem(KIOSK_SESSION_KEY);
      return null;
    }

    return saved;
  } catch {
    try {
      window.sessionStorage.removeItem(KIOSK_SESSION_KEY);
    } catch {}
    return null;
  }
}

function saveKioskOrder(value) {
  if (typeof window === "undefined") return;
  try {
    if (value) {
      window.sessionStorage.setItem(
        KIOSK_SESSION_KEY,
        JSON.stringify(value)
      );
    } else {
      window.sessionStorage.removeItem(KIOSK_SESSION_KEY);
    }
  } catch {
    // Some private-browser settings block storage.
  }
}

// ============================================
// MAIN KIOSK COMPONENT
// ============================================

export function KioskPage() {
  const [restoredOrder] = useState(readSavedKioskOrder);
  const [franchises, setFranchises] = useState([]);
  const [franchiseId, setFranchiseId] = useState(
    restoredOrder?.franchiseId || ""
  );

  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);

  const [onlineEnabled, setOnlineEnabled] =
    useState(false);

  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  // Default menu ordering: cheapest items first.
  const [priceSort, setPriceSort] = useState("low-high");
  const [vegOnly, setVegOnly] = useState(false);
  const [jainOnly, setJainOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState("");
  const [qrEnabled, setQrEnabled] = useState(false);
  const [upiQr, setUpiQr] = useState(null);

  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoPreview, setPromoPreview] = useState(null);
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoError, setPromoError] = useState("");

  // menu | checkout | status
  // An active guest order always reopens after F5.
  const [screen, setScreen] = useState(
    restoredOrder ? "status" : "menu"
  );

  const [method, setMethod] = useState(
    restoredOrder?.method || "Counter Cash"
  );

  const [activeOrder, setActiveOrder] = useState(
    restoredOrder
  );

  const [seats, setSeats] = useState({
    capacity: 0,
    available: [],
    occupied: [],
  });

  const [seatChoice, setSeatChoice] =
    useState(null);

  const [paymentSeconds, setPaymentSeconds] = useState(() =>
    restoredOrder
      ? Math.max(
          0,
          Math.ceil(
            (restoredOrder.createdAtMs + PAYMENT_TIMEOUT - Date.now()) /
              1000
          )
        )
      : 60
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const lock = useRef(false);
  const activeOrderRef = useRef(restoredOrder);
  const gatewayRef = useRef(null);
  const timeoutCheckingRef = useRef(false);
  const lastTimeoutAttemptRef = useRef(0);

  useEffect(() => {
    activeOrderRef.current = activeOrder;
  }, [activeOrder]);

  // Preserve the order (and guest key) across browser refreshes.
  // A PAID order is never cleared just because seat selection is pending.
  useEffect(() => {
    if (screen === "status" && activeOrder) {
      saveKioskOrder(activeOrder);
    }
  }, [screen, activeOrder]);

  // Also persist synchronously on pagehide (F5 / browser refresh).
  useEffect(() => {
    const preserveOnRefresh = () => {
      if (activeOrderRef.current) {
        saveKioskOrder(activeOrderRef.current);
      }
    };

    window.addEventListener("pagehide", preserveOnRefresh);
    return () =>
      window.removeEventListener("pagehide", preserveOnRefresh);
  }, []);

  // ============================================
  // LOAD FRANCHISES AND PAYMENT CONFIG
  // ============================================

  useEffect(() => {
    let mounted = true;

    api("/franchise/public")
      .then((data) => {
        if (!mounted) return;

        const items = data.franchises || [];

        setFranchises(items);
        // Keep the franchise of the active guest order after F5.
        setFranchiseId((previous) => previous || items[0]?._id || "");
      })
      .catch((err) => {
        if (mounted) setError(err.message);
      });

    api("/kiosk/config")
      .then((data) => {
        if (!mounted) return;

        const enabled = !!data.onlineEnabled;

        setOnlineEnabled(enabled);
        setQrEnabled(Boolean(data.qrEnabled));

        // Do not overwrite a restored order's original payment method.
        if (!restoredOrder) {
          setMethod(
            enabled ? "Online (Razorpay)" : "Counter Cash"
          );
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  // ============================================
  // LOAD MENU
  // ============================================

  useEffect(() => {
    let mounted = true;

    setCart([]);

    if (!franchiseId) {
      setMenu([]);
      setLoading(false);

      return;
    }

    setLoading(true);

    api(
      `/menu?franchiseId=${encodeURIComponent(
        franchiseId
      )}&isAvailable=true`
    )
      .then((data) => {
        if (!mounted) return;

        const items = data.items || [];

        setMenu(
          items.filter(
            (item) =>
              item.isAvailable !== false &&
              !item.catalogPreview
          )
        );
      })
      .catch((err) => {
        if (mounted) setError(err.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [franchiseId]);

  // ============================================
  // MENU FILTERS
  // ============================================

  const categories = useMemo(
    () => [
      "All",
      ...new Set(
        menu
          .map((item) => item.category)
          .filter(Boolean)
      ),
    ],
    [menu]
  );

  // Combine search, category and sorting without mutating menu state.
  // Sort is always applied AFTER filtering, so both controls work together.
  const visible = useMemo(() => {
    const term = search.toLowerCase().trim();
    const matchingItems = menu.filter((item) => {
      const matchCategory =
        category === "All" || item.category === category;
      const matchSearch =
        `${item.name || ""} ${item.category || ""}`
          .toLowerCase()
          .includes(term);
      const matchesVeg = !vegOnly || item.isVeg === true;
      const matchesJain = !jainOnly || item.isJain === true;
      const cap = Number(maxPrice);
      const matchesPrice = maxPrice === "" || (Number.isFinite(cap) && cap >= 0 && Number(item.price) <= cap);
      return matchCategory && matchSearch && matchesVeg && matchesJain && matchesPrice;
    });

    return matchingItems.sort((a, b) => {
      const nameA = String(a.name || "");
      const nameB = String(b.name || "");
      const priceA = Number(a.price) || 0;
      const priceB = Number(b.price) || 0;

      if (priceSort === "high-low") {
        return priceB - priceA || nameA.localeCompare(nameB);
      }
      if (priceSort === "name-az") {
        return nameA.localeCompare(nameB);
      }
      if (priceSort === "name-za") {
        return nameB.localeCompare(nameA);
      }
      // Initial value and fallback: Price low to high.
      return priceA - priceB || nameA.localeCompare(nameB);
    });
  }, [menu, category, search, priceSort, vegOnly, jainOnly, maxPrice]);

  const quantity = cart.reduce(
    (sum, item) =>
      sum + item.quantity,
    0
  );

  const total = cart.reduce(
    (sum, item) =>
      sum + item.price * item.quantity,
    0
  );

  // Coupon display is bound to the exact cart contents and franchise.
  // Real pricing is recalculated by the backend when the order is placed.
  const cartSignature = JSON.stringify({
    franchiseId,
    items: cart.map(item => [item.id, item.quantity]),
  });
  const appliedPromo = promoPreview?.signature === cartSignature &&
    promoPreview?.couponCode === promoCode.trim().toUpperCase()
    ? promoPreview : null;
  const amountToPay = appliedPromo?.total ?? total;

  // Simple complementary-food recommendations (no paid AI API required).
  const recommendations = useMemo(() => {
    if (!cart.length) return [];
    const inCart = new Set(cart.map(item => item.id));
    const chosen = menu.find(item => item._id === cart[cart.length - 1].id);
    const pairs = {
      Breakfast: ["Beverages", "Snacks"],
      Lunch: ["Beverages", "Desserts"],
      Snacks: ["Beverages", "Desserts"],
      Beverages: ["Snacks", "Breakfast"],
      Desserts: ["Beverages", "Snacks"],
    };
    const ideal = pairs[chosen?.category] || ["Beverages"];
    return menu.filter(item => item.isAvailable && !inCart.has(item._id))
      .sort((a, b) =>
        (ideal.includes(b.category) ? 1 : 0) - (ideal.includes(a.category) ? 1 : 0) ||
        Number(Boolean(b.isPopular)) - Number(Boolean(a.isPopular))
      ).slice(0, 3);
  }, [menu, cart]);

  async function applyPromo() {
    const code = promoCode.trim().toUpperCase();
    if (!code || !franchiseId || !cart.length) return;
    setPromoBusy(true); setPromoError(""); setPromoPreview(null);
    const signature = cartSignature;
    try {
      const response = await api("/coupons/preview", {
        method: "POST",
        body: JSON.stringify({
          code, franchiseId,
          items: cart.map(item => ({ menuItemId: item.id, quantity: item.quantity })),
        }),
      });
      setPromoPreview({ ...response, signature });
    } catch (err) { setPromoError(err.message); }
    finally { setPromoBusy(false); }
  }

  const heroImage = menu.find(
    (item) => item.image
  )?.image;

  const currentFranchise = franchises.find(
    (item) => item._id === franchiseId
  );

  // ============================================
  // CART FUNCTIONS
  // ============================================

  function changeQty(food, delta) {
    setCart((old) => {
      const found = old.find(
        (item) => item.id === food._id
      );

      if (!found) {
        if (delta <= 0) return old;

        return [
          ...old,
          {
            id: food._id,
            name: food.name,
            price: Number(food.price),
            quantity: 1,
            instructions: "",
          },
        ];
      }

      return old
        .map((item) =>
          item.id === food._id
            ? {
                ...item,
                quantity: Math.max(
                  0,
                  Math.min(
                    50,
                    item.quantity + delta
                  )
                ),
              }
            : item
        )
        .filter(
          (item) => item.quantity > 0
        );
    });
  }

  function updateInstructions(id, instructions) {
    setCart(previous => previous.map(item => item.id === id
      ? {...item, instructions: instructions.slice(0, 200)}
      : item));
  }

  // ============================================
  // RESET KIOSK
  // ============================================

  const reset = useCallback(() => {
    lock.current = false;

    activeOrderRef.current = null;
    // Only clear storage when it is safe to release the kiosk.
    saveKioskOrder(null);

    gatewayRef.current?.close?.();
    gatewayRef.current = null;

    setBusy(false);
    setCart([]);
    setCartOpen(false);
    setPromoCode("");
    setPromoPreview(null);
    setPromoError("");

    setCategory("All");
    setSearch("");

    setActiveOrder(null);
    setSeatChoice(null);
    setUpiQr(null);

    setPaymentSeconds(60);

    setSeats({
      capacity: 0,
      available: [],
      occupied: [],
    });

    setError("");
    setScreen("menu");

    setMethod(
      onlineEnabled
        ? "Online (Razorpay)"
        : "Counter Cash"
    );
  }, [onlineEnabled]);

  // ============================================
  // REFRESH ORDER
  // ============================================

  const refreshOrder = useCallback(async (code) => {
    const data = await api(
      `/kiosk/track/${encodeURIComponent(code)}`
    );

    setActiveOrder((old) => {
      if (
        !old ||
        old.order.trackingCode !== code
      ) {
        return old;
      }

      const next = { ...data.order };

      if (
        paid(old.order) &&
        !paid(next)
      ) {
        next.paymentStatus = "Paid";
      }

      if (
        hasSeat(old.order) &&
        !hasSeat(next)
      ) {
        next.seatNumber =
          old.order.seatNumber;
      }

      const updated = {
        ...old,

        order: {
          ...old.order,
          ...next,
        },
      };

      activeOrderRef.current = updated;

      return updated;
    });

    return data.order;
  }, []);

  // ============================================
  // LOAD AVAILABLE SEATS
  // ============================================

  const loadSeats = useCallback(
    async (order, key) => {
      const result = await api(
        `/kiosk/orders/${order._id}/seats`,
        {
          headers: {
            "x-kiosk-order-key": key,
          },
        }
      );

      setSeats({
        capacity: result.capacity || 0,
        available: result.available || [],
        occupied: result.occupied || [],
      });

      setSeatChoice((old) =>
        result.available?.includes(old)
          ? old
          : null
      );
    },
    []
  );

  // ============================================
  // POLLING FOR ADMIN CONFIRMATION
  // ============================================

  useEffect(() => {
    if (
      screen !== "status" ||
      !activeOrder?.order?.trackingCode
    ) {
      return;
    }

    const code = activeOrder.order.trackingCode;

    refreshOrder(code).catch(() => {});

    const interval = setInterval(() => {
      refreshOrder(code).catch(() => {});
    }, 2500);

    return () => clearInterval(interval);
  }, [
    screen,
    activeOrder?.order?.trackingCode,
    refreshOrder,
  ]);

  // ============================================
  // REFRESH AVAILABLE SEATS
  // ============================================

  useEffect(() => {
    if (
      screen !== "status" ||
      !paid(activeOrder?.order) ||
      hasSeat(activeOrder?.order)
    ) {
      return;
    }

    let mounted = true;

    const updateSeats = () => {
      if (!mounted) return;

      loadSeats(
        activeOrder.order,
        activeOrder.key
      ).catch((err) => {
        if (mounted) setError(err.message);
      });
    };

    updateSeats();

    const interval = setInterval(
      updateSeats,
      8000
    );

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [
    screen,
    activeOrder?.order?._id,
    activeOrder?.key,
    activeOrder?.order?.paymentStatus,
    activeOrder?.order?.seatNumber,
    loadSeats,
  ]);

  // ============================================
  // ADMIN CONFIRMS -> AUTO OPEN MENU
  // ============================================

  useEffect(() => {
    if (screen !== "status") return;

    const order = activeOrder?.order;
    if (!order) return;

    const adminConfirmed = [
      "Confirmed",
      "Preparing",
      "Ready",
      "Picked Up",
    ].includes(order.status);

    // NEVER open the menu before the customer's seat is confirmed.
    // Admin confirmation releases the kiosk only once both payment
    // and customer seat selection are verified by the server.
    if (
      (adminConfirmed && paid(order) && hasSeat(order)) ||
      order.status === "Cancelled"
    ) {
      reset();
    }
  }, [
    screen,
    activeOrder?.order?.status,
    activeOrder?.order?.paymentStatus,
    activeOrder?.order?.seatNumber,
    reset,
  ]);

  // ============================================
  // PAYMENT TIMEOUT VALIDATION
  // ============================================

  const checkPaymentTimeout = useCallback(
    async () => {
      const current = activeOrderRef.current;

      if (
        !current ||
        paid(current.order) ||
        timeoutCheckingRef.current
      ) {
        return;
      }

      // If the network is down, retry later rather than clearing
      // a potentially paid order and dropping seat selection.
      if (Date.now() - lastTimeoutAttemptRef.current < 5000) {
        return;
      }
      lastTimeoutAttemptRef.current = Date.now();
      timeoutCheckingRef.current = true;

      const code = current.order.trackingCode;

      try {
        const data = await api(
          `/kiosk/orders/${current.order._id}/recover`,
          { headers: { "x-kiosk-order-key": current.key } }
        );

        if (
          activeOrderRef.current?.order
            ?.trackingCode !== code
        ) {
          return;
        }

        if (paid(data.order)) {
          setActiveOrder((old) => {
            if (
              !old ||
              old.order.trackingCode !== code
            ) {
              return old;
            }

            const updated = {
              ...old,
              order: {
                ...old.order,
                ...data.order,
              },
            };

            activeOrderRef.current = updated;

            return updated;
          });
        } else if (
          !paid(activeOrderRef.current.order)
        ) {
          const pending = activeOrderRef.current;
          // QR payments may be credited late; never reset while a QR is
          // still within its provider-supplied validity window.
          if (pending.method === "Counter UPI" && qrEnabled &&
            (!pending.qrCloseBy || new Date(pending.qrCloseBy).getTime() > Date.now())) {
            setError("Waiting for verified QR payment or QR expiry. Your order remains saved.");
            return;
          }
          reset();
        }
      } catch {
        // Network errors must not erase the customer's active order.
        // Keep the status screen, and retry after a short delay.
        if (
          activeOrderRef.current?.order?.trackingCode === code &&
          !paid(activeOrderRef.current.order)
        ) {
          setError(
            "Cannot verify payment status yet. Reconnecting; your order is saved."
          );
        }
      } finally {
        timeoutCheckingRef.current = false;
      }
    },
    [reset, qrEnabled]
  );

  // ============================================
  // 60-SECOND PAYMENT COUNTDOWN
  // ============================================

  useEffect(() => {
    if (
      screen !== "status" ||
      !activeOrder ||
      paid(activeOrder.order)
    ) {
      return;
    }

    const deadline = activeOrder?.qrCloseBy
      ? Math.max(activeOrder.createdAtMs + PAYMENT_TIMEOUT, new Date(activeOrder.qrCloseBy).getTime())
      : activeOrder.createdAtMs + PAYMENT_TIMEOUT;

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil(
          (deadline - Date.now()) / 1000
        )
      );

      setPaymentSeconds(remaining);

      if (remaining === 0) {
        void checkPaymentTimeout();
      }
    };

    tick();

    const interval = setInterval(
      tick,
      1000
    );

    return () => clearInterval(interval);
  }, [
    screen,
    activeOrder?.order?._id,
    activeOrder?.createdAtMs,
    activeOrder?.order?.paymentStatus,
    activeOrder?.qrCloseBy,
    checkPaymentTimeout,
  ]);

  // ============================================
  // ONLINE PAYMENT
  // ============================================

  async function payOnline(order, key) {
    await loadRazorpay();

    const payment = await api(
      `/kiosk/orders/${order._id}/pay`,
      {
        method: "POST",

        headers: {
          "x-kiosk-order-key": key,
        },
      }
    );

    return new Promise((resolve, reject) => {
      let settled = false;

      const rejectOnce = (message) => {
        if (settled) return;

        settled = true;

        reject(new Error(message));
      };

      const checkout = new window.Razorpay({
        key: payment.keyId,

        amount: payment.amount,

        currency: payment.currency,

        name: "OfficeBite",

        description:
          `Order ${order.orderNumber}`,

        order_id: payment.gatewayOrderId,

        theme: {
          color: "#173f35",
        },

        handler: async (details) => {
          if (settled) return;

          settled = true;

          try {
            const verified = await api(
              `/kiosk/orders/${order._id}/verify`,
              {
                method: "POST",

                headers: {
                  "x-kiosk-order-key": key,
                },

                body: JSON.stringify(details),
              }
            );

            setActiveOrder((old) => {
              if (
                !old ||
                old.order._id !== order._id
              ) {
                return old;
              }

              const updated = {
                ...old,

                order: {
                  ...old.order,
                  ...verified.order,
                },
              };

              activeOrderRef.current = updated;

              return updated;
            });

            resolve(verified.order);
          } catch (err) {
            reject(err);
          }
        },

        modal: {
          ondismiss: () =>
            rejectOnce(
              "Payment popup closed. Check payment status before retrying."
            ),
        },
      });

      checkout.on(
        "payment.failed",
        (event) => {
          rejectOnce(
            event.error?.description ||
              "Payment failed."
          );
        }
      );

      gatewayRef.current = checkout;

      checkout.open();
    });
  }

  // ============================================
  // PLACE ORDER
  // ============================================

  async function placeOrder() {
    if (
      lock.current ||
      !cart.length ||
      !franchiseId
    ) {
      return;
    }

    lock.current = true;

    setBusy(true);
    setError("");

    try {
      const result = await api(
        "/kiosk/orders",
        {
          method: "POST",

          body: JSON.stringify({
            franchiseId,

            paymentMethod: method,

            items: cart.map((item) => ({
              menuItemId: item.id,
              quantity: item.quantity,
              instructions: item.instructions || "",
            })),
            couponCode: appliedPromo?.couponCode || "",
          }),
        }
      );

      const fresh = {
        order: result.order,
        key: result.orderKey,
        method,
        franchiseId,
        createdAtMs: Date.now(),
      };

      // Save BEFORE Razorpay opens or the user can press F5.
      saveKioskOrder(fresh);
      activeOrderRef.current = fresh;

      setPaymentSeconds(60);

      setActiveOrder(fresh);

      setCart([]);
      setCartOpen(false);

      setScreen("status");

      if (method === "Online (Razorpay)") {
        try {
          await payOnline(
            result.order,
            result.orderKey
          );
        } catch (err) {
          if (
            activeOrderRef.current?.order?._id ===
            result.order._id
          ) {
            setError(err.message);
          }
        }

        if (
          activeOrderRef.current?.order?._id ===
          result.order._id
        ) {
          await refreshOrder(
            result.order.trackingCode
          ).catch(() => {});
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  // ============================================
  // DYNAMIC UPI QR: PROVIDER-VERIFIED, NEVER
  // MARK PAID SIMPLY BECAUSE THE IMAGE IS SHOWN
  // ============================================
  const createUpiQr = useCallback(async (order, key) => {
    if (!qrEnabled) return;
    try {
      const response = await api(`/kiosk/orders/${order._id}/upi-qr`, {
        method: "POST",
        headers: { "x-kiosk-order-key": key },
      });
      if (!/^https:\/\//.test(response.imageUrl || "")) throw new Error("Invalid payment QR URL.");
      setUpiQr({imageUrl: response.imageUrl, closeBy: response.closeBy});
      setActiveOrder(current => {
        if (current?.order?._id !== order._id) return current;
        const updated = { ...current, qrCloseBy: response.closeBy };
        activeOrderRef.current = updated;
        saveKioskOrder(updated);
        return updated;
      });
    } catch (err) { setError(err.message); }
  }, [qrEnabled]);

  useEffect(() => {
    if (screen !== "status" || !activeOrder || !qrEnabled ||
      activeOrder.method !== "Counter UPI" || paid(activeOrder.order)) return;
    if (upiQr?.imageUrl) return;
    void createUpiQr(activeOrder.order, activeOrder.key);
  }, [screen, activeOrder?.order?._id, activeOrder?.order?.paymentStatus, activeOrder?.method, activeOrder?.qrCloseBy, activeOrder?.key, qrEnabled, upiQr?.imageUrl, createUpiQr]);

  // Recover QR capture every 12s; public tracking polling has no access
  // to provider payment details, so signed order key is required.
  useEffect(() => {
    if (screen !== "status" || !qrEnabled || !activeOrder ||
      activeOrder.method !== "Counter UPI" || paid(activeOrder.order)) return;
    const check = async () => {
      const current = activeOrderRef.current;
      if (!current || current.order.paymentStatus === "Paid") return;
      try {
        const response = await api(`/kiosk/orders/${current.order._id}/recover`, {
          headers:{"x-kiosk-order-key":current.key},
        });
        if (response?.order?.paymentStatus === "Paid") {
          setActiveOrder(old => {
            if (!old || old.order._id !== current.order._id) return old;
            const updated={...old,order:{...old.order,...response.order}};
            activeOrderRef.current=updated;
            saveKioskOrder(updated);
            return updated;
          });
        }
      } catch { /* Retain current order on network/provider error. */ }
    };
    const timer=setInterval(check,12000);
    return ()=>clearInterval(timer);
  }, [screen,qrEnabled,activeOrder?.order?._id,activeOrder?.method,activeOrder?.order?.paymentStatus]);

  // ============================================
  // RETRY ONLINE PAYMENT
  // ============================================

  async function retryPayment() {
    if (
      !activeOrder ||
      lock.current
    ) {
      return;
    }

    lock.current = true;

    setBusy(true);
    setError("");

    try {
      const latest = await refreshOrder(
        activeOrder.order.trackingCode
      );

      if (!paid(latest)) {
        await payOnline(
          activeOrder.order,
          activeOrder.key
        );
      }

      await refreshOrder(
        activeOrder.order.trackingCode
      );
    } catch (err) {
      if (
        activeOrderRef.current?.order?._id ===
        activeOrder.order._id
      ) {
        setError(err.message);
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  // ============================================
  // CUSTOMER SEAT CONFIRMATION
  // ============================================

  async function confirmSeat() {
    if (
      !activeOrder ||
      !paid(activeOrder.order) ||
      !seats.available.includes(seatChoice) ||
      lock.current
    ) {
      return;
    }

    lock.current = true;

    setBusy(true);
    setError("");

    try {
      const result = await api(
        `/kiosk/orders/${activeOrder.order._id}/seat`,
        {
          method: "POST",

          headers: {
            "x-kiosk-order-key":
              activeOrder.key,
          },

          body: JSON.stringify({
            seatNumber: seatChoice,
          }),
        }
      );

      setActiveOrder((old) => {
        if (
          !old ||
          old.order._id !==
            activeOrder.order._id
        ) {
          return old;
        }

        const updated = {
          ...old,

          order: {
            ...old.order,
            ...result.order,
          },
        };

        activeOrderRef.current = updated;

        return updated;
      });
    } catch (err) {
      setError(err.message);

      await loadSeats(
        activeOrder.order,
        activeOrder.key
      ).catch(() => {});
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  // ============================================
  // PAYMENT METHODS
  // ============================================

  const paymentMethods = [
    ...(onlineEnabled
      ? [
          {
            value: "Online (Razorpay)",
            label: "Pay online",
            description:
              "UPI, cards and net banking",
            icon: CreditCard,
          },
        ]
      : []),

    {
      value: "Counter Cash",
      label: "Cash at counter",
      description: "Pay our cashier",
      icon: Wallet,
    },

    {
      value: "Counter UPI",
      label: qrEnabled ? "Scan UPI QR" : "UPI",
      description: qrEnabled
        ? "Generate an order-specific UPI QR after placing your order"
        : "QR unavailable; cashier verifies counter UPI payment",
      icon: QrCode,
    },
  ];

  // ============================================
  // RETURN UI
  // ============================================

  return (
    <div className="cafe-kiosk">
      {/* EMBEDDED CSS */}

      <style>{KIOSK_STYLES}</style>

      {/* ====================================
          HEADER
      ==================================== */}

      <header className="cafe-header">
        <div className="cafe-container cafe-header-inner">
          <div className="cafe-logo">
            <span className="cafe-logo-icon">
              <Coffee size={24} />
            </span>

            <span>
              office
              <span className="cafe-orange">
                bite.
              </span>

              <small>
                GOOD FOOD. GOOD MOOD.
              </small>
            </span>
          </div>

          <div className="cafe-header-end">
            <span className="cafe-live">
              <i />
              Self-service ordering
            </span>

            {screen === "menu" && (
              <button
                type="button"
                className="cafe-cart-icon"
                onClick={() =>
                  setCartOpen(true)
                }
                aria-label="Open cart"
              >
                <ShoppingCart size={22} />

                {quantity > 0 && (
                  <b>{quantity}</b>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ====================================
          MAIN CONTENT
      ==================================== */}

      <div className="cafe-container">
        {/* PROGRESS STEPS */}

        <nav
          className="cafe-progress"
          aria-label="Ordering steps"
        >
          {[
            "Choose food",
            "Payment",
            "Pick your seat",
            "Admin confirms",
          ].map((name, index) => {
            const step =
              screen === "menu"
                ? 0
                : screen === "checkout" ||
                  !paid(activeOrder?.order)
                ? 1
                : hasSeat(activeOrder?.order)
                ? 3
                : 2;

            return (
              <div
                key={name}
                className={
                  index <= step
                    ? "active"
                    : ""
                }
              >
                <span>
                  {index < step ? (
                    <Check size={14} />
                  ) : (
                    index + 1
                  )}
                </span>

                {name}
              </div>
            );
          })}
        </nav>

        {/* ERROR MESSAGE */}

        {error && (
          <div
            className="cafe-error"
            role="alert"
          >
            {error}

            <button
              onClick={() =>
                setError("")
              }
              aria-label="Dismiss"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* ====================================
            MENU SCREEN
        ==================================== */}

        {screen === "menu" && (
          <main className="cafe-menu-page">
            {/* HERO */}

            <section className="cafe-hero">
              <div className="cafe-hero-copy">
                <p className="cafe-eyebrow">
                  ✦ FRESHLY PREPARED, JUST FOR YOU
                </p>

                <h1>
                  Every bite,
                  <br />
                  <em>a little delight.</em>
                </h1>

                <p>
                  Discover everyday favourites,
                  pay your way and choose
                  the perfect seat.
                  Enjoy your break!
                </p>

                <div className="cafe-hero-features">
                  <span>
                    <CheckCircle2 size={16} />
                    No login
                  </span>

                  <span>
                    <ShieldCheck size={16} />
                    Secure checkout
                  </span>

                  <span>
                    <Armchair size={16} />
                    Pick your seat
                  </span>
                </div>
              </div>

              <div className="cafe-hero-photo">
                {heroImage ? (
                  <img
                    src={heroImage}
                    alt="Fresh food"
                  />
                ) : (
                  <div className="cafe-hero-placeholder">
                    🍱
                  </div>
                )}

                <div className="cafe-photo-badge">
                  MADE
                  <br />
                  <strong>FRESH!</strong>
                </div>
              </div>
            </section>

            {/* MENU HEADING */}

            <section className="cafe-menu-section">
              <div className="cafe-section-head">
                <div>
                  <p className="cafe-kicker">
                    EXPLORE OUR MENU
                  </p>

                  <h2>
                    What are you craving?
                  </h2>

                  <p>
                    Pick your favourites,
                    we'll take care of the rest.
                  </p>
                </div>

                <span className="cafe-items-count">
                  {visible.length} dishes
                </span>
              </div>

              {/* FRANCHISE + SEARCH */}

              <div className="cafe-tools">
                <label className="cafe-location">
                  <Utensils size={18} />

                  <select
                    value={franchiseId}
                    onChange={(event) => {
                      setFranchiseId(
                        event.target.value
                      );

                      setCategory("All");
                      setSearch("");
                    }}
                    aria-label="Choose cafeteria"
                  >
                    {!franchises.length && (
                      <option value="">
                        No cafeteria available
                      </option>
                    )}

                    {franchises.map((item) => (
                      <option
                        key={item._id}
                        value={item._id}
                      >
                        {item.name}
                        {item.city
                          ? ` · ${item.city}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="cafe-search">
                  <Search size={19} />

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="Search delicious food..."
                    aria-label="Search menu"
                  />
                </label>
                <label className="cafe-price-sort">
                  <ArrowDownUp size={18} aria-hidden="true" />
                  <select
                    value={priceSort}
                    onChange={(event) => setPriceSort(event.target.value)}
                    aria-label="Sort menu by price or name"
                  >
                    <option value="low-high">Price: Low to High</option>
                    <option value="high-low">Price: High to Low</option>
                    <option value="name-az">Name: A to Z</option>
                    <option value="name-za">Name: Z to A</option>
                  </select>
                </label>
              </div>

              {/* CATEGORIES */}

              <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center",margin:"15px 0 6px"}}>
                <label style={{display:"inline-flex",alignItems:"center",gap:7,fontSize:13}}>
                  <input type="checkbox" checked={vegOnly} onChange={(e)=>setVegOnly(e.target.checked)} /> Veg only
                </label>
                <label style={{display:"inline-flex",alignItems:"center",gap:7,fontSize:13}}>
                  <input type="checkbox" checked={jainOnly} onChange={(e)=>setJainOnly(e.target.checked)} /> Jain only
                </label>
                <label style={{display:"inline-flex",alignItems:"center",gap:7,fontSize:13}}>
                  Maximum price ₹
                  <input type="number" min="0" step="1" value={maxPrice} onChange={(e)=>setMaxPrice(e.target.value)} placeholder="Any" style={{width:92,padding:"8px",border:"1px solid #e5ebe4",borderRadius:9}} />
                </label>
                <button type="button" onClick={()=>{setVegOnly(false);setJainOnly(false);setMaxPrice("");}} style={{padding:"8px 12px",border:"1px solid #e5ebe4",borderRadius:9,background:"white",color:"#173f35"}}>Clear filters</button>
              </div>
              {/* QR payment shortcut: never collect money without a specific order. */}
              <div className="cafe-qr-shortcut">
                <div className="cafe-qr-shortcut-description">
                  <QrCode size={25} aria-hidden="true" />
                  <span>
                    <strong>Scan &amp; Pay with UPI</strong>
                    <small>
                      {!qrEnabled
                        ? "Secure UPI QR is not enabled on this server. Other payment options are available."
                        : !quantity
                        ? "Add food to your cart to use QR payment."
                        : "Continue to checkout, place your order, then scan its unique QR."}
                    </small>
                  </span>
                </div>
                <button
                  type="button"
                  disabled={!qrEnabled || !quantity || !franchiseId}
                  onClick={() => {
                    setCartOpen(false);
                    setMethod("Counter UPI");
                    setScreen("checkout");
                  }}
                >
                  <QrCode size={18} />
                  Scan UPI QR
                </button>
              </div>

              <div className="cafe-categories">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    className={
                      category === cat
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      setCategory(cat)
                    }
                    aria-pressed={
                      category === cat
                    }
                  >
                    {cat === "All"
                      ? "✨"
                      : categoryEmoji(cat)}

                    {" "}

                    {cat === "All"
                      ? "All items"
                      : cat}
                  </button>
                ))}
              </div>

              {/* FOOD CARDS */}

              {loading ? (
                <div className="cafe-empty">
                  <RefreshCw
                    className="cafe-spin"
                  />
                  Loading menu...
                </div>
              ) : !visible.length ? (
                <div className="cafe-empty">
                  No items found.
                  Try another category or search.
                </div>
              ) : (
                <div className="cafe-grid">
                  {visible.map((food) => {
                    const qty =
                      cart.find(
                        (item) =>
                          item.id === food._id
                      )?.quantity || 0;

                    const veg =
                      typeof food.isVeg ===
                      "boolean"
                        ? food.isVeg
                        : food.isVegetarian;

                    return (
                      <article
                        className="cafe-food-card"
                        key={food._id}
                      >
                        <div className="cafe-food-photo">
                          {food.image ? (
                            <img
                              src={food.image}
                              alt={food.name}
                              loading="lazy"
                            />
                          ) : (
                            <span className="cafe-food-emoji">
                              {categoryEmoji(
                                food.category
                              )}
                            </span>
                          )}

                          {food.category && (
                            <span className="cafe-food-tag">
                              {food.category}
                            </span>
                          )}
                        </div>

                        <div className="cafe-food-info">
                          <div className="cafe-food-name">
                            <h3>{food.name}</h3>

                            {typeof veg ===
                              "boolean" && (
                              <i
                                className={
                                  veg
                                    ? "cafe-veg"
                                    : "cafe-nonveg"
                                }
                              />
                            )}
                          </div>

                          <p>
                            Freshly prepared •
                            Made with care
                            {food.isJain ? " · Jain-friendly" : ""}
                            {Array.isArray(food.allergens) && food.allergens.length > 0
                              ? ` · Contains: ${food.allergens.join(", ")}` : ""}
                          </p>

                          <div className="cafe-food-bottom">
                            <strong>
                              {fmt(food.price)}
                            </strong>

                            {qty > 0 ? (
                              <div className="cafe-qty">
                                <button
                                  onClick={() =>
                                    changeQty(
                                      food,
                                      -1
                                    )
                                  }
                                  aria-label="Decrease quantity"
                                >
                                  <Minus size={16} />
                                </button>

                                <b>{qty}</b>

                                <button
                                  onClick={() =>
                                    changeQty(
                                      food,
                                      1
                                    )
                                  }
                                  disabled={
                                    qty >= 50
                                  }
                                  aria-label="Increase quantity"
                                >
                                  <Plus size={16} />
                                </button>
                              </div>
                            ) : (
                              <button
                                className="cafe-add"
                                onClick={() =>
                                  changeQty(
                                    food,
                                    1
                                  )
                                }
                              >
                                <Plus size={16} />
                                Add
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              <p className="cafe-menu-footnote">
                {currentFranchise?.name ||
                  "OfficeBite"}

                {" · "}
                Freshly made · No extra tax
              </p>
            </section>
          </main>
        )}

        {/* ====================================
            CHECKOUT SCREEN
        ==================================== */}

        {screen === "checkout" && (
          <main className="cafe-flow">
            <section className="cafe-panel">
              <button
                className="cafe-back"
                onClick={() =>
                  setScreen("menu")
                }
              >
                <ArrowLeft size={17} />
                Back to menu
              </button>

              <div className="cafe-panel-icon">
                <CreditCard size={26} />
              </div>

              <p className="cafe-kicker">
                ONE LAST STEP
              </p>

              <h1>
                Choose how to pay
              </h1>

              <p className="cafe-subtitle">
                Complete payment to unlock
                customer seat selection.
              </p>

              <div style={{ padding: 16, border: "1px solid #e5ebe4", borderRadius: 14, background: "#f7fbf7", margin: "18px 0" }}>
                <label htmlFor="officebite-coupon" style={{ fontWeight: 800 }}>Have a coupon?</label>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <input id="officebite-coupon" placeholder="e.g. SAVE10" maxLength={24}
                    value={promoCode} onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoPreview(null); setPromoError(""); }}
                    style={{ minWidth: 0, flex: 1, padding: 12, borderRadius: 10, border: "1px solid #cfe1d2" }} />
                  <button type="button" onClick={applyPromo} disabled={!promoCode.trim() || promoBusy || busy}
                    style={{ padding: "10px 16px", background: "#173f35", color: "white", border: 0, borderRadius: 10 }}>
                    {promoBusy ? "Checking..." : "Apply"}
                  </button>
                </div>
                {promoError && <small role="alert" style={{ display: "block", color: "#aa3525", marginTop: 8 }}>{promoError}</small>}
                {appliedPromo && <small role="status" style={{ display: "block", color: "#168154", marginTop: 8 }}>Coupon applied! You save {fmt(appliedPromo.discount)}.</small>}
              </div>

              <div className="cafe-payment-list">
                {paymentMethods.map(
                  ({
                    value,
                    label,
                    description,
                    icon: Icon,
                  }) => (
                    <label
                      key={value}
                      className={`cafe-payment ${
                        method === value
                          ? "selected"
                          : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        checked={
                          method === value
                        }
                        onChange={() =>
                          setMethod(value)
                        }
                      />

                      <span className="cafe-payment-icon">
                        <Icon size={21} />
                      </span>

                      <span>
                        <strong>
                          {label}
                        </strong>

                        <small>
                          {description}
                        </small>
                      </span>

                      <i />
                    </label>
                  )
                )}
              </div>

              {method === "Counter UPI" && (
                <div className="cafe-hint" role="status">
                  <QrCode size={18} />
                  {qrEnabled
                    ? "Place your order to generate the secure, order-specific Scan UPI QR. Seat selection unlocks after verified payment."
                    : "Dynamic Scan UPI QR is unavailable. Counter UPI requires manual cashier verification; you can also choose online payment if enabled."}
                </div>
              )}

              <div className="cafe-hint">
                <ShieldCheck size={18} />
                You can select your own
                available seat after payment.
              </div>

              <button
                className="cafe-primary cafe-full"
                disabled={
                  busy || !quantity
                }
                onClick={placeOrder}
              >
                {busy
                  ? "Processing..."
                  : `Place order · ${fmt(amountToPay)}`}

                <ChevronRight size={19} />
              </button>
            </section>

            {/* ORDER SUMMARY */}

            <aside className="cafe-panel cafe-summary">
              <p className="cafe-kicker">
                YOUR BASKET
              </p>

              <h2>Order summary</h2>

              {cart.map((item) => (
                <div
                  className="cafe-summary-row"
                  key={item.id}
                >
                  <span>
                    {item.quantity} ×
                    {" "}
                    {item.name}
                  </span>

                  <b>
                    {fmt(
                      item.price *
                        item.quantity
                    )}
                  </b>
                </div>
              ))}

              <div className="cafe-summary-row">
                <span>Tax</span>
                <b>₹0.00</b>
              </div>

              {appliedPromo && <div className="cafe-summary-row" style={{ color: "#178251" }}>
                <span>Coupon {appliedPromo.couponCode}</span>
                <b>-{fmt(appliedPromo.discount)}</b>
              </div>}
              <div className="cafe-summary-total">
                <span>Total to pay</span>
                <strong>
                  {fmt(amountToPay)}
                </strong>
              </div>

              <div className="cafe-hint">
                <Armchair size={18} />
                Your seat, your choice.
              </div>
            </aside>
          </main>
        )}

        {/* ====================================
            PAYMENT AND SEAT SCREEN
        ==================================== */}

        {screen === "status" &&
          activeOrder && (
            <main className="cafe-status">
              <section className="cafe-panel cafe-status-panel">
                <div
                  className={`cafe-status-icon ${
                    paid(activeOrder.order)
                      ? "paid"
                      : ""
                  }`}
                >
                  {hasSeat(activeOrder.order) ? (
                    <CheckCircle2 size={35} />
                  ) : paid(activeOrder.order) ? (
                    <Armchair size={35} />
                  ) : (
                    <Clock3 size={35} />
                  )}
                </div>

                <p className="cafe-kicker">
                  {hasSeat(activeOrder.order)
                    ? "WAITING FOR ADMIN"
                    : paid(activeOrder.order)
                    ? "PAYMENT CONFIRMED"
                    : "PAYMENT PENDING"}
                </p>

                <h1>
                  {hasSeat(activeOrder.order)
                    ? "Seat saved. Almost ready!"
                    : paid(activeOrder.order)
                    ? "Choose your seat"
                    : "Complete your payment"}
                </h1>

                <p className="cafe-subtitle">
                  {hasSeat(activeOrder.order)
                    ? "Your order has been sent to the admin. The menu will open automatically when the order is confirmed."
                    : paid(activeOrder.order)
                    ? "Choose any available seat. You do not need admin seat assignment."
                    : "Please complete payment within one minute. The menu will reset if payment remains pending."}
                </p>

                <div className="cafe-order-meta">
                  <span>
                    Order
                    {" "}
                    <b>
                      {
                        activeOrder.order
                          .orderNumber
                      }
                    </b>
                  </span>

                  <span
                    className={
                      paid(activeOrder.order)
                        ? "cafe-paid"
                        : "cafe-pending"
                    }
                  >
                    {paid(activeOrder.order)
                      ? "✓ Paid"
                      : "⏳ Payment pending"}
                  </span>
                </div>

                {/* 60 SECOND PAYMENT TIMER */}

                {!paid(activeOrder.order) && (
                  <div
                    className="cafe-deadline"
                    role="status"
                  >
                    <div>
                      <Clock3 size={19} />

                      <span>
                        Time left to pay
                      </span>
                    </div>

                    <strong>
                      {`${String(Math.floor(paymentSeconds / 60)).padStart(2, "0")}:${String(paymentSeconds % 60).padStart(2, "0")}`}
                    </strong>

                    <div className="cafe-deadline-track">
                      <span
                        style={{
                          width: `${
                            (paymentSeconds /
                              60) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {!paid(activeOrder?.order) && qrEnabled && activeOrder?.method === "Counter UPI" && !upiQr?.imageUrl && (
                  <div className="cafe-hint" role="status" style={{display:"flex",flexDirection:"column",gap:10,alignItems:"center"}}>
                    <QrCode size={24} aria-hidden="true" />
                    <span>Generating your secure UPI QR. If it does not appear, retry.</span>
                    <button
                      type="button"
                      className="cafe-secondary"
                      onClick={() => void createUpiQr(activeOrder.order, activeOrder.key)}
                    >
                      <RefreshCw size={17} /> Retry QR generation
                    </button>
                  </div>
                )}

                {!paymentComplete && upiQr?.imageUrl && activeOrder?.method === "Counter UPI" && (
                  <div className="cafe-hint" style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
                    <strong>Scan this unique UPI QR to pay securely</strong>
                    <img src={upiQr.imageUrl} alt="OfficeBite order-specific UPI payment QR" style={{width:220,maxWidth:"100%",aspectRatio:"1",objectFit:"contain"}} />
                    <small>Payment unlocks your seat only after Razorpay confirms capture. QR expiry may exceed 60 seconds.</small>
                  </div>
                )}

                {!paid(activeOrder.order) && (
                  <div className="cafe-hint">
                    <ShieldCheck size={19} />

                    {activeOrder.method ===
                    "Online (Razorpay)"
                      ? "Complete your secure online payment before the timer ends."
                      : "Please pay at the counter. Admin will verify the payment."}
                  </div>
                )}

                {!paid(activeOrder.order) &&
                  activeOrder.method ===
                    "Online (Razorpay)" && (
                    <button
                      className="cafe-secondary cafe-full"
                      disabled={busy}
                      onClick={retryPayment}
                    >
                      <RefreshCw size={17} />

                      Retry online payment
                    </button>
                  )}

                {/* CUSTOMER SEAT SELECTION */}

                {paid(activeOrder.order) &&
                  !hasSeat(activeOrder.order) && (
                    <div className="cafe-seat-section">
                      <div className="cafe-seat-heading">
                        <div>
                          <h2>
                            Choose your seat
                          </h2>

                          <p>
                            Tap an available
                            green seat.
                          </p>
                        </div>

                        <span>
                          {
                            seats.available
                              .length
                          }
                          {" "}
                          seats free
                        </span>
                      </div>

                      <div className="cafe-seat-legend">
                        <span>
                          <i />
                          Available
                        </span>

                        <span>
                          <i className="taken" />
                          Occupied
                        </span>

                        <span>
                          <i className="mine" />
                          Selected
                        </span>
                      </div>

                      <div className="cafe-seat-grid">
                        {Array.from(
                          {
                            length:
                              seats.capacity,
                          },
                          (_, index) =>
                            index + 1
                        ).map((number) => {
                          const available =
                            seats.available.includes(
                              number
                            );

                          return (
                            <button
                              key={number}
                              className={`cafe-seat ${
                                seatChoice ===
                                number
                                  ? "chosen"
                                  : ""
                              } ${
                                !available
                                  ? "occupied"
                                  : ""
                              }`}
                              disabled={
                                !available ||
                                busy
                              }
                              onClick={() =>
                                setSeatChoice(
                                  number
                                )
                              }
                              aria-pressed={
                                seatChoice ===
                                number
                              }
                            >
                              <Armchair
                                size={25}
                              />

                              <strong>
                                {number}
                              </strong>

                              <small>
                                {seatChoice ===
                                number
                                  ? "Selected"
                                  : available
                                  ? "Free"
                                  : "Taken"}
                              </small>
                            </button>
                          );
                        })}
                      </div>

                      {!seats.capacity && (
                        <p className="cafe-subtitle">
                          Checking available
                          seats...
                        </p>
                      )}

                      {!seats.available.length &&
                        seats.capacity > 0 && (
                          <p className="cafe-subtitle">
                            All seats are
                            occupied.
                          </p>
                        )}

                      <div className="cafe-seat-actions">
                        <button
                          className="cafe-secondary"
                          onClick={() =>
                            loadSeats(
                              activeOrder.order,
                              activeOrder.key
                            ).catch((err) =>
                              setError(
                                err.message
                              )
                            )
                          }
                        >
                          <RefreshCw
                            size={18}
                          />
                          Refresh seats
                        </button>

                        <button
                          className="cafe-primary"
                          disabled={
                            !seatChoice ||
                            busy
                          }
                          onClick={
                            confirmSeat
                          }
                        >
                          {busy
                            ? "Confirming..."
                            : seatChoice
                            ? `Confirm seat ${seatChoice}`
                            : "Select a seat"}

                          <ChevronRight
                            size={18}
                          />
                        </button>
                      </div>
                    </div>
                  )}

                {/* WAITING FOR ADMIN */}

                {hasSeat(activeOrder.order) && (
                  <div
                    className="cafe-seat-success"
                    role="status"
                  >
                    <Armchair size={36} />

                    <span>
                      {
                        activeOrder.order
                          .seatNumber
                      }
                    </span>

                    <h2>
                      Seat
                      {" "}
                      {
                        activeOrder.order
                          .seatNumber
                      }
                      {" "}
                      selected
                    </h2>

                    <p>
                      Your order is waiting
                      for admin confirmation.
                    </p>

                    <small>
                      <Clock3 size={15} />

                      Menu opens automatically
                      after confirmation.
                    </small>
                  </div>
                )}

                {/* ORDER REFERENCE */}

                <div className="cafe-tracking">
                  <div>
                    <small>
                      ORDER REFERENCE
                    </small>

                    <strong>
                      {
                        activeOrder.order
                          .trackingCode
                      }
                    </strong>
                  </div>

                  <ShieldCheck size={23} />
                </div>
              </section>
            </main>
          )}
      </div>

      {/* ====================================
          FLOATING CART BAR
      ==================================== */}

      {screen === "menu" &&
        quantity > 0 &&
        !cartOpen && (
          <button
            className="cafe-floating"
            onClick={() =>
              setCartOpen(true)
            }
          >
            <span className="cafe-floating-icon">
              <ShoppingBag size={22} />
            </span>

            <span className="cafe-floating-description">
              <b>
                {quantity}
                {" "}
                {quantity === 1
                  ? "item"
                  : "items"}
                {" "}
                added
              </b>

              <small>
                {cart
                  .map(
                    (item) =>
                      `${item.quantity}× ${item.name} · ${fmt(
                        item.price *
                          item.quantity
                      )}`
                  )
                  .join(" • ")}
              </small>
            </span>

            <strong>
              {fmt(total)}
            </strong>

            <ChevronRight size={22} />
          </button>
        )}

      {/* ====================================
          CART DRAWER
      ==================================== */}

      {screen === "menu" &&
        cartOpen && (
          <div className="cafe-overlay">
            <button
              className="cafe-scrim"
              onClick={() =>
                setCartOpen(false)
              }
              aria-label="Close cart"
            />

            <aside
              className="cafe-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Your order"
            >
              <div className="cafe-drawer-head">
                <div>
                  <p className="cafe-kicker">
                    YOUR FOOD
                  </p>

                  <h2>
                    Your order
                    {" "}
                    <span>
                      ({quantity})
                    </span>
                  </h2>
                </div>

                <button
                  onClick={() =>
                    setCartOpen(false)
                  }
                >
                  <X size={22} />
                </button>
              </div>

              <div className="cafe-drawer-items">
                {cart.length ? (
                  cart.map((item) => (
                    <div
                      className="cafe-cart-line"
                      key={item.id}
                    >
                      <div>
                        <strong>
                          {item.name}
                        </strong>

                        <small>
                          {fmt(item.price)}
                          {" "}
                          each
                        </small>
                        <label style={{display:"grid",gap:5,fontSize:11,color:"#74867c",marginTop:10}}>
                          Special instructions (optional)
                          <textarea value={item.instructions||""} maxLength={200}
                            placeholder="e.g. Less spicy, no onion"
                            onChange={e=>updateInstructions(item.id,e.target.value)}
                            style={{width:"100%",maxWidth:240,padding:9,borderRadius:9,border:"1px solid #e5ebe4",resize:"vertical",fontSize:12}}/>
                        </label>
                      </div>

                      <div className="cafe-cart-right">
                        <b>
                          {fmt(
                            item.price *
                              item.quantity
                          )}
                        </b>

                        <div className="cafe-qty">
                          <button
                            onClick={() =>
                              changeQty(
                                {
                                  _id:
                                    item.id,
                                },
                                -1
                              )
                            }
                          >
                            <Minus
                              size={15}
                            />
                          </button>

                          <b>
                            {
                              item.quantity
                            }
                          </b>

                          <button
                            onClick={() =>
                              changeQty(
                                {
                                  _id:
                                    item.id,
                                },
                                1
                              )
                            }
                            disabled={
                              item.quantity >=
                              50
                            }
                          >
                            <Plus
                              size={15}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="cafe-empty">
                    Your cart is empty.
                  </div>
                )}
              </div>

              {recommendations.length > 0 && <section style={{ margin: "16px 0", padding: 13, borderRadius: 13, background: "#f2f8f2" }}>
                <strong style={{ fontSize: 13, display: "block", marginBottom: 10 }}>Recommended with your order</strong>
                {recommendations.map(food => <div key={food._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 12 }}>{food.name} · {fmt(food.price)}</span>
                  <button type="button" onClick={() => changeQty(food, 1)} style={{ padding: "6px 10px", border: 0, borderRadius: 8, background: "#173f35", color: "white" }}>+ Add</button>
                </div>)}
              </section>}
              <div className="cafe-drawer-bottom">
                <div>
                  <span>Tax</span>

                  <strong>
                    ₹0.00
                  </strong>
                </div>

                <div className="cafe-drawer-total">
                  <span>
                    To pay
                  </span>

                  <strong>
                    {fmt(total)}
                  </strong>
                </div>

                <button
                  className="cafe-primary cafe-full"
                  disabled={
                    !quantity ||
                    !franchiseId
                  }
                  onClick={() => {
                    setCartOpen(false);
                    setScreen("checkout");
                  }}
                >
                  Continue to payment

                  <ChevronRight size={19} />
                </button>
              </div>
            </aside>
          </div>
        )}

      {/* FOOTER */}

      <footer className="cafe-footer">
        © OfficeBite · Fresh food,
        happy moments
        {screen === "menu" && <span> · <a href="/order-status" style={{color:"#173f35"}}>Track an order</a> · <a href="/feedback" style={{color:"#173f35"}}>Feedback</a></span>}
      </footer>
    </div>
  );
}

export default KioskPage;
