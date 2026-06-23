from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List
from app.database import get_supabase_client
from supabase import Client
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/locations", tags=["locations"])

class CountryResponse(BaseModel):
    id: str
    code: str
    name_ru: str
    name_en: str

class CityResponse(BaseModel):
    id: str
    country_id: str
    name_ru: str
    name_en: str

@router.get("/countries", response_model=List[CountryResponse])
async def get_countries(supabase: Client = Depends(get_supabase_client)):
    """Get all available countries."""
    try:
        response = supabase.table("countries").select("*").eq("code", "CZ").order("name_ru").execute()
        return response.data or []
    except Exception as e:
        logger.error(f"Error fetching countries: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch countries")

@router.get("/countries/{country_id}/cities", response_model=List[CityResponse])
async def get_cities_by_country(country_id: str, supabase: Client = Depends(get_supabase_client)):
    """Get all cities for a specific country."""
    try:
        response = supabase.table("cities").select("*").eq("country_id", country_id).order("name_ru").execute()
        return response.data or []
    except Exception as e:
        logger.error(f"Error fetching cities for country {country_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch cities")

@router.get("/cities", response_model=List[CityResponse])
async def get_all_cities(supabase: Client = Depends(get_supabase_client)):
    """Get all cities (useful for global lookup)."""
    try:
        response = supabase.table("cities").select("*").order("name_ru").execute()
        return response.data or []
    except Exception as e:
        logger.error(f"Error fetching all cities: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch cities")
