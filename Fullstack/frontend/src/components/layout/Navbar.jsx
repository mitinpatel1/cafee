
import React, { useEffect, useState } from "react";

import {
  Link,
  NavLink,
  useNavigate,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";

import {
  Search,
  ShoppingBag,
  UserRound,
  LogOut,
  UtensilsCrossed,
  Menu as MenuIcon,
  X,
  ArrowUpRight,
} from "lucide-react";

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();

  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [q, setQ] = useState("");
  const [dropdown, setDropdown] = useState(false);
  const [drawer, setDrawer] = useState(false);

  const customer = ["user", "employee"].includes(user?.role);

  useEffect(() => {
    setDropdown(false);
    setDrawer(false);
  }, [pathname]);

  const submit = (e) => {
    e.preventDefault();

    if (q.trim()) {
      navigate(`/menu?search=${encodeURIComponent(q.trim())}`);
    }
  };

  const handleLogout = () => {
    logout();
    setDropdown(false);
    navigate("/login");
  };

  return (
    <header className="ob-top">
      <div className="ob-wrap ob-top-inner">

        <Link
          to="/"
          className="ob-logo"
          aria-label="OfficeBite home"
        >
          <span className="ob-logo-mark">
            <UtensilsCrossed size={19} />
          </span>

          <span>
            office<span className="brand-accent">bite.</span>
          </span>
        </Link>

        <nav className="ob-pill" aria-label="Customer navigation">
          <NavLink
            end
            to="/"
            className={({ isActive }) => isActive ? "on" : ""}
          >
            Home
          </NavLink>

          <NavLink
            to="/menu"
            className={({ isActive }) => isActive ? "on" : ""}
          >
            Explore Menu
          </NavLink>

          {customer && (
            <NavLink
              to="/my-orders"
              className={({ isActive }) => isActive ? "on" : ""}
            >
              My Orders
            </NavLink>
          )}
        </nav>

        <div className="ob-actions">

          <form
            className="ob-search"
            role="search"
            onSubmit={submit}
          >
            <Search size={16} />

            <input
              aria-label="Search food"
              placeholder="Search dishes"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </form>

          <Link
            className="ob-icon-btn"
            to="/cart"
            title="Cart"
            aria-label={`Cart with ${itemCount} items`}
          >
            <ShoppingBag size={19} />

            {itemCount > 0 && (
              <span className="ob-badge">
                {itemCount}
              </span>
            )}
          </Link>

          {isAuthenticated && customer ? (
            <div className="nav-account">

              <button
                type="button"
                className="nav-avatar"
                onClick={() => setDropdown(!dropdown)}
                aria-expanded={dropdown}
                aria-label="Account menu"
              >
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt=""
                    className="nav-avatar-img"
                  />
                ) : (
                  (user?.name || "U").slice(0, 1).toUpperCase()
                )}
              </button>

              {dropdown && (
                <div className="nav-dropdown">

                  <div className="nav-profile">
                    <b>{user.name}</b>
                    <small>{user.email}</small>
                  </div>

                  <Link
                    to="/profile"
                    onClick={() => setDropdown(false)}
                  >
                    <UserRound size={16} />
                    My Profile
                  </Link>

                  <Link
                    to="/my-orders"
                    onClick={() => setDropdown(false)}
                  >
                    <ShoppingBag size={16} />
                    My Orders
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>

                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="ob-text-link">
              Sign In
            </Link>
          )}

          <Link className="nav-primary" to="/menu">
            Order Now
            <ArrowUpRight size={17} />
          </Link>

          <button
            type="button"
            className="ob-menu-btn"
            onClick={() => setDrawer(!drawer)}
            aria-label={drawer ? "Close menu" : "Open menu"}
            aria-expanded={drawer}
          >
            {drawer ? <X size={22} /> : <MenuIcon size={22} />}
          </button>

        </div>
      </div>

      {drawer && (
        <nav
          className="ob-drawer"
          aria-label="Mobile customer navigation"
        >
          <Link to="/" onClick={() => setDrawer(false)}>
            Home
          </Link>

          <Link to="/menu" onClick={() => setDrawer(false)}>
            Explore Menu
          </Link>

          {customer ? (
            <>
              <Link
                to="/my-orders"
                onClick={() => setDrawer(false)}
              >
                My Orders
              </Link>

              <Link
                to="/profile"
                onClick={() => setDrawer(false)}
              >
                My Profile
              </Link>
            </>
          ) : (
            <Link
              to="/login"
              onClick={() => setDrawer(false)}
            >
              Customer Sign In
            </Link>
          )}
        </nav>
      )}
    </header>
  );
};
