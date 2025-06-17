#!/bin/bash

# Startup script using existing conda environment
echo "🚀 Starting AI Sales Deck Generator (Using conda env: comp8430)..."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔍 Checking prerequisites..."
if ! command -v python &> /dev/null; then
    echo -e "${RED}❌ Python not found${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    exit 1
fi

if ! command -v conda &> /dev/null; then
    echo -e "${RED}❌ Conda not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites satisfied${NC}"

mkdir -p logs

# Start AI Service
echo "🤖 Starting AI Service..."
cd ai-service

# Activate existing conda environment
echo "🔧 Activating conda environment: comp8430..."
eval "$(conda shell.bash hook)"
conda activate comp8430

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Conda environment 'comp8430' activated${NC}"
    
    # Show current Python path to confirm
    echo "🐍 Using Python: $(which python)"
    echo "📦 Python version: $(python --version)"
else
    echo -e "${RED}❌ Could not activate conda environment 'comp8430'${NC}"
    echo "Available environments:"
    conda env list
    exit 1
fi

# Install dependencies in conda environment
echo "📦 Installing Python dependencies in conda environment..."
pip install --upgrade pip
pip install -r requirements.txt

# Check for API key and cache configuration
if [ ! -f ".env" ]; then
    cp env.example .env
    echo -e "${YELLOW}⚠️  Created .env file from template${NC}"
fi

# Load environment variables for cache configuration
if [ -f ".env" ]; then
    source .env
    
    # Set cache locations if specified
    if [ -n "$HF_HOME" ]; then
        export HF_HOME="$HF_HOME"
        echo -e "${GREEN}✅ Custom cache location: $HF_HOME${NC}"
    fi
    
    if [ -n "$HUGGINGFACE_HUB_CACHE" ]; then
        export HUGGINGFACE_HUB_CACHE="$HUGGINGFACE_HUB_CACHE"
    fi
    
    if [ -n "$TRANSFORMERS_CACHE" ]; then
        export TRANSFORMERS_CACHE="$TRANSFORMERS_CACHE"
    fi
fi

# Validate API key
echo "🔑 Checking Hugging Face API key..."
if [ -f ".env" ]; then
    source .env
    if [ -z "$HUGGINGFACE_API_KEY" ] || [ "$HUGGINGFACE_API_KEY" = "your_huggingface_api_key_here" ]; then
        echo -e "${RED}❌ HUGGINGFACE_API_KEY not configured${NC}"
        echo -e "${YELLOW}Please edit ai-service/.env and add your token from:${NC}"
        echo -e "${YELLOW}https://huggingface.co/settings/tokens${NC}"
        echo ""
        echo "Or run: ./set-cache-location.sh to configure cache and API key"
        echo ""
        read -p "Continue without token? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
        echo -e "${YELLOW}⚠️  Continuing with fallback models (limited functionality)${NC}"
    else
        echo -e "${GREEN}✅ Hugging Face API key found${NC}"
    fi
fi

# Start Flask service
echo "🚀 Starting Flask AI service..."
python app.py > ../logs/ai-service.log 2>&1 &
AI_PID=$!
echo $AI_PID > ../ai-service.pid

cd ..

# Wait and test AI service
echo "⏳ Waiting for AI service to load models (45 seconds)..."
echo "💡 Models download to: ${HF_HOME:-C:\\Users\\tgish\\.cache\\huggingface\\}"
echo "💡 This is normal - AI models take time to download and load"

# Show progress while waiting
for i in {1..9}; do
    sleep 5
    echo "   ⏳ Loading... ($((i*5))/45 seconds)"
done

echo "🔍 Testing AI service..."
health_response=$(curl -s http://localhost:5001/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ AI service is responding${NC}"
    echo "📊 Health response: $health_response"
else
    echo -e "${YELLOW}⚠️  AI service may still be initializing...${NC}"
    echo -e "${YELLOW}Check logs: tail -f logs/ai-service.log${NC}"
fi

# Start Node.js Backend
echo "📊 Starting Node.js Backend..."
cd server

if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
fi

# Check OpenAI key
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Created server/.env from template${NC}"
fi

npm start > ../logs/node-backend.log 2>&1 &
NODE_PID=$!
echo $NODE_PID > ../node-backend.pid

cd ..

# Start React Frontend
echo "⚛️  Starting React Frontend..."
cd client

if [ ! -d "node_modules" ]; then
    echo "📦 Installing React dependencies..."
    npm install
fi

npm run dev > ../logs/react-frontend.log 2>&1 &
REACT_PID=$!
echo $REACT_PID > ../react-frontend.pid

cd ..

echo ""
echo -e "${GREEN}🎉 All services started!${NC}"
echo ""
echo "🌐 Service URLs:"
echo "   📱 Frontend:   http://localhost:3000"
echo "   🔧 Backend:    http://localhost:5000"
echo "   🤖 AI Service: http://localhost:5001"
echo ""
echo "📊 Quick Tests:"
echo "   🧪 Test AI:    ./test-ai.sh"
echo "   💊 Health:     curl http://localhost:5001/health"
echo ""
echo "🗂️  Manage Cache: ./set-cache-location.sh"
echo "🛑 Stop All:      ./stop-all.sh"

echo ""
echo -e "${GREEN}✨ Ready to use with conda environment: comp8430${NC}" 