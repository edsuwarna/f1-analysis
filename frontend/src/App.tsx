import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarFooter, SidebarInset, SidebarTrigger, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { useTheme } from '@/hooks/use-theme';
import HomePage from '@/pages/HomePage';
import DriverStandingsPage from '@/pages/DriverStandingsPage';
import ConstructorStandingsPage from '@/pages/ConstructorStandingsPage';
import MeetingsPage from '@/pages/MeetingsPage';
import SessionDetailPage from '@/pages/SessionDetailPage';
import DriverStatsPage from '@/pages/DriverStatsPage';
import HeadToHeadPage from '@/pages/HeadToHeadPage';
import PitStopsPage from '@/pages/PitStopsPage';
import RacePacePage from '@/pages/RacePacePage';
import TechUpdatesPage from '@/pages/TechUpdatesPage';
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
  Wrench, ScrollText, Sun, Moon, Flag, BarChart3, Building2,
  Newspaper, BookOpen, BookMarked, Info, ChevronDown, ChevronRight,
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
  { icon: UserCircle, label: 'Drivers', path: '/drivers' },
  { icon: BarChart3, label: 'Season Analysis', path: '/season' },
  { icon: Swords, label: 'Team Battle', path: '/team-battle' },
  { icon: Building2, label: 'Teams', path: '/teams' },
  { icon: Gauge, label: 'Driver Stats', path: '/stats/drivers' },
  { icon: Activity, label: 'Consistency', path: '/consistency' },
  { icon: Flame, label: 'Race Pace', path: '/race-pace' },
  { icon: Swords, label: 'Head to Head', path: '/head-to-head' },
  { icon: Flag, label: 'Pit Stops', path: '/pit-stops' },
  { icon: Wrench, label: 'Tech Updates', path: '/tech-updates' },
  { icon: Newspaper, label: 'News', path: '/news' },
];

const bottomNavItems: NavItem[] = [
  { icon: BookOpen, label: 'Guide', path: '/guide' },
  { icon: BookMarked, label: 'Glossary', path: '/glossary' },
  { icon: Info, label: 'About', path: '/about' },
];

function AppLayout() {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [standingsOpen, setStandingsOpen] = useState(
    location.pathname.startsWith('/standings')
  );

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link to="/">
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

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainNavItems.map(item => {
                  if (item.path === '/races') {
                    // Races and Session routes check
                    const isActiveRaces = location.pathname === '/races' || location.pathname.startsWith('/session/');
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActiveRaces}
                          onClick={() => navigate(item.path)}
                          tooltip={item.label}
                        >
                          <item.icon className="size-4" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={isActive(item.path)}
                        onClick={() => navigate(item.path)}
                        tooltip={item.label}
                      >
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}

                {/* Standings Submenu */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={location.pathname.startsWith('/standings')}
                    onClick={() => setStandingsOpen(!standingsOpen)}
                    tooltip="Standings"
                  >
                    <Trophy className="size-4" />
                    <span>Standings</span>
                    <span className="ml-auto">
                      {standingsOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                    </span>
                  </SidebarMenuButton>
                  {standingsOpen && (
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          isActive={location.pathname === '/standings/drivers'}
                          onClick={() => navigate('/standings/drivers')}
                        >
                          <Users className="size-3.5" />
                          <span>Driver Standings</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          isActive={location.pathname === '/standings/constructors'}
                          onClick={() => navigate('/standings/constructors')}
                        >
                          <Building2 className="size-3.5" />
                          <span>Constructor Standings</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
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
                  onClick={() => navigate(item.path)}
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
            <Route path="/standings/drivers" element={<DriverStandingsPage />} />
            <Route path="/standings/constructors" element={<ConstructorStandingsPage />} />
            <Route path="/stats/drivers" element={<DriverStatsPage />} />
            <Route path="/head-to-head" element={<HeadToHeadPage />} />
            <Route path="/consistency" element={<ConsistencyPage />} />
            <Route path="/race-pace" element={<RacePacePage />} />
            <Route path="/pit-stops" element={<PitStopsPage />} />
            <Route path="/tech-updates" element={<TechUpdatesPage />} />
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
      </SidebarInset>
    </SidebarProvider>
  );
}

function getPageTitle(pathname: string): string {
  const titles: Record<string, string> = {
    '/': 'Home',
    '/races': 'Races',
    '/drivers': 'Drivers',
    '/standings/drivers': 'Driver Standings',
    '/standings/constructors': 'Constructor Standings',
    '/stats/drivers': 'Driver Stats',
    '/head-to-head': 'Head to Head',
    '/consistency': 'Consistency',
    '/race-pace': 'Race Pace',
    '/pit-stops': 'Pit Stops',
    '/tech-updates': 'Tech Updates',
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
