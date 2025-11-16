from pydantic import BaseModel, Field
from datetime import date
from typing import Optional
from enum import Enum


class AIParsingStatus(str, Enum):
    """Status of AI parsing process"""
    TRANSCRIBING = "transcribing"
    PARSING = "parsing"
    RETRYING = "retrying"
    SUCCESS = "success"
    ERROR = "error"


class VoiceExpenseRequest(BaseModel):
    """Schema for voice expense parsing request"""
    audio_base64: str = Field(..., description="Base64 encoded audio file")
    expense_date: date = Field(..., description="Date for the expense")

    class Config:
        json_schema_extra = {
            "example": {
                "audio_base64": "data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC...",
                "expense_date": "2025-01-15"
            }
        }


class ParsedExpenseData(BaseModel):
    """Schema for AI-parsed expense data (single item)"""
    title: str = Field(..., min_length=1, max_length=255)
    amount: float = Field(..., gt=0)
    currency_code: str = Field(..., min_length=3, max_length=3)
    category_id: Optional[int] = None
    category_name: Optional[str] = None  # AI suggests category name, we'll match to ID
    notes: Optional[str] = None
    location: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Lunch at Italian restaurant",
                "amount": 45.50,
                "currency_code": "USD",
                "category_name": "Food & Dining",
                "notes": "Nice pasta carbonara",
                "location": "Downtown Rome"
            }
        }


class ParsedExpensesData(BaseModel):
    """Schema for AI-parsed expense data (supports multiple items)"""
    expenses: list[ParsedExpenseData] = Field(..., min_items=1, description="List of parsed expenses (1 or more)")

    class Config:
        json_schema_extra = {
            "example": {
                "expenses": [
                    {
                        "title": "Mleko",
                        "amount": 5.0,
                        "currency_code": "PLN",
                        "category_name": "Shopping",
                        "notes": None,
                        "location": "Biedronka"
                    },
                    {
                        "title": "Chleb",
                        "amount": 3.0,
                        "currency_code": "PLN",
                        "category_name": "Shopping",
                        "notes": None,
                        "location": "Biedronka"
                    }
                ]
            }
        }


class VoiceExpenseResponse(BaseModel):
    """Schema for voice expense parsing response"""
    status: AIParsingStatus
    transcribed_text: Optional[str] = None
    parsed_data: Optional[ParsedExpenseData] = None
    error_message: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 4

    class Config:
        json_schema_extra = {
            "example": {
                "status": "success",
                "transcribed_text": "I paid 45 dollars for lunch at a nice Italian restaurant in downtown Rome",
                "parsed_data": {
                    "title": "Lunch at Italian restaurant",
                    "amount": 45.50,
                    "currency_code": "USD",
                    "category_name": "Food & Dining",
                    "notes": "Nice pasta carbonara",
                    "location": "Downtown Rome"
                },
                "retry_count": 0,
                "max_retries": 4
            }
        }


class AIProcessingStep(BaseModel):
    """Schema for real-time AI processing step updates"""
    step: str = Field(..., description="Current processing step")
    status: AIParsingStatus
    message: str
    retry_attempt: Optional[int] = None

    class Config:
        json_schema_extra = {
            "example": {
                "step": "transcription",
                "status": "transcribing",
                "message": "Transcribing audio with Whisper...",
                "retry_attempt": None
            }
        }
