# AI Sales Deck Generator

A hybrid AI system that generates professional sales decks using both cloud and local AI models for sensitive document processing.

## 🎯 Overview

This application combines three services to create professional sales presentations:
- **Frontend**: React web interface with TailwindCSS
- **Backend**: Node.js API with MongoDB
- **AI Service**: Python Flask service with Hugging Face models

### Key Features
- **Upload documents** (PDF, TXT, MD) and videos
- **Hybrid AI processing**: OpenAI for regular docs, Local Llama for sensitive docs
- **Mark sensitive documents** to process locally (no external API calls)
- **Generate professional sales decks** with visualizations
- **Multi-agent system** for comprehensive data extraction

## 🚀 Quick Start

### Prerequisites
Before running the application, ensure you have:
- **Python 3.8+** with conda
- **Node.js 18+** and npm
- **CUDA-capable GPU** (recommended for local AI)

### 1. One-Command Setup
```bash
./start-conda.sh
```
This script will:
- Activate the `comp8430` conda environment
- Install all Python dependencies
- Start the AI service (Flask) on port 5001
- Start the backend API (Node.js) on port 3001
- Start the frontend (React) on port 3000

### 2. Access the Application
- **Web Interface**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **AI Service**: http://localhost:5001

### 3. Stop All Services
```bash
./force-stop.sh
```

### 4. Monitor Services
```bash
./view-logs.sh
```

## 🛠️ Manual Setup (Alternative)

If you prefer to start services individually:

### Terminal 1: AI Service (Flask)
```bash
cd ai-service
conda activate comp8430
pip install -r requirements.txt
python app.py
```

### Terminal 2: Backend API (Node.js)
```bash
cd server
npm install
npm start
```

### Terminal 3: Frontend (React)
```bash
cd client
npm install
npm run dev
```

## ⚙️ Configuration

### AI Service Configuration
Create `ai-service/.env` from the template:
```bash
cp ai-service/env.example ai-service/.env
```

Edit the file with your settings:
```env
HUGGINGFACE_API_KEY=your_huggingface_api_key_here
HF_HOME=C:\Users\YourUser\.cache\huggingface\
CUDA_VISIBLE_DEVICES=0
AI_SERVICE_PORT=5001
```

### Backend Configuration
Create `server/.env` for OpenAI integration:
```env
OPENAI_API_KEY=your_openai_api_key_here
MONGODB_URI=your_mongocluster_url_here
```
### Frontend Configuration
Create `client/.env` for Vite Integration:
```env
OPENAI_API_KEY=your_openai_api_key_here
VITE_API_URL=your_local_host_url_here
```
### For Assignment Evaluators
 Env files are attached with our submission on iLearn
``` env
outer.env needs to be renamed to .env and placed in /AI-Sales-Deck-Generator
client.env needs to be renamed to .env and placed in /AI-Sales-Deck-Generator/client
aiservice.env needs to be renamed to .env and placed in /AI-Sales-Deck-Generator/ai-service
server.env needs to be renamed to .env and placed in /AI-Sales-Deck-Generator/server
```

## 📁 Project Structure

```
AI-Sales-Deck-Generator/
├── client/                    # React frontend (port 3000)
│   ├── src/                   # React components and pages
│   ├── package.json           # Frontend dependencies
│   └── vite.config.js         # Vite configuration
├── server/                    # Node.js backend (port 3001)
│   ├── routes/                # API routes
│   ├── models/                # MongoDB models
│   ├── index.js               # Main server file
│   └── package.json           # Backend dependencies
├── ai-service/                # Flask AI service (port 5001)
│   ├── app.py                 # Main Flask app
│   ├── requirements.txt       # Python dependencies
│   └── env.example            # Environment template
├── logs/                      # Service logs
├── sample-documents/          # Test documents
├── start-conda.sh            # START EVERYTHING
├── force-stop.sh             # STOP EVERYTHING
├── view-logs.sh              # VIEW ALL LOGS
└── README.md                 # This file
```

## 🤖 AI Models Used

### Local Processing (Sensitive Documents)
- **Primary Model**: Llama-3.1-8B-Instruct
- **Summarization**: BART model
- **Sentiment Analysis**: RoBERTa model
- **Processing**: Local GPU acceleration

### Cloud Processing (Regular Documents)
- **Primary Model**: OpenAI 4.1

## 🔒 Security Features

- **Sensitive documents** are processed locally only
- **No external API calls** for marked sensitive files
- **Local GPU acceleration** for fast processing
- **Secure file handling** with automatic cleanup
- **Environment-based configuration** for API keys

## 📊 Features

### Document Processing
- **Multi-format Support**: PDF, TXT, MD documents + video files
- **Automatic Analysis**: Summarization, keyword extraction, sentiment analysis
- **Data Extraction**: Tables, metrics, time-series data
- **Multi-agent System**: Specialized agents for different data types

### Visualization
- **Auto-generated Charts**: Bar charts, line charts, pie charts
- **Data Tables**: Structured data presentation
- **Metrics Dashboard**: KPI visualization
- **Brand Customization**: Color schemes and styling

### User Interface
- **Responsive Design**: Works on desktop and mobile
- **Modern UI**: TailwindCSS with clean design
- **Progress Tracking**: Real-time processing status
- **File Management**: Upload, organize, and manage documents

## Health Checks

### Quick Status Check
```bash
# Check all services are running
netstat -ano | grep ":3000\|:3001\|:5001"
```

### Individual Service Health
```bash
# AI Service
curl http://localhost:5001/health

# Backend API
curl http://localhost:3001/api/health

# Frontend (open in browser)
# http://localhost:3000
```

## Troubleshooting

### Common Issues

#### AI Service Not Starting
```bash
# Check conda environment
conda env list
conda activate comp8430

# Check Python packages
pip list | grep torch
pip list | grep transformers

# Check GPU availability
python -c "import torch; print(torch.cuda.is_available())"
```

#### Backend Issues
```bash
# Check Node.js version
node --version  # Should be 18+

# Check MongoDB connection
# Ensure MongoDB is running locally or update connection string

# Reinstall dependencies
cd server && rm -rf node_modules && npm install
```

#### Frontend Issues
```bash
# Clear cache and reinstall
cd client
rm -rf node_modules package-lock.json
npm install
```

#### Port Conflicts
```bash
# Kill processes using required ports
./force-stop.sh

# Check what's using ports
netstat -ano | grep ":3000\|:3001\|:5001"
```

### Log Monitoring
```bash
# Watch all logs in real-time
./view-logs.sh

# Individual service logs
tail -f logs/ai-service.log
tail -f logs/node-backend.log
tail -f logs/react-frontend.log
```

## Usage Tips

### For Best Results
1. **Sensitive documents**: Check the "Sensitive" box during upload for local processing
2. **GPU processing**: Ensure CUDA is available for faster local AI processing
3. **Large files**: Break down very large documents (>10MB) for better processing
4. **Document format**: Include structured data (tables, metrics) for better extraction

### Sample Data Format
Your documents should include quantitative data like:
```
Company: TechCorp Analytics
Revenue: $12.5 million (up 35%)
Customers: 2,840 (up 42% YoY)

Quarterly Performance:
Q1 2023: $2.8M
Q2 2023: $3.1M
Q3 2023: $3.2M
Q4 2023: $3.4M
```

## 🔧 Advanced Configuration

### Environment Variables

#### AI Service (`ai-service/.env`)
```env
HUGGINGFACE_API_KEY=your_token_here
HF_HOME=path_to_model_cache
TRANSFORMERS_CACHE=path_to_transformers_cache
CUDA_VISIBLE_DEVICES=0
AI_SERVICE_PORT=5001
```

#### Backend (`server/.env`)
```env
OPENAI_API_KEY=your_openai_key_here
MONGODB_URI=mongodb://localhost:27017/salesdeck
PORT=3001
```

### Model Customization
You can modify the AI models used by editing `ai-service/app.py`:
- Change model names in the configuration
- Adjust model parameters (temperature, max_tokens)
- Add custom preprocessing steps

## 🎯 API Endpoints

### AI Service (Port 5001)
- `GET /health` - Service health check
- `POST /analyze` - Analyze document content
- `POST /extract` - Extract structured data
- `POST /summarize` - Summarize document

### Backend API (Port 3001)
- `GET /api/health` - API health check
- `POST /api/upload` - Upload documents
- `POST /api/generate` - Generate sales deck
- `GET /api/decks` - List generated decks

## 📈 Performance Optimization

### For Better Performance
- **Use GPU**: Ensure CUDA is properly configured
- **Increase RAM**: 16GB+ recommended for large documents
- **SSD Storage**: Faster model loading from SSD
- **Model Caching**: Keep models cached locally

### Monitoring Resource Usage
```bash
# Monitor GPU usage
nvidia-smi

# Monitor CPU and memory
htop  # Linux/Mac
Get-Process | Sort-Object CPU -Descending | Select-Object -First 10  # Windows PowerShell
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with `./start-conda.sh`
5. Submit a pull request

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## Need Help?

### Quick Commands Reference
```bash
./start-conda.sh     # Start everything
./force-stop.sh      # Stop everything
./view-logs.sh       # Monitor logs
```

### Support
- Check logs: `./view-logs.sh`
- Restart services: `./force-stop.sh && ./start-conda.sh`
- Test individual services using the health check endpoints

### Common Solutions
- **Models not loading**: Check your Hugging Face API key and internet connection
- **Ports in use**: Run `./force-stop.sh` to clean up processes
- **Memory issues**: Close other applications and ensure 8GB+ available RAM
- **GPU not detected**: Verify CUDA installation and update drivers
