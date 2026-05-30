"""
Multiviewer API proxy — circuit track map data.
Proxies api.multiviewer.app to avoid CORS issues from the frontend.
"""

import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

MULTIVIEWER_BASE = "https://api.multiviewer.app/api/v1"


@router.get("/circuits/{circuit_key}/multiviewer")
async def get_circuit_multiviewer(circuit_key: int, year: int = 2026):
    """Fetch circuit track data (coordinates, corners, sectors) from Multiviewer API."""
    url = f"{MULTIVIEWER_BASE}/circuits/{circuit_key}/{year}"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url)

    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail="Circuit not found in Multiviewer")

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail="Multiviewer API error")

    data = resp.json()

    # Return only what the frontend needs
    return {
        "circuit_key": data.get("circuitKey"),
        "circuit_name": data.get("circuitName"),
        "x": data.get("x", []),
        "y": data.get("y", []),
        "corners": [
            {
                "number": c.get("number"),
                "angle": c.get("angle"),
                "x": c.get("trackPosition", {}).get("x"),
                "y": c.get("trackPosition", {}).get("y"),
            }
            for c in data.get("corners", [])
            if c.get("trackPosition")
        ],
        "mini_sectors": data.get("miniSectorsIndexes", []),
        "rotation": data.get("rotation"),
    }


@router.get("/circuits")
async def list_multiviewer_circuits():
    """List all circuits available in Multiviewer."""
    url = f"{MULTIVIEWER_BASE}/circuits"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url)

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail="Multiviewer API error")

    return resp.json()
