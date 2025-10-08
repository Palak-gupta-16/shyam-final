#!/bin/bash

# SHYAM SUPER APP Full Stack Startup Script

echo "🚀 Starting SHYAM SUPER APP Full Stack..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check dependencies
echo -e "${BLUE}📋 Checking dependencies...${NC}"

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 16+${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed. Please install npm${NC}"
    exit 1
fi

if ! command_exists mongod; then
    echo -e "${YELLOW}⚠️  MongoDB is not in PATH. Make sure MongoDB is running${NC}"
fi

echo -e "${GREEN}✅ Dependencies check complete${NC}"
echo ""

# Create .env files if they don't exist
echo -e "${BLUE}🔧 Setting up environment files...${NC}"

if [ ! -f .env ]; then
    echo "Creating backend .env file..."
    cp env.example .env
    echo -e "${YELLOW}📝 Please update the .env file with your MongoDB URI and JWT secret${NC}"
fi

if [ ! -f frontend/.env ]; then
    echo "Creating frontend .env file..."
    cd frontend
    cp env.example .env
    cd ..
fi

echo -e "${GREEN}✅ Environment files ready${NC}"
echo ""

# Install backend dependencies
echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
if [ ! -d node_modules ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Backend dependency installation failed${NC}"
        exit 1
    fi
else
    echo "Backend dependencies already installed"
fi

# Install frontend dependencies
echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
cd frontend
if [ ! -d node_modules ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Frontend dependency installation failed${NC}"
        exit 1
    fi
else
    echo "Frontend dependencies already installed"
fi
cd ..

echo -e "${GREEN}✅ All dependencies installed${NC}"
echo ""

# Create uploads directory
echo -e "${BLUE}📁 Creating uploads directory...${NC}"
mkdir -p uploads
echo -e "${GREEN}✅ Uploads directory ready${NC}"
echo ""

# Function to cleanup background processes
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down servers...${NC}"
    
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo "Backend server stopped"
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo "Frontend server stopped"
    fi
    
    echo -e "${GREEN}✅ Cleanup complete${NC}"
    exit 0
}

# Set trap to cleanup on exit
trap cleanup SIGINT SIGTERM

# Start backend server
echo -e "${BLUE}🚀 Starting backend server...${NC}"
npm run dev > backend.log 2>&1 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Check if backend started successfully
if kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${GREEN}✅ Backend server started on http://localhost:4000${NC}"
else
    echo -e "${RED}❌ Backend server failed to start. Check backend.log for details${NC}"
    cat backend.log
    exit 1
fi

# Start frontend server
echo -e "${BLUE}🚀 Starting frontend server...${NC}"
cd frontend
npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait a moment for frontend to start
sleep 5

# Check if frontend started successfully
if kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${GREEN}✅ Frontend server started on http://localhost:3000${NC}"
else
    echo -e "${RED}❌ Frontend server failed to start. Check frontend.log for details${NC}"
    cat frontend.log
    cleanup
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 SHYAM SUPER APP is now running!${NC}"
echo ""
echo -e "${BLUE}📊 Server Information:${NC}"
echo "  • Backend API: http://localhost:4000"
echo "  • Frontend App: http://localhost:3000"
echo "  • API Documentation: http://localhost:4000/api/health"
echo ""
echo -e "${BLUE}👥 Default Login (create via registration):${NC}"
echo "  • Role: Director"
echo "  • Create your account at: http://localhost:3000/register"
echo ""
echo -e "${BLUE}📋 Available Features:${NC}"
echo "  • Dashboard with real-time stats"
echo "  • Order management with workflow"
echo "  • Inventory tracking"
echo "  • Gate pass system"
echo "  • Mill operations reporting"
echo "  • Store management"
echo "  • User role-based access"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "  1. Open http://localhost:3000 in your browser"
echo "  2. Register a new Director account"
echo "  3. Explore the dashboard and features"
echo "  4. Create additional users with different roles"
echo ""
echo -e "${BLUE}💡 Tips:${NC}"
echo "  • Check backend.log and frontend.log for server logs"
echo "  • Backend API docs: http://localhost:4000/api/health"
echo "  • Use Ctrl+C to stop both servers"
echo ""
echo -e "${GREEN}⚡ Ready for factory operations management!${NC}"
echo ""

# Keep script running and show logs
echo "Press Ctrl+C to stop all servers"
echo ""
echo "=== LIVE LOGS ==="

# Follow logs in real-time
tail -f backend.log frontend.log &
TAIL_PID=$!

# Wait for user interrupt
wait

# Cleanup will be called by trap
