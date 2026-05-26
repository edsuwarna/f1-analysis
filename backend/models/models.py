"""
F1 Analysis — SQLAlchemy ORM Models

Core schema for storing F1 session data: meetings, sessions, drivers,
laps, telemetry, stints, pit stops, weather, and race control messages.
"""

from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, BigInteger, String, Float, Boolean,
    DateTime, Date, Time, ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from backend.core.database import Base


class Meeting(Base):
    """A race weekend (e.g., 'Australian Grand Prix', 'Monaco Grand Prix')"""
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    meeting_key = Column(Integer, unique=True, nullable=False, comment="OpenF1 API meeting key")
    year = Column(Integer, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    official_name = Column(String(200))
    location = Column(String(100))
    country_code = Column(String(10))
    country_name = Column(String(100))
    circuit_name = Column(String(100))
    circuit_type = Column(String(50))
    date_start = Column(DateTime)
    date_end = Column(DateTime)
    gmt_offset = Column(String(10))
    is_cancelled = Column(Boolean, default=False)

    sessions = relationship("Session", back_populates="meeting", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_meetings_year_name", "year", "name"),
    )


class Circuit(Base):
    """Circuit information"""
    __tablename__ = "circuits"

    id = Column(Integer, primary_key=True, autoincrement=True)
    circuit_key = Column(Integer, unique=True, nullable=False)
    circuit_short_name = Column(String(100))
    country_code = Column(String(10))


class Session(Base):
    """A single session within a race weekend (FP1, Qualifying, Race, etc.)"""
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_key = Column(Integer, unique=True, nullable=False, comment="OpenF1 API session key")
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False, index=True)
    session_type = Column(String(30), nullable=False)  # Practice, Qualifying, Race, Sprint
    session_name = Column(String(50))  # "Practice 1", "Qualifying", "Race"
    date_start = Column(DateTime)
    date_end = Column(DateTime)

    meeting = relationship("Meeting", back_populates="sessions")
    laps = relationship("Lap", back_populates="session", cascade="all, delete-orphan")
    stints = relationship("Stint", back_populates="session", cascade="all, delete-orphan")
    pit_stops = relationship("PitStop", back_populates="session", cascade="all, delete-orphan")
    weather_records = relationship("Weather", back_populates="session", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_sessions_meeting_type", "meeting_id", "session_type"),
    )


class SessionDriver(Base):
    """Drivers participating in a session"""
    __tablename__ = "session_drivers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False, index=True)
    driver_number = Column(Integer, nullable=False)
    broadcast_name = Column(String(50))
    full_name = Column(String(100))
    name_acronym = Column(String(5))
    team_name = Column(String(100))
    team_colour = Column(String(10))
    headshot_url = Column(String(500))
    country_code = Column(String(10))

    __table_args__ = (
        UniqueConstraint("session_id", "driver_number", name="uq_session_driver"),
    )


class Lap(Base):
    """Individual lap data with sector times"""
    __tablename__ = "laps"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False, index=True)
    driver_number = Column(Integer, nullable=False)
    lap_number = Column(Integer, nullable=False)
    duration_sector_1 = Column(Float, comment="Sector 1 time in seconds")
    duration_sector_2 = Column(Float, comment="Sector 2 time in seconds")
    duration_sector_3 = Column(Float, comment="Sector 3 time in seconds")
    lap_duration = Column(Float, comment="Total lap time in seconds")
    is_personal_best = Column(Boolean)
    is_valid = Column(Boolean)
    compound = Column(String(30), comment="Tyre compound: SOFT, MEDIUM, HARD, INTERMEDIATE, WET")
    tyre_age = Column(Integer, comment="Laps on current tyre")
    position = Column(Integer, comment="Race position at lap end")
    speed_fl = Column(Float, comment="Speed at finish line (km/h)")
    speed_straight = Column(Float, comment="Speed on main straight (km/h)")
    lap_number_sprint = Column(Integer)

    session = relationship("Session", back_populates="laps")

    __table_args__ = (
        Index("idx_laps_session_driver", "session_id", "driver_number"),
        Index("idx_laps_session_lap", "session_id", "lap_number"),
    )


class Telemetry(Base):
    """High-frequency car telemetry data (time-series)"""
    __tablename__ = "telemetry"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False, index=True)
    driver_number = Column(Integer, nullable=False)
    lap_number = Column(Integer)
    timestamp = Column(Float, comment="Session time in seconds")
    speed = Column(Float, comment="Speed in km/h")
    rpm = Column(Integer, comment="Engine RPM")
    gear = Column(Integer, comment="Current gear (1-8)")
    throttle = Column(Float, comment="Throttle position 0-100%")
    brake = Column(Float, comment="Brake pressure 0-100%")
    drs = Column(Boolean, comment="DRS active or not")
    x = Column(Float, comment="Track X coordinate")
    y = Column(Float, comment="Track Y coordinate")

    __table_args__ = (
        Index("idx_telemetry_session_driver_lap", "session_id", "driver_number", "lap_number"),
        Index("idx_telemetry_ts", "session_id", "timestamp"),
    )


class Stint(Base):
    """Tyre stint information"""
    __tablename__ = "stints"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False, index=True)
    driver_number = Column(Integer, nullable=False)
    stint_number = Column(Integer, nullable=False)
    compound = Column(String(30), nullable=False)
    tyre_age_at_start = Column(Integer, default=0)
    lap_start = Column(Integer)
    lap_end = Column(Integer)
    total_laps = Column(Integer)
    fresh_tyre = Column(Boolean)

    session = relationship("Session", back_populates="stints")

    __table_args__ = (
        UniqueConstraint("session_id", "driver_number", "stint_number", name="uq_stint"),
    )


class PitStop(Base):
    """Pit stop events"""
    __tablename__ = "pit_stops"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False, index=True)
    driver_number = Column(Integer, nullable=False)
    lap_number = Column(Integer, nullable=False)
    pit_duration = Column(Float, comment="Total pit stop time in seconds")
    lane_duration = Column(Float, comment="Time in pit lane in seconds")
    stop_duration = Column(Float, comment="Actual stop time (jacking) in seconds")
    compound_in = Column(String(30))
    compound_out = Column(String(30))
    timestamp = Column(DateTime)

    session = relationship("Session", back_populates="pit_stops")


class Weather(Base):
    """Weather conditions during a session (time-series)"""
    __tablename__ = "weather"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False, index=True)
    timestamp = Column(Float, comment="Session time in seconds")
    air_temp = Column(Float, comment="Air temperature in Celsius")
    track_temp = Column(Float, comment="Track temperature in Celsius")
    humidity = Column(Integer, comment="Humidity percentage")
    pressure = Column(Float, comment="Air pressure in hPa")
    wind_speed = Column(Float, comment="Wind speed in m/s")
    wind_direction = Column(Integer, comment="Wind direction in degrees")
    rainfall = Column(Boolean, comment="Rain falling or not")

    session = relationship("Session", back_populates="weather_records")


class RaceControl(Base):
    """Race control messages (flags, SC, VSC, penalties)"""
    __tablename__ = "race_control_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False, index=True)
    lap_number = Column(Integer)
    category = Column(String(50))  # Flag, SafetyCar, Penalty, etc.
    flag = Column(String(10))  # YELLOW, RED, GREEN, etc.
    scope = Column(String(30))  # Driver, Track, Sector
    sector = Column(Integer)
    driver_number = Column(Integer)
    message = Column(String(500))
    timestamp = Column(DateTime)
