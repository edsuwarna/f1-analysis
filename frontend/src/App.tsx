import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarFooter, SidebarInset, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { useTheme } from '@/hooks/use-theme';
import HomePage from '@/pages/HomePage';
import StandingsPage from '@/pages/StandingsPage';
import MeetingsPage from '@/pages/MeetingsPage';
import SessionDetailPage from '@/pages/SessionDetailPage';
import DriverStatsPage from '@/pages/DriverStatsPage';
import PitStopsPage from '@/pages/PitStopsPage';
import RacePacePage from '@/pages/RacePacePage';
import SeasonAnalysisPage from '@/pages/SeasonAnalysisPage';
import TeamBattlePage from '@/pages/TeamBattlePage';
import TeamsPage from '@/pages/TeamsPage';
import NewsPage from '@/pages/NewsPage';
import GuidePage from '@/pages/GuidePage';
import GlossaryPage from '@/pages/GlossaryPage';
import AboutPage from '@/pages/AboutPage';
import DriversPage from '@/pages/DriversPage';
import ConsistencyPage from '@/pages/ConsistencyPage';
import {
  Home, Trophy, Users, Calendar, Gauge, Swords, Flame,
  ScrollText, Sun, Moon, Flag, BarChart3, Building2,
  Newspaper, BookOpen, BookMarked, Info,
  Activity, UserCircle,
} from 'lucide-react';

interface NavItem {
  icon: any;
  label: string;
  path: string;
}

const mainNavItems: NavItem[] = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Calendar, label: 'Races', path: '/races' },
  { icon: Trophy, label: 'Standings', path: '/standings' },
  { icon: UserCircle, label: 'Drivers', path: '/drivers' },
  { icon: Building2, label: 'Teams', path: '/teams' },
  { icon: BarChart3, label: 'Season Analysis', path: '/season' },
  { icon: Swords, label: 'Team Battle', path: '/team-battle' },
  { icon: Gauge, label: 'Driver Stats', path: '/stats/drivers' },
  { icon: Activity, label: 'Consistency', path: '/consistency' },
  { icon: Flame, label: 'Race Pace', path: '/race-pace' },
  { icon: Flag, label: 'Pit Stops', path: '/pit-stops' },
  { icon: Newspaper, label: 'News', path: '/news' },
];

const bottomNavItems: NavItem[] = [
  { icon: BookOpen, label: 'Guide', path: '/guide' },
  { icon: BookMarked, label: 'Glossary', path: '/glossary' },
  { icon: Info, label: 'About', path: '/about' },
];

function AppLayoutContent() {
  const { theme, toggle } = useTheme();
  const { setOpenMobile } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navAndClose = (path: string) => {
    navigate(path);
    setOpenMobile(false);
  };

  return (
    <div className="flex w-full">
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link to="/" onClick={() => setOpenMobile(false)}>
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Flag className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">F1 Analysis</span>
                    <span className="truncate text-xs text-muted-foreground">2026 Season</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="sidebar-scroll-fade">
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainNavItems.map(item => {
                  const isRaces = item.path === '/races';
                  const isActiveItem = isRaces
                    ? (location.pathname === '/races' || location.pathname.startsWith('/session/'))
                    : isActive(item.path);
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={isActiveItem}
                        onClick={() => navAndClose(item.path)}
                        tooltip={item.label}
                      >
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={toggle} tooltip={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}>
                {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {bottomNavItems.map(item => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  isActive={isActive(item.path)}
                  onClick={() => navAndClose(item.path)}
                  tooltip={item.label}
                >
                  <item.icon className="size-4" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <a href="https://github.com/edsuwarna/f1-analysis" target="_blank" rel="noopener noreferrer">
                  <ScrollText className="size-4" />
                  <span>Changelog</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background/80 backdrop-blur-md px-6">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex-1">
            <h2 className="text-sm font-medium">
              {getPageTitle(location.pathname)}
            </h2>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/races" element={<MeetingsPage onSelectSession={(mId, sId) => navigate(`/session/${mId}/${sId}`)} />} />
            <Route path="/drivers" element={<DriversPage />} />
            <Route path="/session/:meetingId/:sessionId" element={<SessionDetailPage />} />
            <Route path="/standings" element={<StandingsPage />} />
            <Route path="/stats/drivers" element={<DriverStatsPage />} />
            <Route path="/head-to-head" element={<Navigate to="/team-battle" replace />} />
            <Route path="/consistency" element={<ConsistencyPage />} />
            <Route path="/race-pace" element={<RacePacePage />} />
            <Route path="/pit-stops" element={<PitStopsPage />} />
            <Route path="/season" element={<SeasonAnalysisPage />} />
            <Route path="/team-battle" element={<TeamBattlePage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/glossary" element={<GlossaryPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <p className="text-lg font-medium">Coming Soon</p>
                <p className="text-sm">This page is under construction</p>
              </div>
            } />
          </Routes>
        </main>

        {/* Footer: Attribution & Disclaimer */}
        <footer className="border-t border-border px-6 py-4 text-center text-[11px] text-muted-foreground/60">
          <span>Data from <a href="https://openf1.org/" target="_blank" rel="noopener noreferrer" className="hover:text-muted-foreground underline underline-offset-2">OpenF1 API</a>
          . Fan project — not affiliated with Formula 1 or any team.</span>
        </footer>
      </SidebarInset>
    </div>
  );
}

function AppLayout() {
  return (
    <SidebarProvider>
      <AppLayoutContent />
    </SidebarProvider>
  );
}

function getPageTitle(pathname: string): string {
  const titles: Record<string, string> = {
    '/': 'Home',
    '/races': 'Races',
    '/drivers': 'Drivers',
    '/standings': 'Standings',
    '/stats/drivers': 'Driver Stats',
    '/consistency': 'Consistency',
    '/race-pace': 'Race Pace',
    '/pit-stops': 'Pit Stops',
    '/season': 'Season Analysis',
    '/team-battle': 'Team Battle',
    '/teams': 'Teams',
    '/news': 'News',
    '/guide': 'Guide',
    '/glossary': 'Glossary',
    '/about': 'About',
  };
  if (titles[pathname]) return titles[pathname];
  if (pathname.startsWith('/session/')) return 'Session Detail';
  if (pathname.startsWith('/standings/')) return 'Standings';
  return 'F1 Analysis';
}

export default function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </TooltipProvider>
  );
}
