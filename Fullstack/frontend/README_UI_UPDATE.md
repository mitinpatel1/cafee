# OfficeBite · Screenshot-inspired customer UI

This is the updated **frontend only**, based on the user's `Fullstack(1).zip`. It is meant to work with the existing OfficeBite backend — no routes, schemas or payment authorization have been replaced.

## Installation (Windows / PowerShell)

1. Backup your current `Fullstack/frontend` folder.
2. Extract this archive and replace the **frontend** folder in your existing `Fullstack` project (keep your working `Fullstack/backend`).
3. Backend terminal: `cd Fullstack/backend`, then `npm install` (if needed), then `npm run dev`.
4. Frontend terminal: `cd Fullstack/frontend`, then `npm install`, then `npm run dev`.
5. Open **http://localhost:5173/menu** or **http://localhost:5173/**.

> Backend `.env` (not included here) must have the appropriate `PORT=5600`, MongoDB URI, and a valid, private JWT secret. The frontend proxies `/api`, `/uploads` and `/socket.io` to `http://127.0.0.1:5600`. Do not add admin credentials or secrets to frontend source.

## What changed

- New reference-style customer layout: fixed cream sidebar with Office Cafeteria brand, Menu / My Orders / Order History / Cart / Profile links; sticky-feeling top search, cart count and account avatar/dropdown.
- Menu page: orange-accented image banner, category tabs, franchise picker, optional diet + sorting filters, responsive 4/3/2-column real menu cards, veg/non-veg marker, database price, availability, add-to-cart and quantity controls, GSAP reveal animations.
- Default `/` shows the menu. Original editorial home page remains available at `/discover`.
- Customer `/order-history` is backed by the original order API and shows completed / picked-up / cancelled orders. `/my-orders` shows active + past orders.
- Added proper Confirmed and Picked Up status presentation to existing order history.
- Admin and franchise pages/layouts, authentication, checkout, existing socket events, and backend APIs remain intact.

## Product photos

`public/menu-reference/*.webp` are **cropped from the reference screenshot provided by the user**. They are used *only* to enhance matching starter dishes when the record has its original generic starter seed photo. An image manually set by the franchise owner always takes priority. Other dishes still use their real MongoDB image URLs. No menu records or prices are manufactured in the frontend. Image rights for public deployment should be verified by the project owner.

## Availability and data integrity

- Menu loaded from `/api/menu`; franchise list loaded from `/api/franchise/public`.
- The backend should seed the 50 starter dishes (Breakfast 10, Lunch 15, Snacks 15, Beverages 10) into MongoDB; the UI never fabricates real database items.
- Adding items to cart is disabled until an active franchise is selected. Checkout, counter/UPI and optional Razorpay online verification remain on existing endpoints.
- If menu returns an error, the customer sees an error, not sample meals masquerading as inventory.
- Dessert tab matches the screenshot, but shows an empty state until the owner adds Desserts in MongoDB.

## Files edited/added

- `src/components/layout/CustomerLayout.jsx` (new)
- `src/components/ui/MenuCard.jsx` (updated)
- `src/pages/customer/MenuPage.jsx` (updated)
- `src/pages/customer/MyOrdersPage.jsx` (order status and history route support)
- `src/components/ui/OrderStatusBadge.jsx` (new statuses)
- `src/constants/menuPhotography.js` (new)
- `src/styles/customer-dashboard.css` (new, scoped to customer UI)
- `src/App.jsx` (new customer layout and paths)
- `public/menu-reference/` (reference picture crops)

## Verification limits

JavaScript/JSX parse and relative-import checks passed. Live Vite build could not be completed here because npm dependency download timed out; your local install and real backend/DB/payment flows have not been end-to-end tested by this assistant.
