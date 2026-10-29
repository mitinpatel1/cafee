
import React, {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  MapPin,
  Banknote,
  ArrowLeft,
  AlertCircle,
  Smartphone,
  CreditCard,
} from "lucide-react";

import { useCart } from "../../context/CartContext";
import { useFranchiseSelection } from "../../context/FranchiseSelectionContext";
import { api } from "../../api/api";

// ============================================
// LOAD RAZORPAY CHECKOUT
// ============================================

const loadRazorpay = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) {
      return resolve();
    }

    const script = document.createElement("script");

    script.src =
      "https://checkout.razorpay.com/v1/checkout.js";

    script.onload = resolve;

    script.onerror = () =>
      reject(
        new Error(
          "Could not load secure payment checkout."
        )
      );

    document.head.appendChild(script);
  });

// ============================================
// CHECKOUT PAGE
// ============================================

export const CheckoutPage = () => {
  const {
    cartItems,
    subtotal,
    tax,
    total,
    clearCart,
  } = useCart();

  const {
    franchises,
    selectedId,
  } = useFranchiseSelection();

  const navigate = useNavigate();

  const [method, setMethod] = useState(
    "Counter Cash"
  );

  const [onlineEnabled, setOnlineEnabled] =
    useState(false);

  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ==========================================
  // CHECK ONLINE PAYMENT AVAILABILITY
  // ==========================================

  useEffect(() => {
    api
      .getPaymentConfig()
      .then((result) => {
        const enabled = Boolean(
          result.onlineEnabled
        );

        setOnlineEnabled(enabled);

        if (enabled) {
          setMethod((current) =>
            current === "Counter Cash"
              ? "Online (Razorpay)"
              : current
          );
        }
      })
      .catch(() => setOnlineEnabled(false));
  }, []);

  // ==========================================
  // PLACE ORDER AND PAY
  // ==========================================

  const submit = async (event) => {
    event.preventDefault();

    if (loading) return;

    if (!selectedId) {
      setError("Please select a franchise.");
      return;
    }

    if (!cartItems.length) {
      setError("Your cart is empty.");
      return;
    }

    setLoading(true);
    setError("");

    let createdOrder;

    try {
      const response = await api.createOrder({
        franchiseId: selectedId,
        notes,
        paymentMethod: method,
        items: cartItems.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          instructions:
            item.instructions || "",
        })),
      });

      createdOrder = response.order;

      // ======================================
      // ONLINE RAZORPAY PAYMENT
      // ======================================

      if (method === "Online (Razorpay)") {
        await loadRazorpay();

        const checkout = await api.initiatePayment(
          createdOrder._id,
          method
        );

        await new Promise((resolve, reject) => {
          const gateway = new window.Razorpay({
            key: checkout.keyId,
            amount: checkout.amount,
            currency: "INR",

            name: "OfficeBite",

            description:
              `Order ${createdOrder.orderNumber}`,

            order_id: checkout.gatewayOrderId,

            prefill: {
              name: checkout.name,
            },

            handler: async (details) => {
              try {
                await api.verifyPayment(
                  createdOrder._id,
                  details.razorpay_payment_id,
                  details.razorpay_order_id,
                  details.razorpay_signature
                );

                resolve();
              } catch (err) {
                reject(err);
              }
            },

            modal: {
              ondismiss: () => {
                reject(
                  new Error(
                    "Payment window closed. Order is awaiting payment."
                  )
                );
              },
            },
          });

          gateway.on(
            "payment.failed",
            (response) => {
              reject(
                new Error(
                  response.error?.description ||
                    "Payment unsuccessful."
                )
              );
            }
          );

          gateway.open();
        });
      }

      // Counter payments remain Pending.
      // Online payment is verified above.

      clearCart();

      navigate(
        `/track/${createdOrder._id}`
      );
    } catch (err) {
      const savedMessage = createdOrder
        ? ` Order #${createdOrder.orderNumber} was created and may still be awaiting payment.`
        : "";

      setError(
        `${err.message}${savedMessage}`
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // EMPTY CART
  // ==========================================

  if (!cartItems.length) {
    return (
      <div className="portal-auth-wrap">
        <div className="portal-auth-card">
          <h2>Your cart is empty</h2>

          <Link
            to="/menu"
            className="ob-btn"
          >
            Browse Menu
          </Link>
        </div>
      </div>
    );
  }

  // ==========================================
  // CHECKOUT UI
  // ==========================================

  return (
    <div className="portal-checkout ob-wrap">

      <Link
        to="/cart"
        className="portal-back"
      >
        <ArrowLeft size={15} />
        Back to cart
      </Link>

      <h1>One last step.</h1>

      <p>
        Choose your franchise and complete payment.
        The service team will accept your order
        after payment confirmation.
      </p>

      {error && (
        <div className="portal-error" role="alert">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="portal-checkout-grid">
        <form
          onSubmit={submit}
          className="portal-checkout-form"
        >

          {/* FRANCHISE */}
          <label>
            <MapPin size={18} />
            Pickup Franchise

            <select
              required
              value={selectedId}
              disabled
            >
              <option value="">
                Choose kitchen
              </option>

              {franchises.map((franchise) => (
                <option
                  key={franchise._id}
                  value={franchise._id}
                >
                  {franchise.name} — {franchise.city}
                </option>
              ))}
            </select>

            <small>
              Change franchise from the Menu page.
              Existing cart items may be cleared.
            </small>
          </label>

          {/* NOTES */}
          <label>
            Special Instructions

            <textarea
              rows={3}
              maxLength={500}
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              placeholder="Anything the kitchen should know?"
            />
          </label>

          {/* PAYMENT OPTIONS */}
          <fieldset className="payment-choice">
            <legend>Choose Payment Method</legend>

            {/* CASH */}
            <label
              className={
                method === "Counter Cash"
                  ? "chosen"
                  : ""
              }
            >
              <input
                type="radio"
                name="paymentMethod"
                checked={
                  method === "Counter Cash"
                }
                onChange={() =>
                  setMethod("Counter Cash")
                }
              />

              <Banknote size={22} />

              <span>
                <b>Cash at Counter</b>
                <small>
                  Pay first. Staff confirms receipt
                  before accepting the order.
                </small>
              </span>
            </label>

            {/* UPI */}
            <label
              className={
                method === "Counter UPI"
                  ? "chosen"
                  : ""
              }
            >
              <input
                type="radio"
                name="paymentMethod"
                checked={
                  method === "Counter UPI"
                }
                onChange={() =>
                  setMethod("Counter UPI")
                }
              />

              <Smartphone size={22} />

              <span>
                <b>UPI at Counter</b>
                <small>
                  Pay via QR. Staff verifies UPI
                  receipt before accepting.
                </small>
              </span>
            </label>

            {/* RAZORPAY */}
            <label
              className={
                method === "Online (Razorpay)"
                  ? "chosen"
                  : ""
              }
            >
              <input
                type="radio"
                name="paymentMethod"
                disabled={!onlineEnabled}
                checked={
                  method === "Online (Razorpay)"
                }
                onChange={() =>
                  setMethod("Online (Razorpay)")
                }
              />

              <CreditCard size={22} />

              <span>
                <b>Pay Online Securely</b>

                <small>
                  {onlineEnabled
                    ? "Recommended. Payment verified automatically."
                    : "Available after Razorpay setup."}
                </small>
              </span>
            </label>
          </fieldset>

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={
              loading || !selectedId
            }
            className="btn btn-primary"
          >
            {loading
              ? "Processing..."
              : method === "Online (Razorpay)"
                ? "Pay Now · Place Order"
                : "Create Payment-Pending Order"}
          </button>
        </form>

        {/* ORDER SUMMARY */}
        <aside className="portal-order-summary">
          <h2>Your Order</h2>

          {cartItems.map((item, index) => (
            <div
              key={item.menuItemId || index}
              className="sum-line"
            >
              <span>
                {item.quantity} × {item.name}
              </span>

              <b>
                ₹{item.price * item.quantity}
              </b>
            </div>
          ))}

          <hr />

          <div className="sum-line">
            <span>Subtotal</span>
            <b>₹{subtotal}</b>
          </div>

          <div className="sum-line">
            <span>Tax</span>
            <b>₹{tax}</b>
          </div>

          <div className="sum-line sum-total">
            <span>Total</span>
            <b>₹{total}</b>
          </div>

          <p className="ob-inline-hint">
            Payment and preparation status will
            update on the tracking page.
          </p>
        </aside>
      </div>
    </div>
  );
};
