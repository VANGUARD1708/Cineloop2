import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import { Shell } from "@/components/layout/Shell";

// Header
import AppHeader from "@/components/layout/AppHeader";

// Pages
import FeedPage from "@/pages/FeedPage";
import TrendingPage from "@/pages/TrendingPage";
import DiscoverPage from "@/pages/DiscoverPage";
import CharactersPage from "@/pages/CharactersPage";
import ProfilePage from "@/pages/ProfilePage";
import LeaderboardPage from "@/pages/LeaderboardPage";
import UploadPage from "@/pages/UploadPage";
import NotificationsPage from "@/pages/NotificationsPage";
import PricingPage from "@/pages/PricingPage";
import PayReturnPage from "@/pages/PayReturnPage";
import MoodMatchPage from "@/pages/MoodMatchPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Shell>
      <Switch>
        <Route path="/" component={FeedPage} />
        <Route path="/trending" component={TrendingPage} />
        <Route path="/discover" component={DiscoverPage} />
        <Route path="/mood" component={MoodMatchPage} />
        <Route path="/characters" component={CharactersPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/leaderboard" component={LeaderboardPage} />
        <Route path="/upload" component={UploadPage} />
        <Route path="/notifications" component={NotificationsPage} />
        <Route path="/pricing" component={PricingPage} />
        <Route path="/pay/return" component={PayReturnPage} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppHeader />
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;