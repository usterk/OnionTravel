#!/bin/bash

# OnionTravel Startup Script
# Starts both backend and frontend with proper environment setup

set -e

# Configuration
BACKEND_PORT=7011
FRONTEND_PORT=7010
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# PID file location
PID_FILE="$SCRIPT_DIR/.run.pid"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# PIDs for cleanup
BACKEND_PID=""
FRONTEND_PID=""

# Function to check if process is running
is_process_running() {
    local pid=$1
    if [ -z "$pid" ]; then
        return 1
    fi
    kill -0 "$pid" 2>/dev/null
    return $?
}

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"

    if [ ! -z "$BACKEND_PID" ] && kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${BLUE}Stopping backend (PID: $BACKEND_PID)...${NC}"
        kill -TERM $BACKEND_PID 2>/dev/null || true
        wait $BACKEND_PID 2>/dev/null || true
    fi

    if [ ! -z "$FRONTEND_PID" ] && kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "${BLUE}Stopping frontend (PID: $FRONTEND_PID)...${NC}"
        kill -TERM $FRONTEND_PID 2>/dev/null || true
        wait $FRONTEND_PID 2>/dev/null || true
    fi

    # Kill any remaining processes on our ports
    lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
    lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true

    # Remove PID file
    if [ -f "$PID_FILE" ]; then
        rm -f "$PID_FILE"
    fi

    echo -e "${GREEN}All services stopped.${NC}"
    exit 0
}

# Set up trap for cleanup
trap cleanup SIGINT SIGTERM EXIT

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${RED}Error: Port $port is already in use${NC}"
        echo -e "${YELLOW}Please stop the process using port $port and try again${NC}"
        lsof -i :$port
        exit 1
    fi
}

# Function to check command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo -e "${BLUE}=== OnionTravel Startup ===${NC}"
echo ""

# Check if application is already running
if [ -f "$PID_FILE" ]; then
    echo -e "${YELLOW}Found existing PID file, checking processes...${NC}"

    # Read PIDs from file
    EXISTING_BACKEND_PID=$(sed -n '1p' "$PID_FILE" 2>/dev/null)
    EXISTING_FRONTEND_PID=$(sed -n '2p' "$PID_FILE" 2>/dev/null)

    # Check if processes are actually running
    BACKEND_RUNNING=false
    FRONTEND_RUNNING=false

    if is_process_running "$EXISTING_BACKEND_PID"; then
        BACKEND_RUNNING=true
    fi

    if is_process_running "$EXISTING_FRONTEND_PID"; then
        FRONTEND_RUNNING=true
    fi

    if [ "$BACKEND_RUNNING" = true ] || [ "$FRONTEND_RUNNING" = true ]; then
        echo -e "${RED}Error: OnionTravel is already running!${NC}"
        [ "$BACKEND_RUNNING" = true ] && echo -e "${YELLOW}  Backend PID: $EXISTING_BACKEND_PID${NC}"
        [ "$FRONTEND_RUNNING" = true ] && echo -e "${YELLOW}  Frontend PID: $EXISTING_FRONTEND_PID${NC}"
        echo ""
        echo -e "${BLUE}To stop the running instance, use Ctrl+C in the terminal where it's running,${NC}"
        echo -e "${BLUE}or kill the processes manually:${NC}"
        [ "$BACKEND_RUNNING" = true ] && echo -e "${BLUE}  kill $EXISTING_BACKEND_PID${NC}"
        [ "$FRONTEND_RUNNING" = true ] && echo -e "${BLUE}  kill $EXISTING_FRONTEND_PID${NC}"
        exit 1
    else
        echo -e "${YELLOW}Stale PID file found (processes not running), removing...${NC}"
        rm -f "$PID_FILE"
    fi
fi
echo ""

# Check required commands
echo -e "${BLUE}Checking dependencies...${NC}"

if ! command_exists python3; then
    echo -e "${RED}Error: python3 is not installed${NC}"
    exit 1
fi

if ! command_exists node; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Python3: $(python3 --version)${NC}"
echo -e "${GREEN}✓ Node.js: $(node --version)${NC}"
echo -e "${GREEN}✓ npm: $(npm --version)${NC}"
echo ""

# Check ports
echo -e "${BLUE}Checking ports...${NC}"
check_port $BACKEND_PORT
check_port $FRONTEND_PORT
echo -e "${GREEN}✓ Ports $BACKEND_PORT and $FRONTEND_PORT are available${NC}"
echo ""

# Setup backend
echo -e "${BLUE}Setting up backend...${NC}"
cd "$BACKEND_DIR"

if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating Python virtual environment...${NC}"
    python3 -m venv venv
fi

source venv/bin/activate

echo -e "${YELLOW}Installing/updating backend dependencies...${NC}"
pip install -q -r requirements.txt

echo -e "${GREEN}✓ Backend setup complete${NC}"
echo ""

# Setup frontend
echo -e "${BLUE}Setting up frontend...${NC}"
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
else
    echo -e "${YELLOW}Updating frontend dependencies...${NC}"
    npm install
fi

echo -e "${GREEN}✓ Frontend setup complete${NC}"
echo ""

# Get local IP
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")

# Start backend
echo -e "${BLUE}Starting backend on port $BACKEND_PORT...${NC}"
cd "$BACKEND_DIR"
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port $BACKEND_PORT 2>&1 | sed "s/^/[BACKEND] /" &

# Wait a bit for backend to start and capture actual PID
sleep 2
BACKEND_PID=$(lsof -ti:$BACKEND_PORT)
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"

# Start frontend
echo -e "${BLUE}Starting frontend on port $FRONTEND_PORT...${NC}"
cd "$FRONTEND_DIR"
npm run dev 2>&1 | sed "s/^/[FRONTEND] /" &

# Wait for frontend to start and capture actual PID
sleep 3
FRONTEND_PID=$(lsof -ti:$FRONTEND_PORT)
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"

# Save PIDs to file for test.sh integration
echo "$BACKEND_PID" > "$PID_FILE"
echo "$FRONTEND_PID" >> "$PID_FILE"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ OnionTravel is running! ✨${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Frontend:${NC} http://localhost:$FRONTEND_PORT"
echo -e "${YELLOW}Backend API:${NC} http://localhost:$BACKEND_PORT"
echo -e "${YELLOW}API Docs:${NC} http://localhost:$BACKEND_PORT/docs"
echo ""
if [ "$LOCAL_IP" != "localhost" ]; then
    echo -e "${YELLOW}Network URLs:${NC}"
    echo -e "  Frontend: http://$LOCAL_IP:$FRONTEND_PORT"
    echo -e "  Backend: http://$LOCAL_IP:$BACKEND_PORT"
    echo ""
fi
echo -e "${BLUE}Press Ctrl+C to stop all services${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
