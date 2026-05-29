import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarFooter, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
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
import {
  Home, Trophy, Users, Calendar, Gauge, Swords, Flame,
  Wrench, ScrollText, Sun, Moon, Flag,
} from 'lucide-react';

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Calendar, label: 'Races', path: '/races' },
  { icon: Trophy, label: 'Driver Standings', path: '/standings/drivers' },
  { icon: Users, label: 'Constructor Standings', path: '/standings/constructors' },
  { icon: Gauge, label: 'Driver Stats', path: '/stats/drivers' },
  { icon: Swords, label: 'Head to Head', path: '/head-to-head' },
  { icon: Flame, label: 'Race Pace', path: '/race-pace' },
  { icon: Flag, label: 'Pit Stops', path: '/pit-stops' },
  { icon: Wrench, label: 'Tech Updates', path: '/tech-updates' },
];

function AppLayout() {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="flex h-screen w-full">
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
                {navItems.map(item => {
                  const isActive = location.pathname === item.path;
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => navigate(item.path)}
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
              {navItems.find(n => n.path === location.pathname)?.label || 'F1 Analysis'}
            </h2>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/races" element={<MeetingsPage onSelectSession={(mId, sId) => navigate(`/session/${mId}/${sId}`)} />} />
            <Route path="/session/:meetingId/:sessionId" element={<SessionDetailPage />} />
            <Route path="/standings/drivers" element={<DriverStandingsPage />} />
            <Route path="/standings/constructors" element={<ConstructorStandingsPage />} />
            <Route path="/stats/drivers" element={<DriverStatsPage />} />
            <Route path="/head-to-head" element={<HeadToHeadPage />} />
            <Route path="/race-pace" element={<RacePacePage />} />
            <Route path="/pit-stops" element={<PitStopsPage />} />
            <Route path="/tech-updates" element={<TechUpdatesPage />} />
            <Route path="*" element={
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <p className="text-lg font-medium">Coming Soon</p>
                <p className="text-sm">This page is under construction</p>
              </div>
            } />
          </Routes>
        </main>
      </SidebarInset>
    </div>
  );
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
