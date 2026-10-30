
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Armchair,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Coffee,
  CreditCard,
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

// ======================================================
// OFFICEBITE KIOSK
// COMPLETE JSX + EMBEDDED CSS
// NO SEPARATE CSS FILE REQUIRED
// ======================================================

const PAYMENT_TIMEOUT_MS = 60 * 1000;

const SESSION_KEY = "officebite_active_guest_order_v3";

const COLORS = {
  forest: "#173f35",
  orange: "#ee7843",
};

// ======================================================
// COMPLETE RESPONSIVE CSS
// ======================================================

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
  background: radial-gradient(
    circle at 6% 5%,
    #fff0dd,
    transparent 34%
  ), var(--cream);
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
  opacity: .5;
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
  max-width: 1360px;
  width: 100%;
  margin: 0 auto;
  padding: 0 25px;
}

/* HEADER */

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
  justify-content: space-between;
  align-items: center;
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
  background: var(--forest);
  color: #fff;
  border-radius: 15px;
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
}

.cafe-cart-icon b {
  position: absolute;
  top: -7px;
  right: -7px;
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

/* ORDER PROGRESS */

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
}

.cafe-progress .active {
  color: var(--forest);
}

.cafe-progress .active span {
  background: var(--orange);
  color: white;
}

.cafe-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
  padding: 15px;
  color: #a33b25;
  background: #fff0e9;
  border: 1px solid #f3cdbb;
  border-radius: 13px;
  font-size: 13px;
}

.cafe-error button {
  border: 0;
  background: transparent;
  color: inherit;
}

/* HERO */

.cafe-hero {
  display: grid;
  grid-template-columns: 1.12fr .88fr;
  min-height: 320px;
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

.cafe-hero-photo img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cafe-hero-photo::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    #173f35,
    transparent 70%
  );
}

.cafe-hero-placeholder {
  height: 100%;
  display: grid;
  place-items: center;
  font-size: 120px;
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
}

.cafe-photo-badge strong {
  font-size: 18px;
}

/* MENU */

.cafe-menu-section {
  padding: 42px 0 120px;
}

.cafe-section-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
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
  grid-template-columns: .8fr 1.2fr;
  gap: 15px;
}

.cafe-location,
.cafe-search {
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

.cafe-location select,
.cafe-search input {
  min-width: 0;
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--ink);
  font-size: 14px;
}

.cafe-categories {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 24px 0 27px;
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
}

.cafe-categories button.selected {
  background: var(--forest);
  color: white;
  border-color: var(--forest);
}

/* FOOD CARDS */

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
  transition: transform .25s,box-shadow .25s;
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
  transition: transform .3s;
}

.cafe-food-card:hover img {
  transform: scale(1.05);
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
}

.cafe-add {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 9px 13px;
  color: white;
  background: var(--orange);
  border: 0;
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
  margin-top: 34px;
  color: #98aa9a;
  text-align: center;
  font-size: 12px;
}

/* FLOATING CART */

.cafe-floating {
  position: fixed;
  z-index: 25;
  left: 50%;
  bottom: 22px;
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
}

.cafe-floating-description {
  flex: 1;
  min-width: 0;
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

/* CART DRAWER */

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
  gap: 12px;
  margin: 15px 0;
  padding: 17px 0;
  border-top: 1px dashed var(--line);
  font-size: 20px;
  font-weight: 900;
}

.cafe-drawer-total strong {
  color: var(--forest);
}

/* BUTTONS */

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
  transition: .2s;
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

/* CHECKOUT */

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

/* ORDER STATUS */

.cafe-status {
  max-width: 875px;
  margin: 35px auto 90px;
}

.cafe-status-panel {
  text-align: center;
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

/* PAYMENT TIMER */

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

/* SEAT SELECTION */

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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: #f0fbf3;
  color: #198754;
  border: 1.5px solid #bbe4c7;
  border-radius: 14px;
  transition: .2s;
}

.cafe-seat:hover:not(:disabled) {
  transform: translateY(-3px);
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
}

.cafe-tracking strong {
  overflow-wrap: anywhere;
  font-family: monospace;
  font-size: 16px;
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

/* RESPONSIVE */

@media (max-width:1100px) {
  .cafe-grid {
    grid-template-columns: repeat(3,minmax(0,1fr));
  }
}

@media (max-width:850px) {
  .cafe-grid {
    grid-template-columns: repeat(3,minmax(0,1fr));
    gap: 14px;
  }

  .cafe-flow {
    grid-template-columns: 1fr;
  }

  .cafe-seat-grid {
    grid-template-columns: repeat(4,minmax(0,1fr));
  }

  .cafe-food-photo {
    height: 165px;
  }
}

@media (max-width:650px) {
  .cafe-container {
    padding: 0 14px;
  }

  .cafe-header-inner {
    height: 69px;
  }

  .cafe-logo {
    font-size: 23px;
  }

  .cafe-logo-icon {
    width: 41px;
    height: 41px;
  }

  .cafe-live {
    display: none;
  }

  .cafe-progress {
    justify-content: space-between;
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

  .cafe-tools {
    grid-template-columns: 1fr;
    gap: 10px;
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

  .cafe-flow,
  .cafe-status {
    margin: 20px 0 65px;
  }

  .cafe-panel {
    padding: 23px;
  }

  .cafe-panel h1 {
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

@media (max-width:400px) {
  .cafe-hero h1 {
    font-size: 33px;
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

  .cafe-seat-heading {
    flex-wrap: wrap;
  }

  .cafe-tracking strong {
    font-size: 12px;
  }
}

@keyframes cafeSpin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion:reduce) {
  .cafe-kiosk *,
  .cafe-kiosk *::before,
  .cafe-kiosk *::after {
    animation-duration: .01ms !important;
    transition-duration: .01ms !important;
  }
}
`;

// ======================================================
// HELPERS
// ======================================================

const fmt = (value) =>
  `₹${Number(value || 0).toFixed(2)}`;

const isPaid = (order) =>
  order?.paymentStatus === "Paid";

const hasSeat = (order) =>
  Number.isInteger(Number(order?.seatNumber)) &&
  Number(order?.seatNumber) > 0;

const ADMIN_CONFIRMED_STATUSES = [
  "Confirmed",
  "Preparing",
  "Ready",
  "Picked Up",
];

function categoryEmoji(category = "") {
  if (/breakfast/i.test(category)) return "🥪";
  if (/lunch/i.test(category)) return "🍛";
  if (/snack/i.test(category)) return "🍟";
  if (/beverage|drink/i.test(category)) return "🥤";
  return "🍽️";
}

// ======================================================
// SESSION STORAGE
// REFRESH KE BAAD CURRENT ORDER RESTORE
// ======================================================

function readSavedKioskOrder() {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(SESSION_KEY);

    if (!raw) return null;

    const saved = JSON.parse(raw);

    if (
      !saved?.order?._id ||
      !saved?.order?.trackingCode ||
      !saved?.key ||
      !saved?.createdAtMs
    ) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }

    return saved;
  } catch {
    return null;
  }
}

function saveKioskOrder(value) {
  if (typeof window === "undefined") return;

  try {
    if (value) {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify(value)
      );
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // Storage can be blocked in some browser modes.
  }
}

// ======================================================
// API HELPER
// ======================================================

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

// ======================================================
// RAZORPAY LOADER
// ======================================================

let razorpayScriptPromise;

function loadRazorpay() {
  if (window.Razorpay) {
    return Promise.resolve();
  }

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise(
      (resolve, reject) => {
        const script =
          document.createElement("script");

        script.src =
          "https://checkout.razorpay.com/v1/checkout.js";

        script.async = true;
        script.onload = resolve;

        script.onerror = () =>
          reject(
            new Error("Payment gateway could not load.")
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

// ======================================================
// MAIN KIOSK COMPONENT
// ======================================================

export function KioskPage() {
  // ----------------------------------------------------
  // RESTORE PREVIOUS ORDER IMMEDIATELY
  // ----------------------------------------------------

  const [restoredOrder] = useState(
    readSavedKioskOrder
  );

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

  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  // menu | checkout | status
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

  const [paymentSeconds, setPaymentSeconds] =
    useState(() => {
      if (!restoredOrder) return 60;

      const elapsed =
        Date.now() - restoredOrder.createdAtMs;

      return Math.max(
        0,
        Math.ceil(
          (PAYMENT_TIMEOUT_MS - elapsed) / 1000
        )
      );
    });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const lock = useRef(false);

  const activeOrderRef = useRef(restoredOrder);

  const gatewayRef = useRef(null);

  const timeoutCheckingRef = useRef(false);

  const lastTimeoutAttemptRef = useRef(0);

  // ====================================================
  // SAVE ORDER WHEN IT CHANGES
  // ====================================================

  useEffect(() => {
    activeOrderRef.current = activeOrder;

    if (screen === "status" && activeOrder) {
      saveKioskOrder(activeOrder);
    }
  }, [screen, activeOrder]);

  // ====================================================
  // SAVE ORDER BEFORE REFRESH / TAB CLOSE
  // ====================================================

  useEffect(() => {
    function preserveOrder() {
      if (activeOrderRef.current) {
        saveKioskOrder(
          activeOrderRef.current
        );
      }
    }

    window.addEventListener(
      "pagehide",
      preserveOrder
    );

    return () => {
      window.removeEventListener(
        "pagehide",
        preserveOrder
      );
    };
  }, []);

  // ====================================================
  // LOAD FRANCHISES
  // ====================================================

  useEffect(() => {
    let mounted = true;

    api("/franchise/public")
      .then((data) => {
        if (!mounted) return;

        const items = data.franchises || [];

        setFranchises(items);

        setFranchiseId((current) =>
          current || items[0]?._id || ""
        );
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message);
        }
      });

    api("/kiosk/config")
      .then((data) => {
        if (!mounted) return;

        const enabled = Boolean(
          data.onlineEnabled
        );

        setOnlineEnabled(enabled);

        if (!activeOrderRef.current) {
          setMethod(
            enabled
              ? "Online (Razorpay)"
              : "Counter Cash"
          );
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  // ====================================================
  // LOAD MENU
  // ====================================================

  useEffect(() => {
    let mounted = true;

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
        if (mounted) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [franchiseId]);

  // ====================================================
  // MENU FILTERING
  // ====================================================

  const categories = useMemo(() => {
    return [
      "All",
      ...new Set(
        menu
          .map((item) => item.category)
          .filter(Boolean)
      ),
    ];
  }, [menu]);

  const visible = useMemo(() => {
    return menu.filter((item) => {
      const matchesCategory =
        category === "All" ||
        item.category === category;

      const matchesSearch =
        `${item.name} ${item.category || ""}`
          .toLowerCase()
          .includes(
            search.toLowerCase().trim()
          );

      return (
        matchesCategory &&
        matchesSearch
      );
    });
  }, [menu, category, search]);

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

  const heroImage =
    menu.find((item) => item.image)?.image;

  const currentFranchise = franchises.find(
    (item) => item._id === franchiseId
  );

  // ====================================================
  // CART QUANTITY
  // + INCREASES BY EXACTLY 1
  // ====================================================

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

  // ====================================================
  // RESET KIOSK
  // CALLED AFTER VERIFIED ADMIN CONFIRMATION
  // OR AN UNPAID TIMEOUT
  // ====================================================

  const reset = useCallback(() => {
    // Clear storage immediately to avoid
    // restoring the previous customer's order.
    saveKioskOrder(null);

    activeOrderRef.current = null;

    lock.current = false;

    try {
      gatewayRef.current?.close?.();
    } catch {
      // Ignore close errors.
    }

    gatewayRef.current = null;

    setBusy(false);
    setCart([]);
    setCartOpen(false);

    setCategory("All");
    setSearch("");

    setActiveOrder(null);
    setSeatChoice(null);

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

  // ====================================================
  // REFRESH ORDER FROM BACKEND
  // ====================================================

  const refreshOrder = useCallback(
    async (trackingCode) => {
      const response = await api(
        `/kiosk/track/${encodeURIComponent(
          trackingCode
        )}`
      );

      const serverOrder = response.order;

      if (!serverOrder) {
        throw new Error(
          "Order tracking response is empty."
        );
      }

      // Merge response with the locally stored
      // order so _id and orderKey are preserved.
      setActiveOrder((current) => {
        if (
          !current ||
          current.order.trackingCode !==
            trackingCode
        ) {
          return current;
        }

        const updated = {
          ...current,
          order: {
            ...current.order,
            ...serverOrder,
          },
        };

        activeOrderRef.current = updated;
        saveKioskOrder(updated);

        return updated;
      });

      return serverOrder;
    },
    []
  );

  // ====================================================
  // LOAD AVAILABLE SEATS
  // CUSTOMER ONLY, AFTER PAYMENT
  // ====================================================

  const loadSeats = useCallback(
    async (order, orderKey) => {
      const response = await api(
        `/kiosk/orders/${order._id}/seats`,
        {
          headers: {
            "x-kiosk-order-key":
              orderKey,
          },
        }
      );

      setSeats({
        capacity: Number(
          response.capacity || 0
        ),
        available:
          response.available || [],
        occupied:
          response.occupied || [],
      });

      setSeatChoice((current) =>
        response.available?.includes(
          current
        )
          ? current
          : null
      );
    },
    []
  );

  // ====================================================
  // RESTORE ORDER AND POLL SERVER
  // NEVER RESET JUST BECAUSE PAGE WAS REFRESHED
  // ====================================================

  useEffect(() => {
    if (
      screen !== "status" ||
      !activeOrder?.order?.trackingCode
    ) {
      return;
    }

    const code =
      activeOrder.order.trackingCode;

    let mounted = true;

    const sync = async () => {
      try {
        await refreshOrder(code);

        if (mounted) {
          setError("");
        }
      } catch {
        // Keep the customer on the current
        // order screen during network errors.
        // Do not redirect them to the menu.
      }
    };

    sync();

    const interval = setInterval(
      sync,
      2500
    );

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [
    screen,
    activeOrder?.order?.trackingCode,
    refreshOrder,
  ]);

  // ====================================================
  // AVAILABLE SEATS REFRESH
  // ====================================================

  useEffect(() => {
    if (
      screen !== "status" ||
      !activeOrder ||
      !isPaid(activeOrder.order) ||
      hasSeat(activeOrder.order)
    ) {
      return;
    }

    let mounted = true;

    const updateSeats = async () => {
      try {
        await loadSeats(
          activeOrder.order,
          activeOrder.key
        );
      } catch (err) {
        if (mounted) {
          setError(err.message);
        }
      }
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

  // ====================================================
  // ADMIN CONFIRMATION
  // ONLY RETURN TO MENU AFTER:
  // 1. PAYMENT VERIFIED
  // 2. CUSTOMER SEAT SELECTED
  // 3. ADMIN CONFIRMED THE ORDER
  // ====================================================

  useEffect(() => {
    if (screen !== "status") return;

    const order = activeOrder?.order;

    if (!order) return;

    if (order.status === "Cancelled") {
      reset();
      return;
    }

    const adminConfirmed =
      ADMIN_CONFIRMED_STATUSES.includes(
        order.status
      );

    if (
      adminConfirmed &&
      isPaid(order) &&
      hasSeat(order)
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

  // ====================================================
  // CHECK 60-SECOND PAYMENT TIMEOUT
  // ====================================================

  const checkPaymentTimeout = useCallback(
    async () => {
      const current =
        activeOrderRef.current;

      if (
        !current ||
        isPaid(current.order) ||
        timeoutCheckingRef.current
      ) {
        return;
      }

      // Avoid repeated network requests
      // every second at zero.
      if (
        Date.now() -
          lastTimeoutAttemptRef.current <
        8000
      ) {
        return;
      }

      timeoutCheckingRef.current = true;
      lastTimeoutAttemptRef.current = Date.now();

      const code =
        current.order.trackingCode;

      try {
        const result = await api(
          `/kiosk/track/${encodeURIComponent(
            code
          )}`
        );

        const currentOrder =
          activeOrderRef.current;

        if (
          !currentOrder ||
          currentOrder.order.trackingCode !==
            code
        ) {
          return;
        }

        if (
          isPaid(result.order) ||
          isPaid(currentOrder.order)
        ) {
          const updated = {
            ...currentOrder,
            order: {
              ...currentOrder.order,
              ...result.order,
              paymentStatus: "Paid",
            },
          };

          activeOrderRef.current = updated;

          setActiveOrder(updated);
          saveKioskOrder(updated);

          return;
        }

        // Payment is still not verified
        // after 60 seconds.
        reset();
      } catch {
        // Server may be temporarily offline.
        // Keep order on screen rather than
        // accidentally losing a paid order.
        setError(
          "Unable to verify payment status. The order will stay here until the server responds."
        );
      } finally {
        timeoutCheckingRef.current = false;
      }
    },
    [reset]
  );

  // ====================================================
  // PAYMENT COUNTDOWN
  // TIMER SURVIVES BROWSER REFRESH
  // ====================================================

  useEffect(() => {
    if (
      screen !== "status" ||
      !activeOrder ||
      isPaid(activeOrder.order)
    ) {
      return;
    }

    const deadline =
      activeOrder.createdAtMs +
      PAYMENT_TIMEOUT_MS;

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

    return () =>
      clearInterval(interval);
  }, [
    screen,
    activeOrder?.order?._id,
    activeOrder?.createdAtMs,
    activeOrder?.order?.paymentStatus,
    checkPaymentTimeout,
  ]);

  // ====================================================
  // RAZORPAY ONLINE PAYMENT
  // ====================================================

  async function payOnline(order, orderKey) {
    await loadRazorpay();

    const payment = await api(
      `/kiosk/orders/${order._id}/pay`,
      {
        method: "POST",
        headers: {
          "x-kiosk-order-key":
            orderKey,
        },
      }
    );

    return new Promise(
      (resolve, reject) => {
        let settled = false;

        const failOnce = (message) => {
          if (settled) return;

          settled = true;

          reject(
            new Error(message)
          );
        };

        const checkout =
          new window.Razorpay({
            key: payment.keyId,

            amount: payment.amount,

            currency:
              payment.currency,

            name: "OfficeBite",

            description:
              `Order ${order.orderNumber}`,

            order_id:
              payment.gatewayOrderId,

            theme: {
              color: COLORS.forest,
            },

            handler: async (
              details
            ) => {
              if (settled) return;

              settled = true;

              try {
                const verified = await api(
                  `/kiosk/orders/${order._id}/verify`,
                  {
                    method: "POST",

                    headers: {
                      "x-kiosk-order-key":
                        orderKey,
                    },

                    body: JSON.stringify(
                      details
                    ),
                  }
                );

                const current =
                  activeOrderRef.current;

                if (
                  current?.order?._id ===
                  order._id
                ) {
                  const updated = {
                    ...current,
                    order: {
                      ...current.order,
                      ...verified.order,
                    },
                  };

                  activeOrderRef.current =
                    updated;

                  setActiveOrder(updated);

                  saveKioskOrder(updated);
                }

                resolve(
                  verified.order
                );
              } catch (err) {
                reject(err);
              }
            },

            modal: {
              ondismiss: () =>
                failOnce(
                  "Payment window closed. Check payment status before retrying."
                ),
            },
          });

        checkout.on(
          "payment.failed",
          (event) => {
            failOnce(
              event.error?.description ||
                "Payment failed."
            );
          }
        );

        gatewayRef.current =
          checkout;

        checkout.open();
      }
    );
  }

  // ====================================================
  // CREATE ORDER
  // ====================================================

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

    let createdOrder = null;

    try {
      const result = await api(
        "/kiosk/orders",
        {
          method: "POST",

          body: JSON.stringify({
            franchiseId,

            paymentMethod: method,

            items: cart.map(
              (item) => ({
                menuItemId:
                  item.id,

                quantity:
                  item.quantity,
              })
            ),
          }),
        }
      );

      createdOrder = result.order;

      const fresh = {
        order: result.order,
        key: result.orderKey,
        method,
        franchiseId,
        createdAtMs: Date.now(),
      };

      // Save immediately, before starting
      // online payment or another async task.
      activeOrderRef.current =
        fresh;

      saveKioskOrder(fresh);

      setActiveOrder(fresh);

      setCart([]);
      setCartOpen(false);

      setPaymentSeconds(60);
      setScreen("status");

      // Online payment.
      if (
        method ===
        "Online (Razorpay)"
      ) {
        try {
          await payOnline(
            result.order,
            result.orderKey
          );
        } catch (err) {
          const current =
            activeOrderRef.current;

          if (
            current?.order?._id ===
            result.order._id
          ) {
            setError(err.message);
          }
        }

        // Recheck server payment state.
        const current =
          activeOrderRef.current;

        if (
          current?.order?._id ===
          result.order._id
        ) {
          await refreshOrder(
            result.order.trackingCode
          ).catch(() => {});
        }
      }
    } catch (err) {
      if (!createdOrder) {
        setError(
          err.message ||
          "Unable to place order."
        );
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  // ====================================================
  // RETRY ONLINE PAYMENT
  // ====================================================

  async function retryPayment() {
    const current =
      activeOrderRef.current;

    if (
      !current ||
      lock.current ||
      paymentSeconds === 0
    ) {
      return;
    }

    lock.current = true;

    setBusy(true);
    setError("");

    try {
      const latest = await refreshOrder(
        current.order.trackingCode
      );

      if (!isPaid(latest)) {
        await payOnline(
          current.order,
          current.key
        );
      }

      await refreshOrder(
        current.order.trackingCode
      );
    } catch (err) {
      setError(err.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  // ====================================================
  // CUSTOMER SELECTS SEAT
  // ADMIN CANNOT SELECT IT
  // ====================================================

  async function confirmSeat() {
    const current =
      activeOrderRef.current;

    if (
      !current ||
      !isPaid(current.order) ||
      hasSeat(current.order) ||
      !seats.available.includes(seatChoice) ||
      lock.current
    ) {
      return;
    }

    lock.current = true;

    setBusy(true);
    setError("");

    try {
      const response = await api(
        `/kiosk/orders/${current.order._id}/seat`,
        {
          method: "POST",

          headers: {
            "x-kiosk-order-key":
              current.key,
          },

          body: JSON.stringify({
            seatNumber:
              seatChoice,
          }),
        }
      );

      const latest =
        activeOrderRef.current;

      if (
        latest?.order?._id !==
        current.order._id
      ) {
        return;
      }

      const updated = {
        ...latest,
        order: {
          ...latest.order,
          ...response.order,
        },
      };

      activeOrderRef.current =
        updated;

      setActiveOrder(updated);

      saveKioskOrder(updated);
    } catch (err) {
      setError(err.message);

      await loadSeats(
        current.order,
        current.key
      ).catch(() => {});
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  // ====================================================
  // PAYMENT METHODS
  // ====================================================

  const paymentMethods = [
    ...(onlineEnabled
      ? [
          {
            value:
              "Online (Razorpay)",

            label:
              "Pay online",

            description:
              "UPI, cards and net banking",

            icon:
              CreditCard,
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
      label: "UPI at counter",
      description:
        "Scan and pay at the counter",
      icon: CreditCard,
    },
  ];

  // ====================================================
  // CURRENT ORDER STATE
  // ====================================================

  const currentOrder =
    activeOrder?.order || null;

  const paymentComplete =
    isPaid(currentOrder);

  const seatConfirmed =
    hasSeat(currentOrder);

  const progressStep =
    screen === "menu"
      ? 0
      : screen === "checkout" ||
        !paymentComplete
      ? 1
      : seatConfirmed
      ? 3
      : 2;

  // ====================================================
  // COMPLETE KIOSK UI
  // ====================================================

  return (
    <div className="cafe-kiosk">
      {/* CSS INSIDE JSX */}

      <style>{KIOSK_STYLES}</style>

      {/* ======================================
          HEADER
      ====================================== */}

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

      <div className="cafe-container">
        {/* ====================================
            PROGRESS
        ==================================== */}

        <nav
          className="cafe-progress"
          aria-label="Order progress"
        >
          {[
            "Choose food",
            "Payment",
            "Pick your seat",
            "Admin confirms",
          ].map((name, index) => (
            <div
              key={name}
              className={
                index <= progressStep
                  ? "active"
                  : ""
              }
            >
              <span>
                {index < progressStep ? (
                  <Check size={14} />
                ) : (
                  index + 1
                )}
              </span>

              {name}
            </div>
          ))}
        </nav>

        {/* ====================================
            ERROR
        ==================================== */}

        {error && (
          <div
            className="cafe-error"
            role="alert"
          >
            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              aria-label="Dismiss error"
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
                  ✦ FRESHLY PREPARED,
                  JUST FOR YOU
                </p>

                <h1>
                  Every bite,
                  <br />

                  <em>
                    a little delight.
                  </em>
                </h1>

                <p>
                  Discover everyday
                  favourites, pay your way
                  and choose the perfect
                  seat. Enjoy your break!
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
                  <strong>
                    FRESH!
                  </strong>
                </div>
              </div>
            </section>

            {/* MENU CONTENT */}

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
                  {visible.length}
                  {" "}
                  dishes
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

                      setCart([]);
                      setCategory("All");
                      setSearch("");
                    }}
                    aria-label="Select cafeteria"
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
                    aria-label="Search food"
                  />
                </label>
              </div>

              {/* CATEGORIES */}

              <div className="cafe-categories">
                {categories.map((cat) => (
                  <button
                    type="button"
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

              {/* FOOD GRID */}

              {loading ? (
                <div className="cafe-empty">
                  <RefreshCw
                    className="cafe-spin"
                    size={20}
                  />

                  <p>
                    Loading menu...
                  </p>
                </div>
              ) : visible.length === 0 ? (
                <div className="cafe-empty">
                  No items found.
                  Try another category.
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
                            <h3>
                              {food.name}
                            </h3>

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
                          </p>

                          <div className="cafe-food-bottom">
                            <strong>
                              {fmt(food.price)}
                            </strong>

                            {qty > 0 ? (
                              <div className="cafe-qty">
                                <button
                                  type="button"
                                  onClick={() =>
                                    changeQty(
                                      food,
                                      -1
                                    )
                                  }
                                  aria-label="Decrease quantity"
                                >
                                  <Minus
                                    size={16}
                                  />
                                </button>

                                <b>{qty}</b>

                                <button
                                  type="button"
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
                                  <Plus
                                    size={16}
                                  />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
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
                type="button"
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

              <div className="cafe-hint">
                <ShieldCheck size={18} />

                You can select your own
                available seat after payment.
              </div>

              <button
                type="button"
                className="cafe-primary cafe-full"
                disabled={
                  busy ||
                  quantity === 0
                }
                onClick={placeOrder}
              >
                {busy
                  ? "Processing..."
                  : `Place order · ${fmt(total)}`}

                <ChevronRight size={19} />
              </button>
            </section>

            {/* ORDER SUMMARY */}

            <aside className="cafe-panel cafe-summary">
              <p className="cafe-kicker">
                YOUR BASKET
              </p>

              <h2>
                Order summary
              </h2>

              {cart.map((item) => (
                <div
                  className="cafe-summary-row"
                  key={item.id}
                >
                  <span>
                    {item.quantity}
                    {" × "}
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
                <span>
                  Tax
                </span>

                <b>
                  ₹0.00
                </b>
              </div>

              <div className="cafe-summary-total">
                <span>
                  Total to pay
                </span>

                <strong>
                  {fmt(total)}
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
            STATUS SCREEN
            PERSISTS AFTER REFRESH
        ==================================== */}

        {screen === "status" &&
          activeOrder && (
            <main className="cafe-status">
              <section className="cafe-panel cafe-status-panel">
                <div
                  className={`cafe-status-icon ${
                    paymentComplete
                      ? "paid"
                      : ""
                  }`}
                >
                  {seatConfirmed ? (
                    <CheckCircle2 size={35} />
                  ) : paymentComplete ? (
                    <Armchair size={35} />
                  ) : (
                    <Clock3 size={35} />
                  )}
                </div>

                <p className="cafe-kicker">
                  {seatConfirmed
                    ? "WAITING FOR ADMIN"
                    : paymentComplete
                    ? "PAYMENT CONFIRMED"
                    : "PAYMENT PENDING"}
                </p>

                <h1>
                  {seatConfirmed
                    ? "Seat saved. Almost ready!"
                    : paymentComplete
                    ? "Choose your seat"
                    : "Complete your payment"}
                </h1>

                <p className="cafe-subtitle">
                  {seatConfirmed
                    ? "Your seat is saved. The menu will open automatically after admin confirmation."
                    : paymentComplete
                    ? "Select an available seat. Refreshing this page will keep you here until your seat is confirmed."
                    : "Complete payment within one minute to continue to seat selection."}
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
                      paymentComplete
                        ? "cafe-paid"
                        : "cafe-pending"
                    }
                  >
                    {paymentComplete
                      ? "✓ Paid"
                      : "⏳ Payment pending"}
                  </span>
                </div>

                {/* PAYMENT TIMER */}

                {!paymentComplete && (
                  <div
                    className="cafe-deadline"
                    role="status"
                  >
                    <div>
                      <Clock3 size={19} />
                      Time left to pay
                    </div>

                    <strong>
                      {`00:${String(
                        paymentSeconds
                      ).padStart(2, "0")}`}
                    </strong>

                    <div className="cafe-deadline-track">
                      <span
                        style={{
                          width: `${
                            (paymentSeconds / 60) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {!paymentComplete && (
                  <div className="cafe-hint">
                    <ShieldCheck size={19} />

                    {activeOrder.method ===
                    "Online (Razorpay)"
                      ? "Please complete your secure online payment."
                      : "Please pay at the counter. Admin will verify your payment."}
                  </div>
                )}

                {!paymentComplete &&
                  activeOrder.method ===
                    "Online (Razorpay)" && (
                    <button
                      type="button"
                      className="cafe-secondary cafe-full"
                      onClick={retryPayment}
                      disabled={
                        busy ||
                        paymentSeconds === 0
                      }
                    >
                      <RefreshCw size={17} />
                      Retry online payment
                    </button>
                  )}

                {/* =================================
                    CUSTOMER SEAT SELECTION
                ================================= */}

                {paymentComplete &&
                  !seatConfirmed && (
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
                              type="button"
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

                      {seats.capacity === 0 && (
                        <p className="cafe-subtitle">
                          Checking available
                          seats...
                        </p>
                      )}

                      {seats.capacity > 0 &&
                        seats.available.length ===
                          0 && (
                          <p className="cafe-subtitle">
                            All seats are occupied.
                            Please contact staff.
                          </p>
                        )}

                      <div className="cafe-seat-actions">
                        <button
                          type="button"
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
                          type="button"
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

                {/* =================================
                    WAITING FOR ADMIN
                ================================= */}

                {seatConfirmed && (
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
                      Refreshing this page
                      will not return you
                      to the menu.
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
          FLOATING CART
      ==================================== */}

      {screen === "menu" &&
        quantity > 0 &&
        !cartOpen && (
          <button
            type="button"
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
              type="button"
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
                  type="button"
                  onClick={() =>
                    setCartOpen(false)
                  }
                  aria-label="Close cart"
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
                            type="button"
                            onClick={() =>
                              changeQty(
                                {
                                  _id:
                                    item.id,
                                },
                                -1
                              )
                            }
                            aria-label="Decrease quantity"
                          >
                            <Minus size={15} />
                          </button>

                          <b>
                            {item.quantity}
                          </b>

                          <button
                            type="button"
                            disabled={
                              item.quantity >=
                              50
                            }
                            onClick={() =>
                              changeQty(
                                {
                                  _id:
                                    item.id,
                                },
                                1
                              )
                            }
                            aria-label="Increase quantity"
                          >
                            <Plus size={15} />
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

              <div className="cafe-drawer-bottom">
                <div>
                  <span>
                    Tax
                  </span>

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
                  type="button"
                  className="cafe-primary cafe-full"
                  disabled={
                    quantity === 0 ||
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
      </footer>
    </div>
  );
}

export default KioskPage;
