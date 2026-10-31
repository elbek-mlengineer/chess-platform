"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  Swords,
  Puzzle,
  UserRound,
  Settings2,
  ArrowUpRight,
  Sun,
  Moon,
  Globe2,
  ChevronDown,
  Users,
} from "lucide-react";
import { useApp } from "./provider";
import { LanguageSelect } from "./language-select";
import { useOnline } from "./online-provider";
import { OnlineNotice } from "./online-notice";
const navigation = [
  { href: "/", key: "home", icon: House },
  { href: "/play", key: "play", icon: Swords },
  { href: "/friends", key: "friends", icon: Users },
  { href: "/puzzles", key: "puzzles", icon: Puzzle },
  { href: "/profile", key: "profile", icon: UserRound },
  { href: "/settings", key: "settings", icon: Settings2 },
] as const;
export function Logo() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 32 36">
        <path
          d="M8 29h18v4H6v-4l5-4 2-7-6 1 1-7L20 3l1 5c7 5 7 12 3 17H12M15 12h1"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
export function Shell({ children }: { children: React.ReactNode }) {
  const { t, setPreferences, data, ready, storageError, dismissError } =
    useApp();
  const path = usePathname();
  const activePath = path === "/online" ? "/friends" : path;
  const { text, state } = useOnline();
  const label = (key: (typeof navigation)[number]["key"]) =>
    key === "friends" ? text.friends : t(key);
  const noticeCount =
    (state?.incoming.length || 0) + (state?.invitations.length || 0);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <Logo />
          <span>
            shatranj<span className="brand-period">.</span>
          </span>
        </Link>
        <p className="brand-tagline">{t("tagline")}</p>
        <nav aria-label={t("home")}>
          {navigation.map(({ href, key, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-label={label(key)}
              className={`nav-link ${activePath === href ? "active" : ""}`}
              aria-current={activePath === href ? "page" : undefined}
            >
              <Icon size={20} />
              <span>{label(key)}</span>
              {key === "friends" && noticeCount > 0 && (
                <span className="tag">{noticeCount}</span>
              )}
              {activePath === href && <span className="nav-active-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="tiny-chess">♙</span>
            <p>{t("localOnly")}</p>
            <span>{t("noRating")}</span>
          </div>
          <Link
            href={state?.me ? "/friends" : "/profile"}
            className="guest-link"
          >
            <span className="avatar">
              {["♞", "♜", "♝", "♛"][data.profile.avatar]}
            </span>
            <span>
              <strong>
                {state?.me?.username || data.profile.name || t("guest")}
              </strong>
              <small>{state?.me ? text.connected : t("device")}</small>
            </span>
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="mobile-brand">
            <Logo />
            <strong>shatranj.</strong>
          </div>
          <div className="breadcrumb">
            {label(
              navigation.find((item) => item.href === activePath)?.key ||
                "home",
            )}
            <span>/</span>
            <span>Shatranj</span>
          </div>
          <div className="top-actions">
            <div className="language-control">
              <Globe2 size={16} />
              <LanguageSelect />
              <ChevronDown size={12} />
            </div>
            <span className="top-divider" />
            <button
              className="icon-button theme-toggle"
              aria-label={t("theme")}
              onClick={() =>
                setPreferences((p) => ({
                  ...p,
                  theme:
                    document.documentElement.dataset.theme === "dark"
                      ? "light"
                      : "dark",
                }))
              }
            >
              <Sun size={19} className="sun-icon" />
              <Moon size={19} className="moon-icon" />
            </button>
            <Link
              className="top-avatar"
              href="/profile"
              aria-label={t("profile")}
            >
              {["♞", "♜", "♝", "♛"][data.profile.avatar]}
            </Link>
          </div>
        </header>
        <main>
          <OnlineNotice />
          {storageError && (
            <div role="alert" className="storage-alert">
              {t("storageError")}
              <button onClick={dismissError}>{t("dismiss")}</button>
            </div>
          )}
          {ready ? (
            children
          ) : (
            <div className="loading">
              <Logo />
              <p>{t("loading")}</p>
            </div>
          )}
        </main>
        <footer>
          <span>© 2026 Shatranj</span>
          <span>
            <i />
            {t("footer")}
          </span>
          <span>{t("demo")}</span>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label={t("home")}>
        {navigation.map(({ href, key, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={activePath === href ? "active" : ""}
            aria-current={activePath === href ? "page" : undefined}
          >
            <Icon size={20} />
            <span>{label(key)}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
