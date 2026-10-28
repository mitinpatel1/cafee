
import React, { useEffect, useRef, useState } from "react";

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
  ChevronDown,
} from "lucide-react";

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();

  const navigate = useNavigate();
  const { pathname } = useLocation();

  const accountRef = useRef(null);

  const [q, setQ] = useState("");
  const [dropdown, setDropdown] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const customer = ["user", "employee"].includes(user?.role);

  const initial = (user?.name || "U")
    .charAt(0)
    .toUpperCase();

  const avatarUrl = user?.avatar || "";

  // ============================================
  // CLOSE MENUS ON ROUTE CHANGE
  // ============================================

  useEffect(() => {
    setDropdown(false);
    setDrawer(false);
  }, [pathname]);

  // Reset image error when user uploads a new photo
  useEffect(() => {
    setAvatarError(false);
  }, [avatarUrl]);

  // ============================================
  // CLOSE PROFILE DROPDOWN ON OUTSIDE CLICK
  // ============================================

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        accountRef.current &&
        !accountRef.current.contains(event.target)
      ) {
        setDropdown(false);
      }
    };

    document.addEventListener("pointerdown", handleOutsideClick);

    return () => {
      document.removeEventListener(
        "pointerdown",
        handleOutsideClick
      );
    };
  }, []);

  // ============================================
  // SEARCH
  // ============================================

  const submit = (event) => {
    event.preventDefault();

    const searchText = q.trim();

    if (!searchText) return;

    navigate(
      `/menu?search=${encodeURIComponent(searchText)}`
    );

    setDrawer(false);
  };

  // ============================================
  // LOGOUT
  // ============================================

  const handleLogout = () => {
    logout();

    setDropdown(false);
    setDrawer(false);

    navigate("/login");
  };

  // ============================================
  // PROFILE AVATAR
  // ============================================

  const ProfileAvatar = () => (
    <span className="ob-avatar-content">
      {avatarUrl && !avatarError ? (
        <img
          src={avatarUrl}
          alt=""
          className="nav-avatar-img"
          onError={() => setAvatarError(true)}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            borderRadius: "inherit",
          }}
        />
      ) : (
        <span className="ob-avatar-initial">
          {initial}
        </span>
      )}
    </span>
  );

  return (
    <header className="ob-top">
      <div className="ob-wrap ob-top-inner">

        {/* ======================================
            LOGO
        ====================================== */}

        <Link
          to="/"
          className="ob-logo"
          aria-label="OfficeBite home"
        >
          <span className="ob-logo-mark">
            <UtensilsCrossed size={19} />
          </span>

          <span>
            office
            <span className="brand-accent">
              bite.
            </span>
          </span>
        </Link>

        {/* ======================================
            DESKTOP NAVIGATION
        ====================================== */}

        <nav
          className="ob-pill"
          aria-label="Customer navigation"
        >
          <NavLink
            end
            to="/"
            className={({ isActive }) =>
              isActive ? "on" : ""
            }
          >
            Home
          </NavLink>

          <NavLink
            to="/menu"
            className={({ isActive }) =>
              isActive ? "on" : ""
            }
          >
            Explore Menu
          </NavLink>

          {customer && (
            <NavLink
              to="/my-orders"
              className={({ isActive }) =>
                isActive ? "on" : ""
              }
            >
              My Orders
            </NavLink>
          )}
        </nav>

        {/* ======================================
            RIGHT ACTIONS
        ====================================== */}

        <div className="ob-actions">

          {/* Search */}

          <form
            className="ob-search"
            role="search"
            onSubmit={submit}
          >
            <Search size={16} />

            <input
              type="search"
              aria-label="Search food"
              placeholder="Search dishes"
              value={q}
              onChange={(event) =>
                setQ(event.target.value)
              }
            />
          </form>

          {/* Cart */}

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

          {/* ====================================
              CUSTOMER PROFILE
          ==================================== */}

          {isAuthenticated && customer ? (
            <div
              className="nav-account"
              ref={accountRef}
            >
              <button
                type="button"
                className="nav-avatar"
                onClick={() =>
                  setDropdown((prev) => !prev)
                }
                aria-expanded={dropdown}
                aria-haspopup="menu"
                aria-label="Open account menu"
                style={{
                  width: 46,
                  height: 46,
                  minWidth: 46,
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  borderRadius: 12,
                  background: "#730042",
                  color: "#ffffff",
                }}
              >
                <ProfileAvatar />
              </button>

              {/* Dropdown */}

              {dropdown && (
                <div
                  className="nav-dropdown"
                  role="menu"
                >
                  <div className="nav-profile">
                    <div className="ob-dropdown-header">
                      <span className="ob-dropdown-avatar">
                        <ProfileAvatar />
                      </span>

                      <div className="ob-dropdown-user">
                        <b>{user?.name || "User"}</b>
                        <small>{user?.email || ""}</small>
                      </div>
                    </div>
                  </div>

                  <Link
                    to="/profile"
                    role="menuitem"
                    onClick={() =>
                      setDropdown(false)
                    }
                  >
                    <UserRound size={16} />
                    My Profile
                  </Link>

                  <Link
                    to="/my-orders"
                    role="menuitem"
                    onClick={() =>
                      setDropdown(false)
                    }
                  >
                    <ShoppingBag size={16} />
                    My Orders
                  </Link>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : !isAuthenticated ? (
            <Link
              to="/login"
              className="ob-text-link"
            >
              Sign In
            </Link>
          ) : null}

          {/* Order Now */}

          <Link
            className="nav-primary"
            to="/menu"
          >
            Order Now
            <ArrowUpRight size={17} />
          </Link>

          {/* Mobile Menu Toggle */}

          <button
            type="button"
            className="ob-menu-btn"
            onClick={() =>
              setDrawer((prev) => !prev)
            }
            aria-label={
              drawer ? "Close menu" : "Open menu"
            }
            aria-expanded={drawer}
          >
            {drawer ? (
              <X size={22} />
            ) : (
              <MenuIcon size={22} />
            )}
          </button>
        </div>
      </div>

      {/* ========================================
          MOBILE NAVIGATION
      ======================================== */}

      {drawer && (
        <nav
          className="ob-drawer"
          aria-label="Mobile customer navigation"
        >
          <Link
            to="/"
            onClick={() => setDrawer(false)}
          >
            Home
          </Link>

          <Link
            to="/menu"
            onClick={() => setDrawer(false)}
          >
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
                className="ob-mobile-profile-link"
              >
                <span className="ob-mobile-avatar">
                  <ProfileAvatar />
                </span>

                My Profile
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="ob-mobile-logout"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </>
          ) : !isAuthenticated ? (
            <Link
              to="/login"
              onClick={() => setDrawer(false)}
            >
              Customer Sign In
            </Link>
          ) : null}
        </nav>
      )}
    </header>
  );
};
