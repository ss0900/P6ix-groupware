// src/components/layout/Header.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu as MenuIcon, Bell, MessageSquare, HelpCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import { getUnansweredCount } from "../../api/help";

import ChatPanel from "../chat/ChatPanel";
import NotificationPanel from "../notification/NotificationPanel";
import Menu from "./Menu";

const getLogoCacheKeys = (username) => {
  const safeUsername = username || "anonymous";
  return {
    companyIdKey: `header:company:${safeUsername}:id`,
    logoUrlKey: `header:company:${safeUsername}:logo`,
  };
};

function Header({ onMenuClick }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [faqUnansweredCount, setFaqUnansweredCount] = useState(0);
  const [companyId, setCompanyId] = useState(null);
  const [companyLogoUrl, setCompanyLogoUrl] = useState(null);
  const [companyLogoLoading, setCompanyLogoLoading] = useState(true);

  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const res = await api.get("chat/notifications/unread-count/");
        setUnreadNotifications(res.data.count || 0);
      } catch (err) {
        console.error(err);
      }
    };

    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let mounted = true;

    const clearLogoCache = (username) => {
      if (!username) return;
      const { companyIdKey, logoUrlKey } = getLogoCacheKeys(username);
      localStorage.removeItem(companyIdKey);
      localStorage.removeItem(logoUrlKey);
    };

    const readLogoCache = (username) => {
      if (!username) return { cachedCompanyId: null, cachedLogoUrl: null };
      const { companyIdKey, logoUrlKey } = getLogoCacheKeys(username);
      return {
        cachedCompanyId: localStorage.getItem(companyIdKey),
        cachedLogoUrl: localStorage.getItem(logoUrlKey),
      };
    };

    const writeLogoCache = (username, companyId, logoUrl) => {
      if (!username) return;
      const { companyIdKey, logoUrlKey } = getLogoCacheKeys(username);
      localStorage.setItem(companyIdKey, String(companyId));
      if (logoUrl) {
        localStorage.setItem(logoUrlKey, logoUrl);
      } else {
        localStorage.removeItem(logoUrlKey);
      }
    };

    const fetchPrimaryMembership = async () => {
      const membershipRes = await api.get("core/membership/me/");
      const memberships = membershipRes.data?.results ?? membershipRes.data ?? [];
      const primaryMembership =
        memberships.find((membership) => membership.is_primary) || memberships[0];

      return {
        companyId: primaryMembership?.company || null,
        companyLogoUrl: primaryMembership?.company_logo || null,
      };
    };

    const loadCompanyLogo = async () => {
      if (!user) {
        if (mounted) {
          setCompanyId(null);
          setCompanyLogoUrl(null);
          setCompanyLogoLoading(false);
        }
        return;
      }

      const username = user?.username || "";
      const { cachedLogoUrl } = readLogoCache(username);

      if (mounted && cachedLogoUrl) {
        setCompanyLogoUrl(cachedLogoUrl);
        setCompanyLogoLoading(false);
      } else if (mounted) {
        setCompanyLogoLoading(true);
      }

      try {
        const { companyId, companyLogoUrl } = await fetchPrimaryMembership();

        if (!companyId) {
          clearLogoCache(username);
          if (mounted) {
            setCompanyId(null);
            setCompanyLogoUrl(null);
            setCompanyLogoLoading(false);
          }
          return;
        }

        writeLogoCache(username, companyId, companyLogoUrl);

        if (mounted) {
          setCompanyId(companyId);
          setCompanyLogoUrl(companyLogoUrl);
          setCompanyLogoLoading(false);
        }
      } catch (err) {
        console.error("Failed to load company logo:", err);
        if (err?.response?.status === 401) {
          clearLogoCache(username);
        }

        if (mounted) {
          setCompanyId(null);
          if (!cachedLogoUrl) {
            setCompanyLogoUrl(null);
          }
          setCompanyLogoLoading(false);
        }
      }
    };

    loadCompanyLogo();

    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user?.is_superuser || !companyId) {
      setFaqUnansweredCount(0);
      return undefined;
    }

    const loadUnanswered = async () => {
      try {
        const res = await getUnansweredCount(companyId);
        setFaqUnansweredCount(Number(res.data?.count || 0));
      } catch (err) {
        console.error(err);
      }
    };

    loadUnanswered();
    const interval = setInterval(loadUnanswered, 30000);
    return () => clearInterval(interval);
  }, [companyId, user?.is_superuser]);

  const goDashboard = () => {
    navigate("/");
  };

  const goHelp = () => {
    navigate("/help");
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#1e1e2f] shadow-md h-[60px]">
        <div className="w-full h-full px-6 flex items-center">
          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={onMenuClick}
              className="p-2 rounded-lg hover:bg-slate-700 text-white transition-colors lg:hidden"
            >
              <MenuIcon size={20} />
            </button>

            <button
              onClick={goDashboard}
              className="text-white font-bold text-xl hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              {companyLogoLoading ? (
                <span
                  className="block h-8 w-[180px] rounded bg-slate-700 animate-pulse"
                  aria-hidden="true"
                />
              ) : companyLogoUrl ? (
                <img
                  src={companyLogoUrl}
                  alt="Company Logo"
                  className="h-8 w-auto max-w-[220px] object-contain"
                  onError={() => {
                    setCompanyLogoUrl(null);
                    const { logoUrlKey } = getLogoCacheKeys(user?.username);
                    localStorage.removeItem(logoUrlKey);
                  }}
                />
              ) : (
                "P6ix Groupware"
              )}
            </button>
          </div>

          <div className="flex-1 flex justify-center px-8 hidden lg:flex">
            <Menu />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowChat(false);
                }}
                className="relative p-2 rounded-lg hover:bg-slate-700 text-white transition-colors"
                title="알림"
              >
                <Bell size={20} />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {unreadNotifications}
                  </span>
                )}
              </button>

              <NotificationPanel
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
              />
            </div>

            <button
              onClick={() => {
                setShowChat(true);
                setShowNotifications(false);
              }}
              className="relative p-2 rounded-lg hover:bg-slate-700 text-white transition-colors"
              title="메신저"
            >
              <MessageSquare size={20} />
              {chatUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {chatUnreadCount}
                </span>
              )}
            </button>

            <button
              onClick={goHelp}
              className="relative p-2 rounded-lg hover:bg-slate-700 text-white transition-colors"
              title="도움말"
            >
              <HelpCircle size={20} />
              {user?.is_superuser && faqUnansweredCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {faqUnansweredCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <ChatPanel
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        onOpenExternally={() => setShowChat(true)}
        onUnreadCountChange={setChatUnreadCount}
      />
    </>
  );
}

export default Header;
