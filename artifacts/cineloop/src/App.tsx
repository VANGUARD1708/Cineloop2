import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import { Shell } from "@/components/layout/Shell";

import AppHeader from "@/components/layout/AppHeader";
import { IdentityProvider } from "@/hooks/useIdentity";
import ErrorBoundary from "@/components/ErrorBoundary";

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
import AccountPage from "@/pages/AccountPage";
import SearchPage from "@/pages/SearchPage";
import TastePage from "@/pages/TastePage";

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
        <Route path="/account" component={AccountPage} />
        <Route path="/taste" component={TastePage} />
        <Route path="/search" component={SearchPage} />
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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <IdentityProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AppHeader />
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </IdentityProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
