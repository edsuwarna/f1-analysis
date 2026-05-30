"""Circuit information — descriptions, images, facts for each F1 circuit.

All circuits from the current F1 calendar. Circuit maps are rendered by the
frontend CircuitMap component from coordinate data (no external image dependencies).
"""
from typing import TypedDict


class CircuitInfo(TypedDict):
    name: str
    location: str
    country: str
    length_km: float
    turns: int
    drs_zones: int
    lap_record: str
    lap_record_driver: str
    lap_record_year: int
    opened: int
    description: str
    fun_fact: str
    image_url: str
    flag_url: str
    map_url: str


# Helper to build consistent URL references
_FLAG = "https://flagcdn.com/w40/{}.png"
_MAP = "/circuits/{}.svg"  # Frontend CircuitMap matches by name, not by file


def _circuit(name: str, loc: str, country: str, code: str,
             length: float, turns: int, drs: int,
             lap_rec: str, lap_rec_drv: str, lap_rec_yr: int,
             opened: int, desc: str, fun: str) -> CircuitInfo:
    key = name.lower().replace(" ", "-").replace("é", "e").replace("à", "a")
    return CircuitInfo(
        name=name,
        location=loc,
        country=country,
        length_km=length,
        turns=turns,
        drs_zones=drs,
        lap_record=lap_rec,
        lap_record_driver=lap_rec_drv,
        lap_record_year=lap_rec_yr,
        opened=opened,
        description=desc,
        fun_fact=fun,
        image_url=_MAP.format(key),
        flag_url=_FLAG.format(code),
        map_url=_MAP.format(key),
    )


CIRCUITS: dict[str, CircuitInfo] = {
    "Melbourne": _circuit(
        "Albert Park Circuit", "Melbourne", "Australia", "au",
        5.278, 14, 4, "1:19.813", "Charles Leclerc", 2024, 1996,
        "A temporary street circuit winding around Albert Park lake, just south of Melbourne's CBD. "
        "Known for its high-speed corners and overtaking opportunities, particularly into Turn 1 and Turn 9.",
        "The circuit was originally a public road and parkland. It's one of the fastest street circuits "
        "on the calendar, with average speeds over 230 km/h.",
    ),
    "Shanghai": _circuit(
        "Shanghai International Circuit", "Shanghai", "China", "cn",
        5.451, 16, 2, "1:32.238", "Michael Schumacher", 2004, 2004,
        "A modern Hermann Tilke-designed circuit featuring one of the most unique corner sequences in F1 — "
        "the spiralling Turn 1-2 complex that goes over and under the main straight.",
        "The circuit is shaped like the Chinese character '上' (shàng), meaning 'above' or 'up', "
        "which is the first character in Shanghai's name.",
    ),
    "Sakhir": _circuit(
        "Bahrain International Circuit", "Sakhir", "Bahrain", "bh",
        5.412, 15, 3, "1:31.447", "Pedro de la Rosa", 2005, 2004,
        "A sprawling desert circuit in the Sakhir desert, known for its long straights, heavy braking zones, "
        "and the challenging Turn 10 complex. Usually hosts the season opener.",
        "Built in just 16 months. Night races are held under 495 floodlights. It features a unique "
        "'Endurance Village' with underground garages.",
    ),
    "Jeddah": _circuit(
        "Jeddah Corniche Circuit", "Jeddah", "Saudi Arabia", "sa",
        6.174, 27, 3, "1:30.734", "Lewis Hamilton", 2021, 2021,
        "The fastest street circuit on the F1 calendar, winding through the Jeddah Corniche along the Red Sea. "
        "Features the most corners of any track (27) and the longest straights.",
        "At 6.174 km, it's the second-longest circuit on the calendar and the fastest street circuit ever, "
        "with average speeds exceeding 250 km/h.",
    ),
    "Miami": _circuit(
        "Miami International Autodrome", "Miami Gardens", "United States", "us",
        5.412, 19, 3, "1:29.708", "Max Verstappen", 2023, 2022,
        "A purpose-built circuit around the Hard Rock Stadium complex in Miami Gardens. "
        "Features a unique marina chicane and the stadium-adjacent 'campus' section.",
        "Part of the circuit runs through the Hard Rock Stadium's parking lot and around a fake marina. "
        "The 'beach' section features real sand imported for race weekend.",
    ),
    "Imola": _circuit(
        "Autodromo Enzo e Dino Ferrari", "Imola", "Italy", "it",
        4.909, 19, 1, "1:15.484", "Lewis Hamilton", 2020, 1953,
        "A historic circuit in the Emilia-Romagna region, known for its high-speed corners like Tamburello, "
        "Villeneuve, and the sweeping Piratella. One of the most challenging tracks on the calendar.",
        "The circuit is named after Enzo Ferrari and his son Dino. It was the site of Ayrton Senna's tragic "
        "accident in 1994, leading to major safety improvements across the sport.",
    ),
    "Monte Carlo": _circuit(
        "Circuit de Monaco", "Monte Carlo", "Monaco", "mc",
        3.337, 19, 1, "1:10.166", "Lewis Hamilton", 2023, 1929,
        "The most famous and prestigious circuit in motorsport. A narrow, unforgiving street circuit "
        "winding through the streets of Monte Carlo. Requires maximum precision — there's zero room for error.",
        "Despite being the shortest circuit on the calendar (3.337 km), Monaco is the most difficult to "
        "overtake on. It takes over 3,000 steering wheel turns per lap — more than any other track!",
    ),
    "Barcelona": _circuit(
        "Circuit de Barcelona-Catalunya", "Barcelona", "Spain", "es",
        4.657, 16, 2, "1:16.330", "Max Verstappen", 2023, 1991,
        "A well-balanced circuit used extensively for pre-season testing. Features a mix of high and low-speed "
        "corners, with the challenging Turn 9 (Campsa) being a true test of car balance.",
        "Barcelona's layout is considered the most 'complete' test of an F1 car — almost every type of "
        "corner exists here. That's why teams do the most testing laps here of any circuit.",
    ),
    "Montreal": _circuit(
        "Circuit Gilles Villeneuve", "Montreal", "Canada", "ca",
        4.361, 14, 2, "1:13.078", "Valtteri Bottas", 2019, 1978,
        "A fast, temporary circuit on Île Notre-Dame in the St. Lawrence River. Features the famous "
        "'Wall of Champions' at the final chicane and long straights with heavy braking zones.",
        "Named after Canadian F1 legend Gilles Villeneuve. The 'Wall of Champions' earned its name after "
        "Damon Hill, Jacques Villeneuve, and Michael Schumacher all crashed there in 1999.",
    ),
    "Red Bull Ring": _circuit(
        "Red Bull Ring", "Spielberg", "Austria", "at",
        4.318, 10, 3, "1:02.693", "Lewis Hamilton", 2018, 1969,
        "A short, high-speed circuit set in the Styrian mountains. Known for its dramatic elevation changes, "
        "short lap times, and the tight Turn 9-10 complex that catches drivers out.",
        "Originally built as the Österreichring in 1969, it was one of the fastest circuits in F1 history. "
        "After a major redesign, it reopened in its current shorter form in 1997.",
    ),
    "Silverstone": _circuit(
        "Silverstone Circuit", "Silverstone", "Great Britain", "gb",
        5.891, 18, 2, "1:27.097", "Max Verstappen", 2020, 1948,
        "The historic home of the British Grand Prix, built on a former WWII airfield. Features iconic "
        "high-speed corners like Copse, Maggots, Becketts, and Chapel — one of the best sequences in F1.",
        "Silverstone was the first ever World Championship Grand Prix venue in 1950. The airfield runways "
        "are still visible in the circuit's original perimeter road layout.",
    ),
    "Hungaroring": _circuit(
        "Hungaroring", "Budapest", "Hungary", "hu",
        4.381, 14, 2, "1:16.627", "Lewis Hamilton", 2020, 1986,
        "A tight, twisty circuit located just outside Budapest. Known for its lack of long straights and "
        "overtaking opportunities — Monaco without the walls. A true driver's circuit.",
        "The Hungaroring was the first F1 circuit built behind the Iron Curtain. Its dusty surface early "
        "in the weekend and twisty layout make qualifying crucial.",
    ),
    "Spa": _circuit(
        "Circuit de Spa-Francorchamps", "Spa", "Belgium", "be",
        7.004, 19, 2, "1:46.286", "Valtteri Bottas", 2018, 1921,
        "The ultimate driver's circuit, winding through the Ardennes forest. Features the legendary Eau Rouge-Raidillon "
        "complex, the longest lap on the calendar, and constantly changing weather conditions.",
        "Spa is the longest circuit on the F1 calendar at 7.004 km. Eau Rouge corner is taken flat-out "
        "by modern F1 cars, subjecting drivers to over 4G of force.",
    ),
    "Zandvoort": _circuit(
        "Circuit Zandvoort", "Zandvoort", "Netherlands", "nl",
        4.259, 14, 2, "1:11.097", "Lewis Hamilton", 2021, 1948,
        "A classic circuit set in the North Sea dunes. Features the banked Turn 3 and Turn 14, making it "
        "unique among modern F1 tracks. The steep banking adds a new dimension to racing.",
        "The circuit's banked corners (up to 18° at Turn 3) were inspired by American oval tracks. "
        "The circuit was completely rebuilt in 2020 to bring it up to modern F1 standards.",
    ),
    "Monza": _circuit(
        "Autodromo Nazionale di Monza", "Monza", "Italy", "it",
        5.793, 11, 2, "1:21.046", "Lewis Hamilton", 2020, 1922,
        "The 'Temple of Speed' — the fastest circuit on the F1 calendar. Known for its long straights, "
        "high-speed corners like Parabolica, and the passionate tifosi crowd.",
        "Monza is one of the oldest circuits in the world (opened 1922) and has hosted more F1 races than "
        "any other venue. The old high-speed oval banking still stands as a historic monument.",
    ),
    "Baku": _circuit(
        "Baku City Circuit", "Baku", "Azerbaijan", "az",
        6.003, 20, 2, "1:43.009", "Charles Leclerc", 2019, 2016,
        "A unique street circuit winding through the narrow streets of Baku's old city before opening up "
        "onto a massive 2.2 km straight along the Caspian Sea. The tight castle section is notoriously unforgiving.",
        "The 2.2 km main straight is the longest on the F1 calendar. The castle section (Turns 8-12) is "
        "narrower than Monaco in places, creating an incredible contrast with the wide boulevards.",
    ),
    "Marina Bay": _circuit(
        "Marina Bay Street Circuit", "Singapore", "Singapore", "sg",
        4.940, 19, 3, "1:34.486", "Lewis Hamilton", 2023, 2008,
        "The original night race on the F1 calendar. A demanding street circuit winding through the "
        "Marina Bay area with stunning skyline views. High humidity and heat make it a physical challenge.",
        "F1's first fully night race, held under 1,500 floodlights that produce 3,000 lux — "
        "four times brighter than a typical stadium. The circuit requires 108,000 man-hours to set up.",
    ),
    "COTA": _circuit(
        "Circuit of the Americas", "Austin", "United States", "us",
        5.513, 20, 2, "1:36.169", "Charles Leclerc", 2024, 2012,
        "A modern American classic featuring a dramatic 40m uphill climb into the multi-apex Turn 1, "
        "a high-speed esses section inspired by Silverstone, and a stadium section around the amphitheatre.",
        "The 133-foot elevation drop from Turn 1 to Turn 11 is the second-largest on the F1 calendar. "
        "The circuit was designed to be a 'greatest hits' of the best corners from other tracks.",
    ),
    "Mexico City": _circuit(
        "Autódromo Hermanos Rodríguez", "Mexico City", "Mexico", "mx",
        4.304, 17, 3, "1:17.774", "Valtteri Bottas", 2021, 1963,
        "A high-altitude circuit (2,240m above sea level) in the Magdalena Mixhuca sports complex. "
        "Thin air reduces downforce and power, making it a unique challenge for cars and drivers.",
        "At 2,240 meters above sea level, the air is 22% thinner than at sea level, reducing engine power "
        "by about 30% and requiring significantly different aerodynamic setups from any other track.",
    ),
    "Interlagos": _circuit(
        "Autódromo José Carlos Pace", "São Paulo", "Brazil", "br",
        4.309, 15, 2, "1:10.540", "Valtteri Bottas", 2018, 1940,
        "A historic and demanding circuit located in São Paulo. Features the iconic Senna S complex, "
        "a challenging uphill section, and unpredictable weather that often produces classic races.",
        "The circuit runs counter-clockwise, one of only 5 on the F1 calendar. Its location near the "
        "Atlantic coast means weather can change from dry to torrential rain in minutes.",
    ),
    "Las Vegas": _circuit(
        "Las Vegas Strip Circuit", "Las Vegas", "United States", "us",
        6.201, 17, 3, "1:33.508", "Lando Norris", 2025, 2023,
        "A high-speed street circuit along the famous Las Vegas Strip. Features long straights past "
        "iconic casinos and hotels, with the race held at night under the bright lights of the Strip.",
        "The circuit passes the Bellagio, the Venetian, and the Wynn. The race starts at 10 PM local time "
        "to align with European viewership, making it the latest-starting F1 race ever.",
    ),
    "Lusail": _circuit(
        "Lusail International Circuit", "Lusail", "Qatar", "qa",
        5.380, 16, 2, "1:22.384", "Max Verstappen", 2024, 2004,
        "A modern floodlit circuit located north of Doha. Features a mix of medium and high-speed corners "
        "with multiple overtaking opportunities. The desert location creates unique track surface challenges.",
        "Originally built for MotoGP in 2004, the circuit was modified for F1 with reprofiled corners. "
        "The desert sand blowing onto the track creates a unique 'green' surface that evolves rapidly.",
    ),
    "Yas Marina": _circuit(
        "Yas Marina Circuit", "Abu Dhabi", "United Arab Emirates", "ae",
        5.281, 16, 2, "1:26.103", "Max Verstappen", 2021, 2009,
        "The season finale venue on Yas Island. Known for its stunning twilight-to-night transition, "
        "the hotel-flyover section at Turn 5, and the spectacular marina backdrop.",
        "The pit lane exit tunnel goes underneath the track. The circuit features one of the most "
        "impressive pit complexes in motorsport, with a glass-walled paddock overlooking the marina.",
    ),
    "Suzuka": _circuit(
        "Suzuka International Racing Course", "Suzuka", "Japan", "jp",
        5.807, 18, 2, "1:30.983", "Lewis Hamilton", 2019, 1962,
        "A legendary figure-8 circuit in the Mie Prefecture. The only track on the F1 calendar that crosses "
        "over itself, featuring the iconic high-speed 'S' Curves, the demanding Spoon Curve, "
        "and the famous 130R — one of the most thrilling corners in motorsport.",
        "Suzuka is the only figure-8 circuit in F1, where the track crosses over itself via a bridge. "
        "The circuit was originally built as a Honda test track in 1962 and has hosted the Japanese Grand Prix "
        "since 1987. Its unique layout makes it a true driver's circuit.",
    ),
    "Portimão": _circuit(
        "Autódromo Internacional do Algarve", "Portimão", "Portugal", "pt",
        4.653, 15, 3, "1:18.348", "Valtteri Bottas", 2021, 2008,
        "A modern roller-coaster circuit set in the hills of the Algarve. Features dramatic elevation "
        "changes, blind crests, and the challenging uphill Turn 1 that drops away on exit.",
        "The circuit has one of the largest elevation changes on the calendar, with a 38-metre difference "
        "between the highest and lowest points. Turn 1 is taken blind — drivers can't see the apex.",
    ),
}


def get_circuit_info(circuit_name: str) -> CircuitInfo | None:
    """Look up circuit info by name. Case-insensitive partial match."""
    if not circuit_name:
        return None

    # Direct match
    if circuit_name in CIRCUITS:
        return CIRCUITS[circuit_name]

    # Partial match (case-insensitive)
    cl = circuit_name.lower()
    for key, info in CIRCUITS.items():
        if cl in key.lower() or cl in info["name"].lower():
            return info
        if cl in info["location"].lower():
            return info
    return None


def list_circuits() -> list[str]:
    """Return list of available circuit names."""
    return list(CIRCUITS.keys())
