
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

let checkoutScriptPromise;

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();

  if (!checkoutScriptPromise) {
    checkoutScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = resolve;
      script.onerror = () =>
        reject(new Error("Payment gateway could not load."));
      document.head.appendChild(script);
    }).catch((error) => {
      checkoutScriptPromise = null;
      throw error;
    });
  }

  return checkoutScriptPromise;
}

async function payOnline(order) {
  await loadRazorpay();

  const setup = await api.initiatePayment(
    order._id,
    "Online (Razorpay)"
  );

  return new Promise((resolve, reject) => {
    let finished = false;

    const fail = (error) => {
      if (!finished) {
        finished = true;
        reject(error);
      }
    };

    const razorpay = new window.Razorpay({
      key: setup.keyId,
      amount: setup.amount,
      currency: setup.currency,
      name: "Office Cafeteria",
      description: `Order #${order.orderNumber}`,
      order_id: setup.gatewayOrderId,
      prefill: {
        name: setup.name || "",
      },
      theme: {
        color: "#ff7900",
      },
      retry: {
        enabled: true,
      },
      handler: async (details) => {
        if (finished) return;
        finished = true;

        try {
          await api.verifyPayment(
            order._id,
            details.razorpay_payment_id,
            details.razorpay_order_id,
            details.razorpay_signature
          );

          resolve();
        } catch (error) {
          const status = await api
            .getPaymentStatus(order._id)
            .catch(() => null);

          if (status?.paymentStatus === "Paid") {
            resolve();
          } else {
            reject(
              new Error(
                "Payment submitted, but confirmation is pending. Check your order status before retrying."
              )
            );
          }
        }
      },
      modal: {
        ondismiss: () =>
          fail(
            new Error(
              "Payment window closed. Your order is saved but unpaid."
            )
          ),
      },
    });

    razorpay.open();
  });
}

export const CheckoutPage = () => {
  const {
    cartItems,
    subtotal,
    tax,
    total,
    clearCart,
  } = useCart();

  const { franchises, selectedId } =
    useFranchiseSelection();

  const navigate = useNavigate();

  const [method, setMethod] = useState("Counter Cash");
  const [onlineEnabled, setOnlineEnabled] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingOrder, setPendingOrder] = useState(null);

  useEffect(() => {
    api
      .getPaymentConfig()
      .then((result) =>
        setOnlineEnabled(Boolean(result.onlineEnabled))
      )
      .catch(() => setOnlineEnabled(false));
  }, []);

  const submit = async (event) => {
    event.preventDefault();

    if (loading || !selectedId) return;

    setLoading(true);
    setError("");

    let order = pendingOrder;

    try {
      if (!order) {
        const response = await api.createOrder({
          franchiseId: selectedId,
          notes,
          paymentMethod: method,
          items: cartItems.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            instructions: item.instructions || "",
          })),
        });

        order = response.order;

        if (method === "Online (Razorpay)") {
          setPendingOrder(order);
        }
      }

      if (order.paymentMethod === "Online (Razorpay)") {
        await payOnline(order);
      }

      clearCart();
      navigate(`/track/${order._id}`);
    } catch (err) {
      setError(err.message || "Checkout failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!cartItems.length) {
    return (
      <div className="portal-auth-wrap">
        <div className="portal-auth-card">
          <h2>Your cart is empty</h2>
          <Link className="ob-btn" to="/menu">
            Browse Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-checkout ob-wrap">
      <Link to="/cart" className="portal-back">
        <ArrowLeft size={15} /> Back to cart
      </Link>

      <h1>Checkout</h1>
      <p>Choose your pickup kitchen and payment method.</p>

      {error && (
        <div className="portal-error" role="alert">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {pendingOrder && (
        <p className="ob-inline-hint">
          Order #{pendingOrder.orderNumber} is saved.{" "}
          <Link to={`/track/${pendingOrder._id}`}>
            View payment / order status
          </Link>{" "}
          before trying again. Do not create another order if money was deducted.
        </p>
      )}

      <div className="portal-checkout-grid">
        <form
          className="portal-checkout-form"
          onSubmit={submit}
        >
          <label>
            <MapPin size={18} /> Pickup franchise

            <select required value={selectedId} disabled>
              <option value="">Choose kitchen</option>
              {franchises.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.name} — {f.city}
                </option>
              ))}
            </select>
          </label>

          <label>
            Special instructions (optional)

            <textarea
              rows={3}
              maxLength={500}
              disabled={Boolean(pendingOrder)}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything the kitchen should know?"
            />
          </label>

          <fieldset
            className="payment-choice"
            disabled={Boolean(pendingOrder)}
          >
            <legend>Choose payment method</legend>

            <label
              className={
                method === "Counter Cash" ? "chosen" : ""
              }
            >
              <input
                type="radio"
                name="paymentMethod"
                checked={method === "Counter Cash"}
                onChange={() =>
                  setMethod("Counter Cash")
                }
              />
              <Banknote size={22} />

              <span>
                <b>Cash at counter</b>
                <small>Pay at pickup counter</small>
              </span>
            </label>

            <label
              className={
                method === "Counter UPI" ? "chosen" : ""
              }
            >
              <input
                type="radio"
                name="paymentMethod"
                checked={method === "Counter UPI"}
                onChange={() =>
                  setMethod("Counter UPI")
                }
              />
              <Smartphone size={22} />

              <span>
                <b>UPI at counter</b>
                <small>Scan the counter QR code</small>
              </span>
            </label>

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
                checked={method === "Online (Razorpay)"}
                onChange={() =>
                  setMethod("Online (Razorpay)")
                }
              />

              <CreditCard size={22} />

              <span>
                <b>Pay online with Razorpay</b>
                <small>
                  {onlineEnabled
                    ? "UPI, cards and net banking (where enabled)"
                    : "Configure Razorpay keys to enable"}
                </small>
              </span>
            </label>
          </fieldset>

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading || !selectedId}
          >
            {loading
              ? "Processing…"
              : pendingOrder
              ? "Retry payment for this order"
              : method === "Online (Razorpay)"
              ? `Pay ₹${total} securely`
              : "Place order · Pay at counter"}
          </button>
        </form>

        <aside className="portal-order-summary">
          <h2>Your order</h2>

          {cartItems.map((item, index) => (
            <div
              className="sum-line"
              key={item.menuItemId || index}
            >
              <span>
                {item.quantity} × {item.name}
              </span>
              <b>₹{item.price * item.quantity}</b>
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
            Final payable total is calculated by the backend.
          </p>
        </aside>
      </div>
    </div>
  );
};
