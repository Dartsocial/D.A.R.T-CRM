"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { Session, User } from "@supabase/auth-helpers-nextjs";
import { SessionContextProvider, useSessionContext } from "@supabase/auth-helpers-react";
import { setCookie, getCookie, iosSessionHelpers } from "@/lib/cookieUtils";
import { usePathname, useRouter } from "next/navigation";
import { Theme } from "@/types/theme";
import { defaultThemeId, getThemeById, getAvailableThemeIds } from "@/themes";
import { dynamicFontManager } from "@/lib/dynamicFontManager";
import { transitionTheme, smoothThemeToggle } from "@/utils/themeTransitions";
import { SidebarProvider } from "@/components/Layouts/sidebar/sidebar-context";

interface EnhancedThemeContextType {
  themeType: "light" | "dark";
  toggleTheme: (element?: HTMLElement) => Promise<void>;
  themeId: string;
  setThemeId: (id: string, element?: HTMLElement) => Promise<void>;
  getTheme: (id?: string) => Promise<Theme | null>;
  availableThemes: string[];
}

const ThemeContext = createContext<EnhancedThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  refreshSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

function IOSSessionManager({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const cleanup = iosSessionHelpers.setupIOSHandlers();
    return cleanup;
  }, []);

  return <>{children}</>;
}

function InternalAuthProvider({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useSessionContext();
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const refreshSession = () => {
    iosSessionHelpers.refreshSession();
  };

  useEffect(() => {
    if (session?.user) {
      setUser(session.user);
    } else {
      setUser(null);
    }
  }, [session]);

  useEffect(() => {
    if (!isLoading && !session) {
      const publicRoutes = [
        "/",
        "/sign-in",
        "/sign-up",
        "/forgot-password",
        "/reset-password",
        "/CMS",
        "/CMS/schedule"
      ];

      const isPublicRoute =
        publicRoutes.includes(pathname) ||
        pathname === "/people" ||
        pathname.startsWith("/people/") ||
        pathname.startsWith("/CMS") ||
        pathname.startsWith("/Tools");

      if (!isPublicRoute) {
        router.push("/sign-in");
      }
    }
  }, [session, isLoading, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, session, isLoading, refreshSession }}>
      <IOSSessionManager>
        {children}
      </IOSSessionManager>
    </AuthContext.Provider>
  );
}

export function useIOSSessionRefresh() {
  const { refreshSession } = useAuth();
  return { refreshSession };
}

export const Providers: React.FC<{
  children: React.ReactNode;
  session?: Session | null;
}> = ({ children, session }) => {
  const [themeType, setThemeType] = useState<"light" | "dark">("light");
  const [themeId, setThemeIdState] = useState<string>(defaultThemeId);
  const [mounted, setMounted] = useState(false);
  const [availableThemes, setAvailableThemes] = useState<string[]>([]);

  const getTheme = async (id?: string): Promise<Theme | null> => {
    const targetId = id || themeId;
    try {
      const theme = await getThemeById(targetId);
      if (!theme) return await getThemeById(defaultThemeId);
      return theme;
    } catch (error) {
      console.error(`❌ Error getting theme ${targetId}:`, error);
      return await getThemeById(defaultThemeId);
    }
  };

  const setThemeId = async (id: string, element?: HTMLElement) => {
    const themeChangeCallback = async () => {
      try {
        const theme = await getThemeById(id);
        if (theme) {
          setThemeIdState(id);
          localStorage.setItem("themeId", id);
          setCookie("themeId", id, { path: "/", maxAge: 31536000 });
        }
      } catch (error) {
        console.error(`❌ Error setting theme ${id}:`, error);
      }
    };

    if (element) {
      await smoothThemeToggle(element, themeChangeCallback);
    } else {
      await transitionTheme(themeChangeCallback);
    }
  };

  const toggleTheme = async (element?: HTMLElement) => {
    const themeChangeCallback = () => {
      setThemeType((prev) => (prev === "light" ? "dark" : "light"));
    };

    if (element) {
      await smoothThemeToggle(element, themeChangeCallback);
    } else {
      await transitionTheme(themeChangeCallback);
    }
  };

  useEffect(() => {
    const loadAvailableThemes = async () => {
      try {
        const themeIds = await getAvailableThemeIds();
        setAvailableThemes(themeIds);
      } catch (error) {
        console.error("❌ Error loading available themes:", error);
        setAvailableThemes([defaultThemeId]);
      }
    };
    loadAvailableThemes();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setMounted(true);

      const initializeTheme = async () => {
        const savedThemeId = localStorage.getItem("themeId") || getCookie("themeId");
        if (savedThemeId) {
          const theme = await getThemeById(savedThemeId);
          setThemeIdState(theme ? savedThemeId : defaultThemeId);
        }

        const savedThemeType = localStorage.getItem("theme") || getCookie("theme");
        if (!savedThemeType) {
          const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          setThemeType(systemPrefersDark ? "dark" : "light");
        } else {
          setThemeType(savedThemeType as "light" | "dark");
        }
      };

      initializeTheme();
    }
  }, []);

  useEffect(() => {
    if (!mounted || availableThemes.length === 0) return;

    const applyTheme = async () => {
      try {
        const theme = await getTheme();
        if (!theme) return;

        const variables = themeType === "dark" ? theme.dark : theme.light;
        const html = document.documentElement;

        html.classList.remove("light", "dark");
        availableThemes.forEach((id) => html.classList.remove(`theme-${id}`));
        html.classList.add(themeType);
        html.classList.add(`theme-${themeId}`);

        for (const [key, value] of Object.entries(variables)) {
          html.style.setProperty(key, value);
        }

        // ─── iOS status bar / theme-color ─────────────────────────────
        // Set theme-color directly from the theme's --destructive value
        // (layout-tokens.css defines --gp-bg = hsl(var(--destructive)),
        //  which is the header background color). Doing this here — rather
        // than reading from a DOM element in the hook — guarantees the
        // correct color is set the instant the theme finishes applying,
        // regardless of which route/layout is active.
        const destructive = (variables as Record<string, string>)["--destructive"];
        if (destructive) {
          const statusBarColor = `hsl(${destructive})`;
          let themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
          if (!themeColorMeta) {
            themeColorMeta = document.createElement("meta");
            themeColorMeta.name = "theme-color";
            document.head.appendChild(themeColorMeta);
          }
          themeColorMeta.content = statusBarColor;
        }
        // ──────────────────────────────────────────────────────────────

        try {
          await dynamicFontManager.autoLoadFontsFromCSS();
        } catch (error) {
          console.error("❌ Failed to auto-load fonts:", error);
        }

        if (theme.typography?.trackingNormal) {
          document.body.style.letterSpacing = theme.typography.trackingNormal;
        }

        localStorage.setItem("theme", themeType);
        setCookie("theme", themeType, { path: "/", maxAge: 31536000 });
      } catch (error) {
        console.error("❌ Error applying theme:", error);
      }
    };

    applyTheme();
  }, [themeType, themeId, mounted, availableThemes]);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return (
    <SessionContextProvider supabaseClient={supabase} initialSession={session}>
      <InternalAuthProvider>
        <ThemeContext.Provider
          value={{ themeType, toggleTheme, themeId, setThemeId, getTheme, availableThemes }}
        >
          <SidebarProvider>
            {children}
          </SidebarProvider>
        </ThemeContext.Provider>
      </InternalAuthProvider>
    </SessionContextProvider>
  );
};