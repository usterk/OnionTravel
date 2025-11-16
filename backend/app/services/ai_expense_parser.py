"""
AI Expense Parser Service

Handles voice-to-expense conversion using OpenAI models:
1. Transcription: gpt-4o-mini-transcribe (Whisper)
2. Parsing: gpt-5-mini with retry logic and escalating reasoning effort
"""

import os
import base64
import json
from typing import Optional, Tuple
from openai import OpenAI
from app.schemas.ai_expense import ParsedExpenseData
from app.config import settings


class AIExpenseParserError(Exception):
    """Custom exception for AI parsing errors"""
    pass


class AIExpenseParser:
    """Service for parsing voice expenses using OpenAI API"""

    def __init__(self):
        """Initialize OpenAI client"""
        self.api_key = settings.OPENAI_API_KEY
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY environment variable not set")

        self.client = OpenAI(api_key=self.api_key)

        # Model configuration
        self.transcription_model = "gpt-4o-mini-transcribe"
        self.parsing_models = [
            {"name": "gpt-5-mini", "reasoning_effort": "minimal"},  # Try 1
            {"name": "gpt-5-mini", "reasoning_effort": "low"},      # Try 2
            {"name": "gpt-5-mini", "reasoning_effort": "medium"},   # Try 3
            {"name": "gpt-5", "reasoning_effort": None},            # Try 4 (no reasoning param for full model)
        ]

    def transcribe_audio(self, audio_base64: str) -> str:
        """
        Transcribe audio to text using OpenAI Whisper (gpt-4o-mini-transcribe).

        Args:
            audio_base64: Base64 encoded audio file (webm, mp3, wav, etc.)

        Returns:
            Transcribed text

        Raises:
            AIExpenseParserError: If transcription fails
        """
        try:
            # Decode base64 audio
            # Handle data URL format: "data:audio/webm;base64,..."
            mime_type = "audio/webm"  # default
            if "," in audio_base64:
                # Extract MIME type from data URL
                header = audio_base64.split(",")[0]
                if ":" in header and ";" in header:
                    mime_type = header.split(":")[1].split(";")[0]
                audio_base64 = audio_base64.split(",")[1]

            audio_bytes = base64.b64decode(audio_base64)

            # Determine file extension from MIME type
            extension_map = {
                "audio/webm": ".webm",
                "audio/mp4": ".mp4",
                "audio/m4a": ".m4a",
                "audio/ogg": ".ogg",
                "audio/mpeg": ".mp3",
                "audio/wav": ".wav",
            }

            # Get extension, fallback to .webm
            file_extension = extension_map.get(mime_type, ".webm")

            # Save temporarily to file (OpenAI API requires file-like object)
            import tempfile
            with tempfile.NamedTemporaryFile(suffix=file_extension, delete=False) as temp_audio:
                temp_audio.write(audio_bytes)
                temp_audio_path = temp_audio.name

            try:
                # Call OpenAI Whisper API
                with open(temp_audio_path, "rb") as audio_file:
                    transcription = self.client.audio.transcriptions.create(
                        model=self.transcription_model,
                        file=audio_file,
                        response_format="text"
                    )

                return transcription.strip()

            finally:
                # Clean up temp file
                import os as os_module
                try:
                    os_module.unlink(temp_audio_path)
                except:
                    pass

        except Exception as e:
            raise AIExpenseParserError(f"Transcription failed: {str(e)}")

    def parse_expense_from_text(
        self,
        transcribed_text: str,
        trip_currency: str,
        categories: list[dict],
        retry_attempt: int = 0
    ) -> ParsedExpenseData:
        """
        Parse transcribed text to structured expense data using GPT models.

        Args:
            transcribed_text: Text from voice transcription
            trip_currency: Default currency code for the trip
            categories: List of available categories with id, name, color
            retry_attempt: Current retry attempt (0-3)

        Returns:
            ParsedExpenseData object

        Raises:
            AIExpenseParserError: If parsing fails after all retries
        """
        if retry_attempt >= len(self.parsing_models):
            raise AIExpenseParserError(
                f"Max retries ({len(self.parsing_models)}) exceeded for expense parsing"
            )

        model_config = self.parsing_models[retry_attempt]
        model_name = model_config["name"]
        reasoning_effort = model_config["reasoning_effort"]

        # Build prompt with context
        prompt = self._build_parsing_prompt(
            transcribed_text,
            trip_currency,
            categories
        )

        try:
            # Call OpenAI Chat API
            messages = [
                {
                    "role": "system",
                    "content": "You are an expert expense parser. Extract structured expense data from voice transcriptions. Always return valid JSON only, no explanations."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]

            # Build API call parameters
            api_params = {
                "model": model_name,
                "messages": messages,
                "max_completion_tokens": 500,
            }

            # Only add temperature for models that support it (not gpt-5-mini/gpt-5)
            # These newer models only support default temperature of 1
            if not model_name.startswith("gpt-5"):
                api_params["temperature"] = 0.1

            # Add reasoning_effort only for models that support it
            if reasoning_effort:
                api_params["reasoning_effort"] = reasoning_effort

            completion = self.client.chat.completions.create(**api_params)

            # Extract response
            response_text = completion.choices[0].message.content.strip()

            # Parse JSON response
            parsed_json = self._extract_json_from_response(response_text)

            # Match category name to category ID
            if "category_name" in parsed_json and parsed_json["category_name"]:
                category_id = self._match_category(
                    parsed_json["category_name"],
                    categories
                )
                parsed_json["category_id"] = category_id

            # Validate and create ParsedExpenseData
            parsed_data = ParsedExpenseData(**parsed_json)

            # Ensure currency is uppercase
            parsed_data.currency_code = parsed_data.currency_code.upper()

            return parsed_data

        except Exception as e:
            # If parsing failed and we have retries left, raise for retry
            if retry_attempt < len(self.parsing_models) - 1:
                raise AIExpenseParserError(
                    f"Parsing attempt {retry_attempt + 1} failed: {str(e)}. Retrying with higher reasoning..."
                )
            else:
                raise AIExpenseParserError(f"All parsing attempts failed: {str(e)}")

    def _build_parsing_prompt(
        self,
        transcribed_text: str,
        trip_currency: str,
        categories: list[dict]
    ) -> str:
        """Build the parsing prompt with context"""

        # Format categories list for prompt
        categories_text = "\n".join([
            f"  - {cat['name']} (ID: {cat['id']})"
            for cat in categories
        ])

        prompt = f"""Parse the following voice transcription into a structured expense.

TRIP CONTEXT:
- Default currency: {trip_currency}
- Available categories:
{categories_text}

TRANSCRIPTION:
"{transcribed_text}"

INSTRUCTIONS:
1. Extract expense title (brief, descriptive)
2. Extract amount as a number (e.g., 45.50, not "45 dollars")
3. Detect currency code (ISO 3-letter code like USD, EUR, PLN)
   - If not mentioned, use trip currency: {trip_currency}
   - Common currencies: USD ($), EUR (€), GBP (£), PLN (zł)
4. Match to most appropriate category from the list above
   - Use "category_name" field with exact category name from list
5. Extract optional: location, notes/description

EXAMPLE OUTPUT (JSON only, no markdown):
{{
  "title": "Lunch at restaurant",
  "amount": 45.50,
  "currency_code": "USD",
  "category_name": "Food & Dining",
  "location": "Downtown Rome",
  "notes": "Nice Italian place, pasta carbonara"
}}

CRITICAL:
- Return ONLY valid JSON, no markdown code blocks, no explanations
- Use exact category names from the list above
- Amount must be a number, not a string
- Currency code must be 3 letters (ISO 4217)

OUTPUT (JSON only):"""

        return prompt

    def _extract_json_from_response(self, response_text: str) -> dict:
        """Extract JSON from response, handling markdown code blocks"""
        # Remove markdown code blocks if present
        text = response_text.strip()

        # Remove ```json ... ``` or ``` ... ```
        if text.startswith("```"):
            lines = text.split("\n")
            # Remove first line (```json or ```)
            lines = lines[1:]
            # Remove last line (```)
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines).strip()

        # Parse JSON
        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            raise AIExpenseParserError(f"Invalid JSON response: {str(e)}\nResponse: {text}")

    def _match_category(self, category_name: str, categories: list[dict]) -> Optional[int]:
        """
        Match category name (AI suggested) to category ID.

        Uses fuzzy matching to handle variations.
        """
        category_name_lower = category_name.lower().strip()

        # Exact match first
        for cat in categories:
            if cat["name"].lower() == category_name_lower:
                return cat["id"]

        # Fuzzy match (contains)
        for cat in categories:
            if category_name_lower in cat["name"].lower() or cat["name"].lower() in category_name_lower:
                return cat["id"]

        # Default to first category if no match (should not happen with good AI)
        if categories:
            return categories[0]["id"]

        return None


# Singleton instance
_parser_instance = None


def get_ai_parser() -> AIExpenseParser:
    """Get or create singleton AIExpenseParser instance"""
    global _parser_instance
    if _parser_instance is None:
        _parser_instance = AIExpenseParser()
    return _parser_instance
