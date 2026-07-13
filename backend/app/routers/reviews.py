from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.database import get_async_supabase_client
from supabase._async.client import AsyncClient

router = APIRouter(prefix="/api/reviews", tags=["Reviews"])

class ReviewCreate(BaseModel):
    rating: int
    text: Optional[str] = None

class ReviewResponse(BaseModel):
    id: str
    rating: int
    text: Optional[str]
    created_at: str
    client_name: Optional[str] = None

@router.post("/{session_id}")
async def create_review(
    session_id: str,
    data: ReviewCreate,
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    """Client creates a review for a completed session."""
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    try:
        # Check if session exists and is completed
        session_res = await supabase.table("master_sessions").select("*, master_clients(client_id)").eq("id", session_id).single().execute()
        
        if not session_res.data:
            raise HTTPException(status_code=404, detail="Session not found")
            
        session = session_res.data
        if session.get("status") != "completed":
            raise HTTPException(status_code=400, detail="Can only review completed sessions")

        master_id = session.get("master_id")
        # Ensure we don't duplicate
        existing_review = await supabase.table("master_reviews").select("id").eq("session_id", session_id).execute()
        if existing_review.data:
            raise HTTPException(status_code=400, detail="Review already exists for this session")

        # Insert review
        review_data = {
            "master_id": master_id,
            "session_id": session_id,
            "rating": data.rating,
            "text": data.text
        }
        
        # If the client is registered, link their ID. master_clients might have a linked user_id in the future.
        # For now we leave client_id null for anonymous/guest clients.
        
        res = await supabase.table("master_reviews").insert(review_data).execute()
        
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create review")
            
        return res.data[0]
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
