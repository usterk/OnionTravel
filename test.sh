#!/bin/bash

# OnionTravel Test Runner
# Intelligent test runner that manages application lifecycle

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.run.pid"
BACKEND_PORT=7001
FRONTEND_PORT=7000

# Test reports configuration
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
REPORTS_DIR="$SCRIPT_DIR/test-reports"
BACKEND_REPORTS_DIR="$REPORTS_DIR/backend"
FRONTEND_REPORTS_DIR="$REPORTS_DIR/frontend"
E2E_REPORTS_DIR="$REPORTS_DIR/e2e"

# Create reports directories
mkdir -p "$BACKEND_REPORTS_DIR"
mkdir -p "$FRONTEND_REPORTS_DIR"
mkdir -p "$E2E_REPORTS_DIR"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# State tracking
APP_WAS_RUNNING=false
TEMP_BACKEND_PID=""
TEMP_FRONTEND_PID=""
STARTED_SERVICES=false

# Test results
BACKEND_TESTS_PASSED=false
FRONTEND_TESTS_PASSED=false
E2E_TESTS_PASSED=false

# Test statistics
BACKEND_PASSED=0
BACKEND_FAILED=0
BACKEND_TOTAL=0
BACKEND_REPORT_PATH=""

FRONTEND_PASSED=0
FRONTEND_FAILED=0
FRONTEND_TOTAL=0
FRONTEND_REPORT_PATH=""

E2E_PASSED=0
E2E_FAILED=0
E2E_TOTAL=0
E2E_REPORT_PATH=""

# Function to check if process is running
is_process_running() {
    local pid=$1
    if [ -z "$pid" ]; then
        return 1
    fi
    kill -0 "$pid" 2>/dev/null
    return $?
}

# Function to check if port is in use
is_port_in_use() {
    local port=$1
    lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1
    return $?
}

# Function to check if application is running via PID file
check_app_running() {
    if [ -f "$PID_FILE" ]; then
        local backend_pid=$(sed -n '1p' "$PID_FILE" 2>/dev/null)
        local frontend_pid=$(sed -n '2p' "$PID_FILE" 2>/dev/null)

        if is_process_running "$backend_pid" && is_process_running "$frontend_pid"; then
            APP_WAS_RUNNING=true
            return 0
        fi
    fi
    return 1
}

# Cleanup function for temporary services
cleanup_temp_services() {
    if [ "$STARTED_SERVICES" = true ] && [ "$APP_WAS_RUNNING" = false ]; then
        echo ""
        echo -e "${YELLOW}Cleaning up temporary services...${NC}"

        if [ -n "$TEMP_BACKEND_PID" ] && is_process_running "$TEMP_BACKEND_PID"; then
            echo -e "${BLUE}Stopping temporary backend (PID: $TEMP_BACKEND_PID)...${NC}"
            kill -TERM $TEMP_BACKEND_PID 2>/dev/null || true
            wait $TEMP_BACKEND_PID 2>/dev/null || true
        fi

        if [ -n "$TEMP_FRONTEND_PID" ] && is_process_running "$TEMP_FRONTEND_PID"; then
            echo -e "${BLUE}Stopping temporary frontend (PID: $TEMP_FRONTEND_PID)...${NC}"
            kill -TERM $TEMP_FRONTEND_PID 2>/dev/null || true
            wait $TEMP_FRONTEND_PID 2>/dev/null || true
        fi

        # Kill any remaining processes on ports
        lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
        lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true

        echo -e "${GREEN}✓ Temporary services stopped${NC}"
    fi
}

# Set up trap for cleanup
trap cleanup_temp_services EXIT INT TERM

# Function to start temporary backend
start_temp_backend() {
    if is_port_in_use $BACKEND_PORT; then
        echo -e "${GREEN}✓ Backend already running on port $BACKEND_PORT${NC}"
        return 0
    fi

    echo -e "${BLUE}Starting temporary backend on port $BACKEND_PORT...${NC}"
    cd "$SCRIPT_DIR/backend"

    if [ ! -d "venv" ]; then
        echo -e "${RED}Error: Backend venv not found. Run ./run.sh first to set up.${NC}"
        exit 1
    fi

    source venv/bin/activate
    uvicorn app.main:app --host 0.0.0.0 --port $BACKEND_PORT > /dev/null 2>&1 &
    TEMP_BACKEND_PID=$!

    # Wait for backend to be ready
    echo -e "${YELLOW}Waiting for backend to be ready...${NC}"
    local retries=30
    while [ $retries -gt 0 ]; do
        if curl -s http://localhost:$BACKEND_PORT/docs > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Backend ready (PID: $TEMP_BACKEND_PID)${NC}"
            return 0
        fi
        sleep 1
        retries=$((retries - 1))
    done

    echo -e "${RED}Error: Backend failed to start${NC}"
    exit 1
}

# Function to start temporary frontend
start_temp_frontend() {
    if is_port_in_use $FRONTEND_PORT; then
        echo -e "${GREEN}✓ Frontend already running on port $FRONTEND_PORT${NC}"
        return 0
    fi

    echo -e "${BLUE}Starting temporary frontend on port $FRONTEND_PORT...${NC}"
    cd "$SCRIPT_DIR/frontend"

    if [ ! -d "node_modules" ]; then
        echo -e "${RED}Error: Frontend node_modules not found. Run ./run.sh first to set up.${NC}"
        exit 1
    fi

    npm run dev > /dev/null 2>&1 &
    TEMP_FRONTEND_PID=$!

    # Wait for frontend to be ready
    echo -e "${YELLOW}Waiting for frontend to be ready...${NC}"
    local retries=60
    while [ $retries -gt 0 ]; do
        if curl -s http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Frontend ready (PID: $TEMP_FRONTEND_PID)${NC}"
            return 0
        fi
        sleep 1
        retries=$((retries - 1))
    done

    echo -e "${RED}Error: Frontend failed to start${NC}"
    exit 1
}

# Function to run backend tests
run_backend_tests() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}🧪 Running Backend Tests (pytest)${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    cd "$SCRIPT_DIR/backend"
    source venv/bin/activate

    # Set up report paths
    local html_report="$BACKEND_REPORTS_DIR/${TIMESTAMP}_pytest.html"
    local log_file="$BACKEND_REPORTS_DIR/${TIMESTAMP}_pytest.log"
    local json_report="$BACKEND_REPORTS_DIR/${TIMESTAMP}_pytest.json"

    BACKEND_REPORT_PATH="$html_report"

    # Run tests with reports
    if [ "$1" = "--coverage" ]; then
        pytest tests/ --cov=app --cov-report=term --cov-report=html:htmlcov \
            --html="$html_report" --self-contained-html \
            --json-report --json-report-file="$json_report" \
            2>&1 | tee "$log_file"
    else
        pytest tests/ -v \
            --html="$html_report" --self-contained-html \
            --json-report --json-report-file="$json_report" \
            2>&1 | tee "$log_file"
    fi

    local exit_code=$?

    # Parse JSON report for statistics
    if [ -f "$json_report" ]; then
        BACKEND_TOTAL=$(python3 -c "import json; data=json.load(open('$json_report')); print(data['summary']['total'])" 2>/dev/null || echo "0")
        BACKEND_PASSED=$(python3 -c "import json; data=json.load(open('$json_report')); print(data['summary'].get('passed', 0))" 2>/dev/null || echo "0")
        BACKEND_FAILED=$(python3 -c "import json; data=json.load(open('$json_report')); print(data['summary'].get('failed', 0))" 2>/dev/null || echo "0")
    fi

    if [ $exit_code -eq 0 ]; then
        BACKEND_TESTS_PASSED=true
        echo ""
        echo -e "${GREEN}✓ Backend tests passed${NC}"
    else
        echo ""
        echo -e "${RED}✗ Backend tests failed${NC}"
        return 1
    fi
}

# Function to run frontend tests
run_frontend_tests() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}🧪 Running Frontend Tests (vitest)${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    cd "$SCRIPT_DIR/frontend"

    # Set up report paths
    local json_report="$FRONTEND_REPORTS_DIR/${TIMESTAMP}_vitest.json"
    local log_file="$FRONTEND_REPORTS_DIR/${TIMESTAMP}_vitest.log"

    FRONTEND_REPORT_PATH="$log_file"

    # Run tests with reports
    if [ "$1" = "--coverage" ]; then
        npx vitest run --coverage --reporter=json --outputFile="$json_report" 2>&1 | tee "$log_file"
    else
        npx vitest run --reporter=json --outputFile="$json_report" 2>&1 | tee "$log_file"
    fi

    local exit_code=$?

    # Parse JSON report for statistics
    if [ -f "$json_report" ]; then
        FRONTEND_TOTAL=$(python3 -c "import json; data=json.load(open('$json_report')); print(data.get('numTotalTests', 0))" 2>/dev/null || echo "0")
        FRONTEND_PASSED=$(python3 -c "import json; data=json.load(open('$json_report')); print(data.get('numPassedTests', 0))" 2>/dev/null || echo "0")
        FRONTEND_FAILED=$(python3 -c "import json; data=json.load(open('$json_report')); print(data.get('numFailedTests', 0))" 2>/dev/null || echo "0")
    fi

    if [ $exit_code -eq 0 ]; then
        FRONTEND_TESTS_PASSED=true
        echo ""
        echo -e "${GREEN}✓ Frontend tests passed${NC}"
    else
        echo ""
        echo -e "${RED}✗ Frontend tests failed${NC}"
        return 1
    fi
}

# Function to run E2E tests
run_e2e_tests() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}🧪 Running E2E Tests (playwright)${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # E2E tests require both backend and frontend
    if ! check_app_running && ! is_port_in_use $BACKEND_PORT; then
        echo -e "${YELLOW}E2E tests require backend - starting temporarily...${NC}"
        start_temp_backend
        STARTED_SERVICES=true
    fi

    if ! check_app_running && ! is_port_in_use $FRONTEND_PORT; then
        echo -e "${YELLOW}E2E tests require frontend - starting temporarily...${NC}"
        start_temp_frontend
        STARTED_SERVICES=true
    fi

    cd "$SCRIPT_DIR/frontend"

    # Set up report paths
    local html_report_dir="$E2E_REPORTS_DIR/${TIMESTAMP}_playwright"
    local json_report="$E2E_REPORTS_DIR/${TIMESTAMP}_playwright.json"
    local log_file="$E2E_REPORTS_DIR/${TIMESTAMP}_playwright.log"

    E2E_REPORT_PATH="$html_report_dir/index.html"

    # Run tests with HTML reporter (no interactive server)
    # PLAYWRIGHT_HTML_OPEN=never prevents the server from starting
    PLAYWRIGHT_HTML_REPORT="$html_report_dir" \
        PLAYWRIGHT_HTML_OPEN=never \
        npx playwright test --reporter=html \
        2>&1 | tee "$log_file"

    local exit_code=$?

    # Parse log file for statistics (count passed/failed from output)
    if [ -f "$log_file" ]; then
        # Parse from summary line like "20 passed (6.7m)" using sed (macOS compatible)
        E2E_PASSED=$(grep " passed" "$log_file" 2>/dev/null | tail -1 | sed -E 's/.*[^0-9]([0-9]+) passed.*/\1/' || echo "0")
        E2E_FAILED=$(grep " failed" "$log_file" 2>/dev/null | tail -1 | sed -E 's/.*[^0-9]([0-9]+) failed.*/\1/' || echo "0")

        # If parsing failed, default to 0
        [ -z "$E2E_PASSED" ] && E2E_PASSED=0
        [ -z "$E2E_FAILED" ] && E2E_FAILED=0

        E2E_TOTAL=$((E2E_PASSED + E2E_FAILED))
    fi

    # Create a simple JSON report for consistency
    cat > "$json_report" <<EOF
{
  "total": $E2E_TOTAL,
  "passed": $E2E_PASSED,
  "failed": $E2E_FAILED,
  "htmlReport": "$html_report_dir/index.html",
  "logFile": "$log_file"
}
EOF

    if [ $exit_code -eq 0 ]; then
        E2E_TESTS_PASSED=true
        echo ""
        echo -e "${GREEN}✓ E2E tests passed${NC}"
    else
        echo ""
        echo -e "${RED}✗ E2E tests failed${NC}"
        return 1
    fi
}

# Function to print test summary
print_summary() {
    echo ""
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${MAGENTA}📊 Test Summary - ${TIMESTAMP}${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Backend statistics
    if [ "$BACKEND_TESTS_PASSED" = true ] || [ "$BACKEND_TESTS_PASSED" = false ]; then
        if [ "$BACKEND_TESTS_PASSED" = true ]; then
            echo -e "${GREEN}✓ Backend Tests: PASSED${NC}"
        else
            echo -e "${RED}✗ Backend Tests: FAILED${NC}"
        fi
        echo -e "  ${CYAN}Total: ${BACKEND_TOTAL} | Passed: ${BACKEND_PASSED} | Failed: ${BACKEND_FAILED}${NC}"
        [ -n "$BACKEND_REPORT_PATH" ] && echo -e "  ${BLUE}Report: ${BACKEND_REPORT_PATH}${NC}"
        echo ""
    fi

    # Frontend statistics
    if [ "$FRONTEND_TESTS_PASSED" = true ] || [ "$FRONTEND_TESTS_PASSED" = false ]; then
        if [ "$FRONTEND_TESTS_PASSED" = true ]; then
            echo -e "${GREEN}✓ Frontend Tests: PASSED${NC}"
        else
            echo -e "${RED}✗ Frontend Tests: FAILED${NC}"
        fi
        echo -e "  ${CYAN}Total: ${FRONTEND_TOTAL} | Passed: ${FRONTEND_PASSED} | Failed: ${FRONTEND_FAILED}${NC}"
        [ -n "$FRONTEND_REPORT_PATH" ] && echo -e "  ${BLUE}Report: ${FRONTEND_REPORT_PATH}${NC}"
        echo ""
    fi

    # E2E statistics
    if [ "$E2E_TESTS_PASSED" = true ] || [ "$E2E_TESTS_PASSED" = false ]; then
        if [ "$E2E_TESTS_PASSED" = true ]; then
            echo -e "${GREEN}✓ E2E Tests: PASSED${NC}"
        else
            echo -e "${RED}✗ E2E Tests: FAILED${NC}"
        fi
        echo -e "  ${CYAN}Total: ${E2E_TOTAL} | Passed: ${E2E_PASSED} | Failed: ${E2E_FAILED}${NC}"
        [ -n "$E2E_REPORT_PATH" ] && echo -e "  ${BLUE}Report: ${E2E_REPORT_PATH}${NC}"
        echo ""
    fi

    # Overall total
    local total_all=$((BACKEND_TOTAL + FRONTEND_TOTAL + E2E_TOTAL))
    local passed_all=$((BACKEND_PASSED + FRONTEND_PASSED + E2E_PASSED))
    local failed_all=$((BACKEND_FAILED + FRONTEND_FAILED + E2E_FAILED))

    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${MAGENTA}Overall: ${total_all} tests | ${passed_all} passed | ${failed_all} failed${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Reports directory
    echo -e "${BLUE}All reports saved to: ${REPORTS_DIR}${NC}"

    # E2E report viewing instructions
    if [ "$E2E_TESTS_PASSED" = true ] || [ "$E2E_TESTS_PASSED" = false ]; then
        echo -e "${YELLOW}To view E2E HTML report: ${NC}npm run test:e2e:report"
    fi
    echo ""

    if [ "$BACKEND_TESTS_PASSED" = true ] && [ "$FRONTEND_TESTS_PASSED" = true ] && [ "$E2E_TESTS_PASSED" = true ]; then
        echo -e "${GREEN}🎉 All tests passed!${NC}"
        return 0
    else
        echo -e "${RED}❌ Some tests failed - check reports for details${NC}"
        return 1
    fi
}

# Function to show help
show_help() {
    echo -e "${BLUE}OnionTravel Test Runner${NC}"
    echo ""
    echo -e "${YELLOW}Usage:${NC}"
    echo "  ./test.sh [command] [options]"
    echo ""
    echo -e "${YELLOW}Commands:${NC}"
    echo "  backend       Run backend tests only (pytest)"
    echo "  frontend      Run frontend tests only (vitest)"
    echo "  e2e           Run E2E tests only (playwright)"
    echo "  all           Run all tests sequentially (default)"
    echo "  --help        Show this help message"
    echo ""
    echo -e "${YELLOW}Options:${NC}"
    echo "  --coverage    Generate coverage reports (for backend/frontend)"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  ./test.sh                    # Run all tests"
    echo "  ./test.sh backend            # Run only backend tests"
    echo "  ./test.sh backend --coverage # Run backend tests with coverage"
    echo "  ./test.sh e2e                # Run only E2E tests"
    echo ""
    echo -e "${YELLOW}Notes:${NC}"
    echo "  • Script automatically detects if app is running via ./run.sh"
    echo "  • If app is not running, temporary instances are started for tests"
    echo "  • E2E tests always require both backend and frontend running"
    echo "  • Temporary services are automatically cleaned up after tests"
    echo ""
}

# Main script
main() {
    local command="${1:-all}"
    local coverage_flag=""

    # Check for coverage flag
    if [ "$2" = "--coverage" ] || [ "$1" = "--coverage" ]; then
        coverage_flag="--coverage"
        [ "$1" = "--coverage" ] && command="all"
    fi

    # Handle help
    if [ "$command" = "--help" ] || [ "$command" = "-h" ]; then
        show_help
        exit 0
    fi

    echo -e "${BLUE}=== OnionTravel Test Runner ===${NC}"
    echo ""

    # Check application status
    if check_app_running; then
        echo -e "${GREEN}✓ Application is running (via ./run.sh)${NC}"
        echo -e "${BLUE}  Using existing instance for tests${NC}"
    else
        echo -e "${YELLOW}⚠ Application is not running${NC}"
        echo -e "${BLUE}  Will start temporary instances as needed${NC}"
    fi

    # Run tests based on command
    case "$command" in
        backend)
            run_backend_tests "$coverage_flag"
            ;;
        frontend)
            run_frontend_tests "$coverage_flag"
            ;;
        e2e)
            run_e2e_tests
            ;;
        all)
            local all_passed=true

            run_backend_tests "$coverage_flag" || all_passed=false
            run_frontend_tests "$coverage_flag" || all_passed=false
            run_e2e_tests || all_passed=false

            print_summary
            [ "$all_passed" = false ] && exit 1
            ;;
        *)
            echo -e "${RED}Error: Unknown command '$command'${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac

    echo ""
    echo -e "${GREEN}✨ Testing complete!${NC}"
}

# Run main function
main "$@"
