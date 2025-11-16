"""
AI Expenses API Endpoints

Handles voice-to-expense conversion using AI.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.trip import Trip
from app.schemas.ai_expense import (
    VoiceExpenseRequest,
    VoiceExpenseResponse,
    AIParsingStatus,
    ParsedExpenseData
)
from app.schemas.expense import ExpenseCreate, ExpenseResponse
from app.services.ai_expense_parser import get_ai_parser, AIExpenseParserError
from app.services import expense_service
from app.api.deps import get_current_user


router = APIRouter()


def get_trip_or_404(db: Session, trip_id: int, user: User) -> Trip:
    """
    Get trip by ID or raise 404.
    Also verifies that the user has access to this trip.

    Args:
        db: Database session
        trip_id: Trip ID
        user: Current user

    Returns:
        Trip object

    Raises:
        HTTPException: If trip not found or user has no access
    """
    from app.services.trip import TripService

    trip_service = TripService(db)
    trip = trip_service.get_trip_by_id(trip_id)
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )

    if not trip_service.user_has_access_to_trip(trip_id, user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this trip"
        )

    return trip


@router.post(
    "/trips/{trip_id}/expenses/voice-parse",
    response_model=list[ExpenseResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Parse voice input and create expense(s) using AI",
    responses={
        201: {"description": "Expense(s) created successfully from voice input"},
        400: {"description": "Invalid audio or parsing failed"},
        403: {"description": "Access denied to trip"},
        404: {"description": "Trip not found"},
        500: {"description": "AI service error"}
    }
)
async def parse_and_create_voice_expense(
    trip_id: int,
    request: VoiceExpenseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Parse voice input and automatically create one or more expenses using AI.

    This endpoint:
    1. Transcribes audio to text using OpenAI Whisper (gpt-4o-mini-transcribe)
    2. Parses text to structured expense data using GPT models with retry logic
    3. Detects multiple items if separate prices are mentioned
    4. Automatically creates expense(s) in the database
    5. Returns list of created expense(s)

    **Multiple Items Support:**
    - Separate prices → Multiple expenses (e.g., "milk for 5 PLN and bread for 3 PLN")
    - Combined price → Single expense (e.g., "milk and bread for 8 PLN")

    **Language Preservation:**
    - Keeps title, notes, location in the same language as spoken
    - Does NOT translate to English

    **Retry Logic:**
    - Attempt 1: gpt-5-mini (reasoning: minimal)
    - Attempt 2: gpt-5-mini (reasoning: low)
    - Attempt 3: gpt-5-mini (reasoning: medium)
    - Attempt 4: gpt-5 (full model)

    **Required:**
    - `audio_base64`: Base64 encoded audio file (webm, mp3, wav, etc.)
    - `expense_date`: Date for the expense (YYYY-MM-DD)

    **Response:**
    - Returns list of created expense objects (1 or more)
    """

    # Verify access to trip
    trip = get_trip_or_404(db, trip_id, current_user)

    # Get trip categories for AI context
    from app.services import category_service
    categories = category_service.get_categories_by_trip(db, trip_id)

    if not categories:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trip has no categories. Please create categories first."
        )

    # Format categories for AI
    categories_data = [
        {
            "id": cat.id,
            "name": cat.name,
            "color": cat.color
        }
        for cat in categories
    ]

    # Get AI parser
    try:
        ai_parser = get_ai_parser()
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI service not configured: {str(e)}"
        )

    # Step 1: Transcribe audio
    try:
        transcribed_text = ai_parser.transcribe_audio(request.audio_base64)
    except AIExpenseParserError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Transcription failed: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcription error: {str(e)}"
        )

    # Step 2: Parse expense(s) with retry logic
    parsed_expenses_list = None
    last_error = None
    max_retries = 4

    for retry_attempt in range(max_retries):
        try:
            parsed_expenses_list = ai_parser.parse_expense_from_text(
                transcribed_text=transcribed_text,
                trip_currency=trip.currency_code,
                categories=categories_data,
                retry_attempt=retry_attempt
            )
            # Success! Break out of retry loop
            break
        except AIExpenseParserError as e:
            last_error = str(e)
            # Continue to next retry if available
            if retry_attempt < max_retries - 1:
                continue
            else:
                # All retries exhausted
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to parse expense after {max_retries} attempts: {last_error}"
                )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Parsing error: {str(e)}"
            )

    # Validate that we have parsed data
    if not parsed_expenses_list or len(parsed_expenses_list) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to parse expense from voice input"
        )

    # Step 3: Create all expenses in database
    created_expenses = []
    try:
        for parsed_data in parsed_expenses_list:
            # Validate category ID
            if not parsed_data.category_id:
                # Fallback to first category if AI couldn't match
                parsed_data.category_id = categories[0].id

            expense_create = ExpenseCreate(
                title=parsed_data.title,
                amount=parsed_data.amount,
                currency_code=parsed_data.currency_code,
                category_id=parsed_data.category_id,
                start_date=request.expense_date,
                end_date=None,  # Single-day expense
                notes=parsed_data.notes,
                location=parsed_data.location,
                payment_method=None,  # Not extracted from voice
                description=None
            )

            created_expense = await expense_service.create_expense(
                db=db,
                trip_id=trip_id,
                user_id=current_user.id,
                expense_data=expense_create
            )

            created_expenses.append(created_expense)

        # Commit all expenses at once
        db.commit()

        # Refresh all created expenses
        for expense in created_expenses:
            db.refresh(expense)

        return created_expenses

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create expense(s): {str(e)}"
        )
