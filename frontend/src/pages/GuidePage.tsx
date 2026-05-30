import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, BookOpen } from 'lucide-react';

interface GuideSection {
  title: string;
  description: string;
  lookFor: string;
}

interface GuideCategory {
  title: string;
  icon: string;
  sections: GuideSection[];
}

const GUIDE_DATA: GuideCategory[] = [
  {
    title: 'Race Session Page',
    icon: '🏁',
    sections: [
      {
        title: 'Best Sector Times',
        description: 'Shows the fastest sector times set by each driver during a session, broken down by Sector 1, 2, and 3. Green cells indicate a personal best, purple indicates the overall fastest.',
        lookFor: 'Drivers consistently posting green or purple sectors — they are pushing hardest and extracting the most from the car.',
      },
      {
        title: 'Qualifying Evolution',
        description: 'Tracks how each driver\'s lap time improved across Q1, Q2, and Q3. Eliminated drivers are highlighted in red. A stacked bar shows the time progression.',
        lookFor: 'Drivers who improve the most between sessions — they found time when it mattered. Also watch for top teams sandbagging in earlier sessions.',
      },
      {
        title: 'Lap Distribution',
        description: 'A histogram or scatter plot showing all lap times set by each driver. Helps identify pace clusters, traffic effects, and consistency patterns.',
        lookFor: 'Tight clusters = consistent pace. Wide spread = traffic, mistakes, or tyre degradation. Outliers often indicate incidents or pit entry/exit laps.',
      },
      {
        title: 'Position History',
        description: 'Line chart showing each driver\'s race position over the course of the grand prix. Filterable by driver with a clickable legend.',
        lookFor: 'Steep upward slopes = strong recovery drives. Downward slopes = dropping through the field due to strategy or pace loss. Flat lines = processional race.',
      },
      {
        title: 'Track Position Map',
        description: 'Real-time-style plot of each driver\'s lateral position on track over time, useful for seeing defensive/offensive moves and track limits.',
        lookFor: 'Sudden lateral movements = overtakes or defensive moves. Repeated wide excursions = possible track limits issues.',
      },
      {
        title: 'Pit Strategy Battle',
        description: 'Overlays each driver\'s pit windows, tyre compounds, and stint lengths on a single timeline. Shows who pitted when and what tyre they took.',
        lookFor: 'Undercut opportunities — a driver pitting 1-2 laps before a rival can leapfrog them. Late safety cars can scramble the strategy completely.',
      },
      {
        title: 'Tyre Strategy Timeline',
        description: 'A Gantt-style chart showing every stint for every driver, colour-coded by tyre compound. Includes pit stop timings and total pit time.',
        lookFor: 'Drivers on offset strategies (e.g. longer first stint) trying to gain track position. Also look for extremely long stints with heavy degradation.',
      },
      {
        title: 'Weather Timeline',
        description: 'Shows ambient and track temperature, humidity, wind speed, and rain probability across the session duration. Critical for understanding tyre window and setup shifts.',
        lookFor: 'Rapid temperature drops or rain probability spikes just before a strategic pit window. Track temperature directly affects tyre behaviour.',
      },
      {
        title: 'Race Control',
        description: 'Timeline of all flags, safety car periods, virtual safety car (VSC) deployments, and investigations during a session. Each event includes the lap and duration.',
        lookFor: 'Safety car periods are the single biggest strategy differentiator — they compress the field and create free pit stop opportunities.',
      },
      {
        title: 'Overtake Mode Analysis',
        description: 'Shows the number and location of overtakes by lap and by driver. Differentiates between passes for position and passes in the pit lane.',
        lookFor: 'High overtake counts in the first few laps (chaotic starts) and after restarts. Compare driver overtake counts to identify the best wheel-to-wheel racers.',
      },
      {
        title: 'Braking Analysis',
        description: 'Braking point telemetry comparing drivers at key braking zones. Shows brake pressure, speed at braking point, and minimum corner speed.',
        lookFor: 'Drivers braking later consistently have an advantage but risk lock-ups. Compare team-mates to see who is extracting more from the brakes.',
      },
      {
        title: 'Corner Analysis',
        description: 'Minimum corner speed, throttle application, and gear selection data for each corner of the circuit. Enables detailed driver vs driver corner comparisons.',
        lookFor: 'Corner exit speed is often more important than entry speed — look for drivers who get on the throttle earlier while maintaining rotation.',
      },
    ],
  },
  {
    title: 'Season Analysis Page',
    icon: '📊',
    sections: [
      {
        title: 'Season Overview',
        description: 'Top-level stats including races completed, total drivers, different winners, and constructor standings snapshot. A heatmap shows which drivers have scored podiums across rounds.',
        lookFor: 'Consistency trends — drivers who score points nearly every race vs those with high-variance boom-or-bust results.',
      },
      {
        title: 'Driver Form Chart',
        description: 'A rolling form guide showing each driver\'s finishing position for every round, colour-coded by result quality (win, podium, points, out). Includes a moving average trendline.',
        lookFor: 'Mid-season slumps or surges. Drivers on an upward trend are peaking at the right time.',
      },
      {
        title: 'Season Progression',
        description: 'How the championship lead changed hands over the course of the season. Shows each driver\'s cumulative points race by race as a stepped line chart.',
        lookFor: 'Momentum shifts after regulation changes, driver swaps, or major upgrades. A steepening curve = a driver pulling away.',
      },
    ],
  },
  {
    title: 'Head to Head',
    icon: '🥊',
    sections: [
      {
        title: 'Constructor vs Constructor',
        description: 'Select any two constructors and compare their full season performance. Total points, average finish, podium count, wins, and a round-by-round breakdown showing who won each race weekend.',
        lookFor: 'Which team is more consistent? Which team peaks at specific circuits? Head-to-head qualifying pace tells you who has the fastest car over one lap.',
      },
      {
        title: 'Teammate Battle',
        description: 'Compares teammates within each team. Points gap, qualifying head-to-head, race head-to-head, average finish position, and retirement rates.',
        lookFor: 'A lopsided intra-team battle suggests one driver is outperforming the car — or the other is underperforming.',
      },
      {
        title: 'Driver vs Driver',
        description: 'Select any two drivers and compare their full season stats: total points, average finish, qualifying gap, race pace, sector strengths, and head-to-head win/loss record.',
        lookFor: 'The qualifying gap tells you the raw pace difference. The race pace gap tells you who manages tyres and traffic better.',
      },
      {
        title: 'Sector Strength Comparison',
        description: 'Compare each driver\'s sector performance across the season. Highlights which driver is faster in each sector type — S1 (top speed), S2 (downforce), S3 (traction).',
        lookFor: 'A driver consistently faster in S3 (usually traction-dependent) vs S1 (usually top-speed dependent) reveals driving style bias.',
      },
    ],
  },
  {
    title: 'Teams Page',
    icon: '🏭',
    sections: [
      {
        title: 'Team Overview',
        description: 'Profile card for each constructor with their driver lineup, engine supplier, base location, and 2026 season stats including points, wins, podiums, and DNFs.',
        lookFor: 'Which teams score most points at which circuit types (street, power, high-downforce). Useful for betting on upcoming races.',
      },
      {
        title: 'Technical Development',
        description: 'Teams bring upgrades throughout the season. This section logs when upgrades were introduced and how track performance changed afterwards.',
        lookFor: 'Correlation between upgrade packages and performance jumps. Some teams\' upgrades work immediately, others take a race or two to optimise.',
      },
    ],
  },
];

function CollapsibleGuideCard({ category }: { category: GuideCategory }) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/20 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{category.icon}</span>
          <h2 className="font-semibold text-base">{category.title}</h2>
          <Badge variant="secondary" className="text-[10px] ml-1">
            {category.sections.length} {category.sections.length === 1 ? 'feature' : 'features'}
          </Badge>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {open && (
        <div className="border-t border-border">
          {category.sections.map((section, idx) => (
            <div
              key={idx}
              className="p-4 border-b border-border last:border-b-0 hover:bg-muted/10 transition-colors"
            >
              <h3 className="font-medium text-sm mb-1">{section.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                {section.description}
              </p>
              <div className="flex items-start gap-1.5 text-xs text-amber-500 dark:text-amber-400">
                <span className="font-medium shrink-0">💡 Look for:</span>
                <span>{section.lookFor}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function GuidePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <BookOpen className="h-6 w-6 text-blue-500" />
        📖 How to Read the Analysis
      </h1>
      <p className="text-sm text-muted-foreground">
        A user guide to every section of the F1 Analysis platform. Click each category to expand
        and learn how to interpret the data.
      </p>
      <div className="space-y-4">
        {GUIDE_DATA.map((category, index) => (
          <CollapsibleGuideCard key={index} category={category} />
        ))}
      </div>
    </div>
  );
}
