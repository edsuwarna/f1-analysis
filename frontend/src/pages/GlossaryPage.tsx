import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, ChevronDown, ChevronRight, BookText } from 'lucide-react';

interface GlossaryTerm {
  term: string;
  description: string;
}

interface GlossaryCategory {
  title: string;
  icon: string;
  terms: GlossaryTerm[];
}

const GLOSSARY_DATA: GlossaryCategory[] = [
  {
    title: 'Race Basics',
    icon: '🏎️',
    terms: [
      {
        term: 'Apex',
        description: 'The innermost point of a corner where the car comes closest to the inside kerb. Hitting the apex correctly is critical for carrying speed through the corner and setting up a good exit. Late apexing (touching the apex later in the corner) often provides a better exit speed onto straights.',
      },
      {
        term: 'Braking Point',
        description: 'The specific point on the track where a driver begins braking before a corner. Braking points shift throughout a race as fuel loads decrease and tyre grip degrades. Late braking is a key overtaking weapon but carries higher lock-up risk.',
      },
      {
        term: 'Delta',
        description: 'The time difference between two reference points — typically a driver\'s current lap time compared to their personal best, the leader\'s time, or a target time. Drivers are given "delta time" instructions during safety car periods to maintain the correct gap.',
      },
      {
        term: 'Active Aero',
        description: 'A 2026 regulations innovation allowing teams to switch between two pre-set rear wing configurations (high-downforce and low-downforce) on straights. Replaces the DRS system of previous regulations. Drivers can activate it via a steering wheel button in designated zones.',
      },
      {
        term: 'E-Boost',
        description: 'The 2026-era electrical energy deployment system that replaces the previous ERS overtake button. Drivers can deploy up to 350kW of electrical energy from the battery at specific track zones, providing a significant straight-line speed advantage for overtaking.',
      },
      {
        term: 'MGU-K',
        description: 'Motor Generator Unit - Kinetic. A component of the hybrid power unit that recovers kinetic energy from the rear axle during braking (acting as a generator) and deploys electrical energy to the crankshaft (acting as a motor). In the 2026 regulations, the MGU-K is more powerful and works in concert with Active Aero.',
      },
      {
        term: 'MGU-H',
        description: 'Motor Generator Unit - Heat. A component that recovers thermal energy from exhaust gases via a turbine and converts it to electricity. The MGU-H was removed from the 2026 regulations, simplifying the power unit and reducing complexity.',
      },
      {
        term: 'Z-Mode / X-Mode',
        description: 'Active Aero configurations on the rear wing introduced in 2026 regulations. Z-Mode is the high-downforce cornering configuration. X-Mode is the low-drag straight-line configuration. Drivers switch between them electronically in designated zones around the circuit.',
      },
      {
        term: 'Formation Lap',
        description: 'Also called the parade lap or warm-up lap. The single lap before the race start where drivers warm up their tyres and brakes, check systems, and form up on the grid. Overtaking is not permitted. A driver who stalls on the formation lap must start from the pit lane.',
      },
      {
        term: 'Grand Slam',
        description: 'Achieved when a driver takes pole position, wins the race, leads every single lap, and sets the fastest lap in the same Grand Prix weekend. It is the most dominant possible performance and a rare achievement in F1 history.',
      },
      {
        term: 'Hat-trick',
        description: 'In F1 terminology, a hat-trick is achieved when a driver takes pole position, wins the race, and sets the fastest lap in the same Grand Prix weekend. This is one step below a Grand Slam (which additionally requires leading every lap).',
      },
      {
        term: 'Marbles',
        description: 'Small balls of rubber that shed from tyre treads as they wear during a race. Marbles accumulate off the racing line, making those areas extremely slippery. Drivers who run wide onto marbles lose significant grip, which is why track limits are so punishing.',
      },
      {
        term: 'Racing Line',
        description: 'The theoretically fastest path around a circuit, determined by optimising entry speed, apex placement, and exit speed. The racing line is typically rubbered-in over a race weekend as more cars lay down rubber. Driving off the racing line means reduced grip from dust and marbles.',
      },
      {
        term: 'Sector',
        description: 'A circuit is divided into three sectors (S1, S2, S3) for timing and comparison purposes. Each sector\'s split time is measured at intermediate timing lines on the track. Sector times reveal where a driver is gaining or losing time relative to others.',
      },
      {
        term: 'Slipstream',
        description: 'Also called "drafting". The aerodynamic phenomenon where a following car enters the low-pressure wake of the car ahead, reducing drag and allowing higher straight-line speed. Slipstream effect is typically worth 0.3–0.5 seconds per lap on high-speed circuits. Essential for overtaking.',
      },
    ],
  },
  {
    title: 'Tyres & Strategy',
    icon: '🛞',
    terms: [
      {
        term: 'Compound',
        description: 'The specific rubber mixture used in a tyre. In 2026, Pirelli provides five dry compounds (C1 hardest to C5 softest) plus Intermediate and Wet tyres. Softer compounds offer more grip but wear faster. Each race weekend, three compounds are selected: Hard (white), Medium (yellow), and Soft (red).',
      },
      {
        term: 'Degradation',
        description: 'The rate at which tyre grip decreases over a stint. High degradation means lap times fall off quickly as the tyre overheats or wears. Managing degradation — keeping the tyres in the optimal temperature and pressure window — is a key driver skill that separates top drivers.',
      },
      {
        term: 'Graining',
        description: 'A tyre surface condition where small tears and rolls of rubber form on the tread surface due to the tyre sliding across the tarmac at a temperature slightly below optimal. Graining causes reduced grip and vibration. It can sometimes "clean off" if tyre temperatures rise or the surface rubber shears away.',
      },
      {
        term: 'Out Lap',
        description: 'The first lap after leaving the pit box. Out laps are typically slow as the driver warms up the new tyres and brakes. A good out lap is critical for an overcut strategy or qualifying runs — losing too much time on the out lap can negate the advantage of fresh tyres.',
      },
      {
        term: 'Overcut',
        description: 'A pit strategy where a driver stays out longer than a rival who has already pitted, attempting to set faster laps on older tyres while the rival is slowed by traffic and cold tyres on their out lap. If the overcutting driver gains enough time, they can pit and rejoin ahead of the rival.',
      },
      {
        term: 'Pit Window',
        description: 'The optimal range of laps in which to make a pit stop for tyre changes. The pit window opens when the current tyres begin degrading significantly, and closes when the time lost to pitting becomes greater than the time gained on fresh tyres.',
      },
      {
        term: 'Stint',
        description: 'A continuous period of driving between pit stops. A typical dry race has 2-3 stints (most commonly a 2-stop strategy). Stint length is determined by tyre degradation, fuel load, and track conditions. Each stint requires different management of the tyres.',
      },
      {
        term: 'Tyre Age',
        description: 'The number of laps a set of tyres has been used. Older tyres have less grip and are more prone to overheating and graining. Teams track tyre age meticulously because it directly affects pace and strategy decisions. Drivers often struggle to overtake on much older tyres.',
      },
      {
        term: 'Undercut',
        description: 'A pit strategy where a driver pits earlier than a rival ahead, puts in fast laps on fresh tyres while the rival is still on worn rubber, and reclaims the position when the rival eventually pits. The undercut typically requires 2-3 strong laps after the stop to work effectively.',
      },
      {
        term: 'Understeer',
        description: 'A handling condition where the front wheels lose grip before the rear, causing the car to "push" wide in corners (the driver turns the wheel but the car continues straight). Understeer costs lap time because the driver must lift off the throttle or brake earlier to make the corner.',
      },
      {
        term: 'Oversteer',
        description: 'A handling condition where the rear wheels lose grip before the front, causing the car\'s rear end to slide out in corners (the car "over-rotates"). Oversteer can be fast if controlled (rotation helps the car turn) but excessive oversteer causes slides that cost time and wear the rear tyres.',
      },
    ],
  },
  {
    title: 'Pit Stops',
    icon: '⛽',
    terms: [
      {
        term: 'Pit Stop',
        description: 'A scheduled stop where a car enters the pit lane to change tyres and/or make front wing adjustments. F1 pit stops typically take 2-3 seconds for a clean tyre change with 4 wheel guns operating simultaneously. The 2026 regulations mandate standardised wheel nut systems for safety.',
      },
      {
        term: 'Pit Loss',
        description: 'The total time lost by entering the pit lane, stopping, and rejoining the track — typically around 18-25 seconds depending on the circuit and pit lane speed limit. Pit loss determines whether a 2-stop strategy is viable compared to a 1-stop. Shorter pit lanes favour more stops.',
      },
      {
        term: 'Double Stack',
        description: 'When a team brings both cars into the pit lane on the same lap, servicing one immediately after the other. Double stacks are high-pressure situations requiring flawless coordination. The second car may have to wait if the first car\'s stop is delayed, losing valuable time.',
      },
      {
        term: 'Fastest Pit Stop',
        description: 'Awarded to the team that performs the quickest pit stop of the Grand Prix weekend. In the modern era, sub-2-second stops are common, with the record close to 1.8 seconds. The DHL Fastest Pit Stop Award tracks this across the season.',
      },
      {
        term: 'Safety Car',
        description: 'A high-performance road car (Aston Martin Vantage in 2026) deployed to neutralise the race when there is a dangerous obstruction or inclement weather. All drivers must slow down and follow the safety car in order, closing up the field. Safety car periods create strategic opportunities for "free" pit stops.',
      },
    ],
  },
  {
    title: 'Telemetry & Data',
    icon: '📊',
    terms: [
      {
        term: 'Sector Time',
        description: 'The time taken to complete one of the three sectors of a circuit. Sector times are measured at intermediate timing loops. Analysing sector splits reveals exactly where on the circuit a driver is gaining or losing time compared to a reference lap.',
      },
      {
        term: 'Telemetry',
        description: 'The stream of real-time data transmitted from the car to the pit wall via radio telemetry. Includes speed, throttle position, brake pressure, steering angle, gear, temperatures, pressures, and suspension loads. Engineers use telemetry to analyse driver performance and car behaviour in extreme detail.',
      },
      {
        term: 'Lap Time',
        description: 'The total time taken to complete one full lap of the circuit. Lap times are the fundamental performance metric. They are influenced by car setup, tyre condition, fuel load, driver skill, track temperature, and traffic. A single lap time must be considered in context of these variables.',
      },
      {
        term: 'Speed Trap',
        description: 'A timing loop placed on the longest straight of the circuit that measures each car\'s maximum speed. Speed trap data reveals the top-speed hierarchy — which teams have the lowest drag and/or highest power. It is the primary metric for comparing engine performance and aerodynamic efficiency.',
      },
      {
        term: 'Braking Point Analysis',
        description: 'The study of where and how each driver brakes, measured via brake pressure sensors and GPS. Key metrics include: speed at braking point, brake pressure applied (as percentage), duration of braking, and minimum corner speed. Later braking usually means faster lap times but higher risk.',
      },
      {
        term: 'Cornering Analysis',
        description: 'Detailed analysis of car behaviour through corners using telemetry data. Metrics include minimum corner speed, throttle application point, steering angle, and yaw rate. Corner exit speed is often more important than entry speed for overall lap time.',
      },
    ],
  },
  {
    title: 'Technical Terms',
    icon: '🔧',
    terms: [
      {
        term: 'DRS',
        description: 'Drag Reduction System — a rear wing flap that opens to reduce drag on straights, increasing top speed by approximately 10-12 km/h. Replaced by Active Aero in the 2026 regulations, but still relevant for understanding historic data and driver overtaking stats from previous seasons.',
      },
      {
        term: 'ERS',
        description: 'Energy Recovery System — the hybrid system that captures and stores energy from braking (MGU-K) and exhaust heat (MGU-H in pre-2026 regs) in a battery. The stored energy is then deployed for extra power (around 160hp in pre-2026, up to 350kW in 2026 regs) for overtaking or defensive driving.',
      },
      {
        term: 'KERS',
        description: 'Kinetic Energy Recovery System — the precursor to modern ERS, introduced in 2009. KERS recovered kinetic energy from braking and stored it in a battery or flywheel for a limited power boost per lap. It was simpler and less powerful than current ERS systems.',
      },
      {
        term: 'Diffuser',
        description: 'An aerodynamic device at the rear of the car\'s floor that accelerates air underneath the car, creating low pressure (downforce). The diffuser is a critical part of the ground-effect aerodynamics that returned in 2022 regulations. A well-designed diffuser generates substantial downforce with relatively low drag.',
      },
      {
        term: 'Floor',
        description: 'The flat underside of the car, which in ground-effect F1 cars is shaped to create a low-pressure zone that sucks the car to the track. The floor generates the majority of the car\'s total downforce. The 2022+ regulations simplified floor edges to reduce outwash and make racing closer.',
      },
      {
        term: 'Front Wing',
        description: 'The wing at the front of the car that generates downforce and directs airflow around the front wheels and to the rest of the car. The front wing is the first aerodynamic surface to encounter clean air — it sets up the flow structure for the entire car. Adjustable elements are used for fine-tuning balance.',
      },
      {
        term: 'Rear Wing',
        description: 'The wing at the rear of the car that generates downforce on the rear axle. Works in conjunction with the diffuser. In 2026, the rear wing incorporates Active Aero (Z-Mode / X-Mode) flaps that change configuration on straights for reduced drag. The rear wing is also the location of DRS in pre-2026 cars.',
      },
      {
        term: 'Halo',
        description: 'The titanium survival cell protection structure mounted above the cockpit. Mandatory since 2018, the Halo can withstand the weight of a double-decker bus and has saved multiple drivers from serious injury or death in crashes involving airborne cars, debris, and wheel-to-wheel contacts.',
      },
      {
        term: 'PU',
        description: 'Power Unit — the complete engine system including the internal combustion engine (ICE), turbocharger, MGU-K, MGU-H (pre-2026), battery (ES), and control electronics (CE). In 2026, the PU retains the V6 turbo hybrid architecture but with increased electrical power, sustainable fuels, and removed MGU-H.',
      },
      {
        term: 'Gearbox',
        description: 'The sequential semi-automatic transmission that transfers power from the engine to the rear wheels. F1 gearboxes have 8 forward gears (reduced from 8 in older regulations to 6 in 2026 but currently 8 in 2026) and 1 reverse. Gear ratios are fixed for the season with limited changes allowed. Gearbox lifespan regulations require them to last multiple race weekends.',
      },
      {
        term: 'Hydraulics',
        description: 'The system that powers the gearshift actuation, clutch, throttle, differential, and sometimes steering assistance using high-pressure hydraulic fluid. Hydraulic failures are race-ending and often cause spectacular retirements as the car loses gear selection and power delivery capabilities.',
      },
    ],
  },
];

function CollapsibleGlossaryCategory({ category, searchQuery }: { category: GlossaryCategory; searchQuery: string }) {
  const [open, setOpen] = useState(true);

  const filteredTerms = useMemo(() => {
    if (!searchQuery.trim()) return category.terms;
    const q = searchQuery.toLowerCase();
    return category.terms.filter(
      (t) =>
        t.term.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
    );
  }, [category.terms, searchQuery]);

  if (filteredTerms.length === 0) return null;

  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 text-left cursor-pointer hover:text-foreground transition-colors"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="text-lg">{category.icon}</span>
        <h2 className="font-semibold text-base">
          {category.title}
          <span className="text-xs font-normal text-muted-foreground ml-2">
            ({filteredTerms.length} {filteredTerms.length === 1 ? 'term' : 'terms'})
          </span>
        </h2>
      </button>

      {open && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-6">
          {filteredTerms.map((item, idx) => (
            <Card key={idx} className="p-3">
              <h3 className="font-bold text-sm mb-1">{item.term}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GlossaryPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <BookText className="h-6 w-6 text-emerald-500" />
        📚 F1 Glossary
      </h1>
      <p className="text-sm text-muted-foreground">
        A comprehensive glossary of Formula 1 terminology — from technical systems and
        aerodynamic concepts to strategy terms and race weekend jargon.
      </p>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search terms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-5">
        {GLOSSARY_DATA.map((category, index) => (
          <CollapsibleGlossaryCategory
            key={index}
            category={category}
            searchQuery={searchQuery}
          />
        ))}
        {searchQuery && (
          <div className="text-center text-sm text-muted-foreground py-4">
            {GLOSSARY_DATA.every(
              (cat) =>
                !cat.terms.some(
                  (t) =>
                    t.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    t.description.toLowerCase().includes(searchQuery.toLowerCase())
                )
            ) && (
              <span>
                No terms match "{searchQuery}". Try a different search term.
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
