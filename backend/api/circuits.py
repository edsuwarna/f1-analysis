"""Circuit information — descriptions, images, facts for each F1 circuit."""
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


CIRCUITS: dict[str, CircuitInfo] = {
    "Melbourne": {
        "name": "Albert Park Circuit",
        "location": "Melbourne",
        "country": "Australia",
        "length_km": 5.278,
        "turns": 14,
        "drs_zones": 4,
        "lap_record": "1:19.813",
        "lap_record_driver": "Charles Leclerc",
        "lap_record_year": 2024,
        "opened": 1996,
        "description": "A temporary street circuit winding around Albert Park lake, just south of Melbourne's CBD. Known for its high-speed corners and overtaking opportunities, particularly into Turn 1 and Turn 9.",
        "fun_fact": "The circuit was originally used as a public road and parkland. It's one of the fastest street circuits on the calendar, with average speeds over 230 km/h.",
        "image_url": "https://media.formula1.com/image/upload/f_auto,c_fill,q_auto,w_1320,g_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Australia_Circuit.png",
        "flag_url": "https://flagcdn.com/w40/au.png",
        "map_url": "https://media.formula1.com/image/upload/f_auto,c_fill,q_auto,w_1320,g_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Australia_Circuit.png",
    },
    "Shanghai": {
        "name": "Shanghai International Circuit",
        "location": "Shanghai",
        "country": "China",
        "length_km": 5.451,
        "turns": 16,
        "drs_zones": 2,
        "lap_record": "1:32.238",
        "lap_record_driver": "Michael Schumacher",
        "lap_record_year": 2004,
        "opened": 2004,
        "description": "A modern Hermann Tilke-designed circuit featuring one of the most unique corner sequences in F1 — the spiralling Turn 1-2 complex that goes over and under the main straight.",
        "fun_fact": "The circuit is shaped like the Chinese character '上' (shàng), meaning 'above' or 'up', which is the first character in Shanghai's name.",
        "image_url": "https://media.formula1.com/image/upload/f_auto,c_fill,q_auto,w_1320,g_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/China_Circuit.png",
        "flag_url": "https://flagcdn.com/w40/cn.png",
        "map_url": "https://media.formula1.com/image/upload/f_auto,c_fill,q_auto,w_1320,g_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/China_Circuit.png",
    },
    "Suzuka": {
        "name": "Suzuka International Racing Course",
        "location": "Suzuka",
        "country": "Japan",
        "length_km": 5.807,
        "turns": 18,
        "drs_zones": 2,
        "lap_record": "1:30.983",
        "lap_record_driver": "Lewis Hamilton",
        "lap_record_year": 2019,
        "opened": 1962,
        "description": "A legendary figure-eight circuit beloved by drivers for its challenging high-speed corners, including the famous 130R and Spoon Curve. One of the most technically demanding tracks on the calendar.",
        "fun_fact": "Suzuka is the only figure-eight circuit on the F1 calendar — the track crosses over itself via a bridge. It was originally built as a Honda test track.",
        "image_url": "https://media.formula1.com/image/upload/f_auto,c_fill,q_auto,w_1320,g_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Japan_Circuit.png",
        "flag_url": "https://flagcdn.com/w40/jp.png",
        "map_url": "https://media.formula1.com/image/upload/f_auto,c_fill,q_auto,w_1320,g_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Japan_Circuit.png",
    },
    "Jeddah": {
        "name": "Jeddah Corniche Circuit",
        "location": "Jeddah",
        "country": "Saudi Arabia",
        "length_km": 6.174,
        "turns": 27,
        "drs_zones": 3,
        "lap_record": "1:30.734",
        "lap_record_driver": "Lewis Hamilton",
        "lap_record_year": 2021,
        "opened": 2021,
        "description": "The fastest street circuit on the F1 calendar, winding through the Jeddah Corniche along the Red Sea. Features the most corners of any track (27) and the longest straights.",
        "fun_fact": "At 6.174 km, it's the second-longest circuit on the calendar and the fastest street circuit ever, with average speeds exceeding 250 km/h.",
        "image_url": "https://media.formula1.com/image/upload/f_auto,c_fill,q_auto,w_1320,g_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Saudi_Arabia_Circuit.png",
        "flag_url": "https://flagcdn.com/w40/sa.png",
        "map_url": "https://media.formula1.com/image/upload/f_auto,c_fill,q_auto,w_1320,g_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Saudi_Arabia_Circuit.png",
    },
    "Sakhir": {
        "name": "Bahrain International Circuit",
        "location": "Sakhir",
        "country": "Bahrain",
        "length_km": 5.412,
        "turns": 15,
        "drs_zones": 3,
        "lap_record": "1:31.447",
        "lap_record_driver": "Pedro de la Rosa",
        "lap_record_year": 2005,
        "opened": 2004,
        "description": "A sprawling desert circuit in the Sakhir desert, known for its long straights, heavy braking zones, and the challenging Turn 10 complex. Usually hosts the season opener.",
        "fun_fact": "The circuit was built in just 16 months and features a unique 'Endurance Village' with underground garages. Night races are held under 495 floodlights.",
        "image_url": "https://media.formula1.com/image/upload/f_auto,c_fill,q_auto,w_1320,g_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Bahrain_Circuit.png",
        "flag_url": "https://flagcdn.com/w40/bh.png",
        "map_url": "https://media.formula1.com/image/upload/f_auto,c_fill,q_auto,w_1320,g_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Bahrain_Circuit.png",
    },
    "Miami": {
        "name": "Miami International Autodrome",
        "location": "Miami Gardens",
        "country": "United States",
        "length_km": 5.412,
        "turns": 19,
        "drs_zones": 3,
        "lap_record": "1:29.708",
        "lap_record_driver": "Max Verstappen",
        "lap_record_year": 2023,
        "opened": 2022,
        "description": "A purpose-built circuit around the Hard Rock Stadium complex in Miami Gardens. Features a unique marina chicane and the stadium-adjacent 'campus' section.",
        "fun_fact": "Part of the circuit runs through the Hard Rock Stadium's parking lot and around a fake marina. The 'beach' section features real sand imported for race weekend.",
        "image_url": "https://media.formula1.com/image/upload/f_auto,c_fill,q_auto,w_1320,g_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Miami_Circuit.png",
        "flag_url": "https://flagcdn.com/w40/us.png",
        "map_url": "https://media.formula1.com/image/upload/f_auto,c_fill,q_auto,w_1320,g_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Miami_Circuit.png",
    },
    "Montreal": {
        "name": "Circuit Gilles Villeneuve",
        "location": "Montréal",
        "country": "Canada",
        "length_km": 4.361,
        "turns": 14,
        "drs_zones": 2,
        "lap_record": "1:13.078",
        "lap_record_driver": "Valtteri Bottas",
        "lap_record_year": 2019,
        "opened": 1978,
        "description": "A fast, temporary circuit on Île Notre-Dame in the St. Lawrence River. Features the famous 'Wall of Champions' at the final chicane and long straights with heavy braking zones.",
        "fun_fact": "Named after Canadian F1 legend Gilles Villeneuve. The 'Wall of Champions' earned its name after Damon Hill, Jacques Villeneuve, and Michael Schumacher all crashed there in 1999.",
        "image_url": "https://media.formula1.com/image/upload/f_auto,c_fill,q_auto,w_1320,g_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Canada_Circuit.png",
        "flag_url": "https://flagcdn.com/w40/ca.png",
        "map_url": "https://media.formula1.com/image/upload/f_auto,c_fill,q_auto,w_1320,g_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Canada_Circuit.png",
    },
    "Monte Carlo": {
        "name": "Circuit de Monaco",
        "location": "Monte Carlo",
        "country": "Monaco",
        "length_km": 3.337,
        "turns": 19,
        "drs_zones": 1,
        "lap_record": "1:10.166",
        "lap_record_driver": "Lewis Hamilton",
        "lap_record_year": 2023,
        "opened": 1929,
        "description": "The most famous and prestigious circuit in motorsport. A narrow, unforgiving street circuit winding through the streets of Monte Carlo. Requires maximum precision — there's zero room for error.",
        "fun_fact": "Despite being the shortest circuit on the calendar (3.337 km), Monaco is the most difficult to overtake on. It takes more steering wheel turns per lap than any other track — over 3,000!",
        "image_url": "https://media.formula1.com/image/upload/f_auto,c_fill,q_auto,w_1320,g_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Monaco_Circuit.png",
        "flag_url": "https://flagcdn.com/w40/mc.png",
        "map_url": "https://media.formula1.com/image/upload/f_auto,c_fill,q_auto,w_1320,g_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Monaco_Circuit.png",
    },
    "Barcelona": {
        "name": "Circuit de Barcelona-Catalunya",
        "location": "Barcelona",
        "country": "Spain",
        "length_km": 4.657,
        "turns": 16,
        "drs_zones": 2,
        "lap_record": "1:16.330",
        "lap_record_driver": "Max Verstappen",
        "lap_record_year": 2023,
        "opened": 1991,
        "description": "A well-balanced circuit used extensively for pre-season testing. Features a mix of high and low-speed corners, with the challenging Turn 9 (Campsa) being a true test of car balance.",
        "fun_fact": "Barcelona's layout is considered the most 'complete' test of a Formula 1 car — almost every type of corner exists here. That's why teams have done the most testing laps here of any circuit.",
        "image_url": "https://media.formula1.com/image/upload/f_auto,c_fill,q_auto,w_1320,g_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Spain_Circuit.png",
        "flag_url": "https://flagcdn.com/w40/es.png",
        "map_url": "https://media.formula1.com/image/upload/f_auto,c_fill,q_auto,w_1320,g_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Spain_Circuit.png",
    },
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
