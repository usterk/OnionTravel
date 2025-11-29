import * as React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { getExpenseTitleSuggestions } from "@/lib/expenses-api"

export interface TitleAutocompleteProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  tripId: number;
  value: string;
  onChange: (value: string) => void;
}

const TitleAutocomplete = React.forwardRef<HTMLInputElement, TitleAutocompleteProps>(
  ({ className, tripId, value, onChange, disabled, ...props }, ref) => {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isLoading, setIsLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Merge refs
    const setRefs = useCallback((node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }, [ref]);

    // Fetch suggestions when value changes
    useEffect(() => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (!value || value.length < 1) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        setIsLoading(true);
        try {
          const results = await getExpenseTitleSuggestions(tripId, value, 8);
          // Filter out exact match to avoid showing the current value
          const filtered = results.filter(s => s.toLowerCase() !== value.toLowerCase());
          setSuggestions(filtered);
          setShowSuggestions(filtered.length > 0);
          setSelectedIndex(-1);
        } catch (error) {
          console.error('Failed to fetch title suggestions:', error);
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      }, 150);

      return () => {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
      };
    }, [tripId, value]);

    // Close suggestions when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setShowSuggestions(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions || suggestions.length === 0) {
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          break;
        case 'Enter':
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            e.preventDefault();
            selectSuggestion(suggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          setShowSuggestions(false);
          setSelectedIndex(-1);
          break;
      }
    };

    const selectSuggestion = (suggestion: string) => {
      onChange(suggestion);
      setShowSuggestions(false);
      setSelectedIndex(-1);
      inputRef.current?.focus();
    };

    const handleFocus = () => {
      if (value && suggestions.length > 0) {
        setShowSuggestions(true);
      }
    };

    return (
      <div ref={containerRef} className="relative">
        <input
          type="text"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={setRefs}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          disabled={disabled}
          autoComplete="off"
          {...props}
        />

        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion}
                className={cn(
                  "px-3 py-2 cursor-pointer text-sm",
                  index === selectedIndex
                    ? "bg-blue-50 text-blue-700"
                    : "hover:bg-gray-50"
                )}
                onClick={() => selectSuggestion(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {suggestion}
              </li>
            ))}
          </ul>
        )}

        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          </div>
        )}
      </div>
    );
  }
);

TitleAutocomplete.displayName = "TitleAutocomplete";

export { TitleAutocomplete };
