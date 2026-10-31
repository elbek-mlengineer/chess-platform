import type { Metadata } from "next";
import { AppProvider } from "@/components/provider";
import { Shell } from "@/components/shell";
import { OnlineProvider } from "@/components/online-provider";
import { OnlineGameNavigation } from "@/components/online-game-navigation";
import "./globals.css";
export const metadata: Metadata = {
  title: "Shatranj — Every move matters",
  description:
    "A thoughtful place to play, practice, and enjoy chess. Local games, computer opponents, and tactical puzzles.",
};
const themeScript = `(function(){var t='system';var l='uz';try{var p=JSON.parse(localStorage.getItem('shatranj.preferences.v1'));if(p&&['light','dark','system'].includes(p.theme))t=p.theme;if(p&&['uz','en','ru'].includes(p.locale))l=p.locale}catch(e){}document.documentElement.dataset.theme=t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;document.documentElement.lang=l})()`;
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        {/* Dark Reader must see this before it can mutate icons during hydration.
            Shatranj manages light, dark, and system themes itself. */}
        <meta name="darkreader-lock" content="" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppProvider>
          <OnlineProvider>
            <OnlineGameNavigation />
            <Shell>{children}</Shell>
          </OnlineProvider>
        </AppProvider>
      </body>
    </html>
  );
}
