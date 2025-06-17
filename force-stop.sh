#!/bin/bash
echo "🛑 Force stopping all services..."

# Function to kill process by port
kill_by_port() {
    local port=$1
    local service_name=$2
    
    # Windows command to find process by port
    if command -v netstat >/dev/null 2>&1; then
        pid=$(netstat -ano | grep ":$port " | awk '{print $5}' | head -1)
        if [ ! -z "$pid" ]; then
            taskkill //PID $pid //F 2>/dev/null
            echo "✅ $service_name stopped (Port $port, PID: $pid)"
        fi
    fi
    
    # Unix/Git Bash command
    if command -v lsof >/dev/null 2>&1; then
        pid=$(lsof -ti :$port)
        if [ ! -z "$pid" ]; then
            kill -9 $pid 2>/dev/null
            echo "✅ $service_name stopped (Port $port, PID: $pid)"
        fi
    fi
}

# Stop by PID files first
if [ -f "ai-service.pid" ]; then
    pid=$(cat ai-service.pid)
    if kill -0 $pid 2>/dev/null; then
        kill -9 $pid 2>/dev/null
        echo "✅ AI service force stopped (PID: $pid)"
    fi
    rm -f ai-service.pid
fi

if [ -f "node-backend.pid" ]; then
    pid=$(cat node-backend.pid)
    if kill -0 $pid 2>/dev/null; then
        kill -9 $pid 2>/dev/null
        echo "✅ Node backend force stopped (PID: $pid)"
    fi
    rm -f node-backend.pid
fi

if [ -f "react-frontend.pid" ]; then
    pid=$(cat react-frontend.pid)
    if kill -0 $pid 2>/dev/null; then
        kill -9 $pid 2>/dev/null
        echo "✅ React frontend force stopped (PID: $pid)"
    fi
    rm -f react-frontend.pid
fi

# Force stop by ports
echo "🔍 Checking ports..."
kill_by_port 3000 "React Frontend"
kill_by_port 5000 "Node Backend" 
kill_by_port 5001 "Flask AI Service"

# Kill any remaining Node/Python processes (be careful!)
echo "🧹 Cleaning up remaining processes..."
if command -v taskkill >/dev/null 2>&1; then
    # Windows
    taskkill //F //IM node.exe 2>/dev/null || echo "No Node.js processes found"
    taskkill //F //IM python.exe 2>/dev/null || echo "No Python processes found"
else
    # Unix/Git Bash
    pkill -f "node.*server" 2>/dev/null || echo "No Node server processes found"
    pkill -f "python.*app.py" 2>/dev/null || echo "No Flask processes found"
fi

echo ""
echo "🎯 Complete shutdown finished!"
echo "💡 Clear browser cache with Ctrl+F5"
echo "🔄 To restart: ./start-conda.sh" 