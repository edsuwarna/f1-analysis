import { cn } from '@/lib/utils';

const IOC_TO_ISO: Record<string, string> = {
  AUS:'AU', AUT:'AT', AZE:'AZ', BEL:'BE', BRA:'BR', BRN:'BH',
  CAN:'CA', CHN:'CN', CZE:'CZ', DEN:'DK', ESP:'ES', FIN:'FI',
  FRA:'FR', GBR:'GB', GER:'DE', HUN:'HU', INA:'ID', IRL:'IE',
  ITA:'IT', JPN:'JP', KSA:'SA', MAS:'MY', MEX:'MX', MON:'MC',
  NED:'NL', NOR:'NO', NZL:'NZ', POL:'PL', POR:'PT', PRT:'PT',
  QAT:'QA', ROU:'RO', RSA:'ZA', RUS:'RU', SGP:'SG', SUI:'CH',
  SWE:'SE', THA:'TH', TUR:'TR', UAE:'AE', USA:'US', VIE:'VN',
};

export function flagEmoji(cc?: string): string {
  if (!cc || cc === 'XX') return '';
  const iso = cc.length === 3 ? (IOC_TO_ISO[cc] || cc.slice(0, 2)) : cc;
  const base = 0x1F1E6;
  return String.fromCodePoint(base + (iso.charCodeAt(0) - 65), base + (iso.charCodeAt(1) - 65));
}

export const TEAM_LOGOS: Record<string, string> = {
  Alpine: '/logos/alpine.svg',
  'Aston Martin': '/logos/aston-martin.svg',
  Audi: '/logos/audi.svg',
  Cadillac: '/logos/cadillac.svg',
  Ferrari: '/logos/ferrari.svg',
  'Haas F1 Team': '/logos/haas.svg',
  McLaren: '/logos/mclaren.svg',
  Mercedes: '/logos/mercedes.svg',
  'Racing Bulls': '/logos/racing-bulls.svg',
  'Red Bull Racing': '/logos/red-bull-racing.svg',
  Williams: '/logos/williams.svg',
};

export function teamColor(colour?: string): string {
  if (!colour) return '#666';
  return colour.startsWith('#') ? colour : '#' + colour;
}

export function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(3);
  return mins > 0 ? `${mins}:${secs.padStart(6, '0')}` : `${secs}s`;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'TBC';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'TBC';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'TBC';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'TBC';
  return d.toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
