#!/bin/bash

# Real-time Log Viewer for AI Sales Deck Generator
# Shows logs for Node.js backend, React frontend, and Flask AI service

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

LOG_DIR="logs"

echo -e "${BLUE}📊 AI Sales Deck Generator - Real-time Log Viewer${NC}"
echo -e "${YELLOW}==========================================${NC}"

# Function to check if log files exist
check_logs() {
    echo -e "\n${CYAN}📁 Checking log files...${NC}"
    
    if [ -f "$LOG_DIR/node-backend.log" ]; then
        echo -e "${GREEN}✅ Node.js Backend: $LOG_DIR/node-backend.log${NC}"
    else
        echo -e "${RED}❌ Node.js Backend: No log file found${NC}"
    fi
    
    if [ -f "$LOG_DIR/react-frontend.log" ]; then
        echo -e "${GREEN}✅ React Frontend: $LOG_DIR/react-frontend.log${NC}"
    else
        echo -e "${RED}❌ React Frontend: No log file found${NC}"
    fi
    
    if [ -f "$LOG_DIR/ai-service.log" ]; then
        echo -e "${GREEN}✅ Flask AI Service: $LOG_DIR/ai-service.log${NC}"
    else
        echo -e "${RED}❌ Flask AI Service: No log file found${NC}"
    fi
}

# Function to show recent logs
show_recent() {
    echo -e "\n${PURPLE}📄 Recent Logs (Last 20 lines each):${NC}"
    echo -e "${YELLOW}=====================================\n${NC}"
    
    if [ -f "$LOG_DIR/node-backend.log" ]; then
        echo -e "${BLUE}🟦 NODE.JS BACKEND (Recent):${NC}"
        tail -n 20 "$LOG_DIR/node-backend.log" | sed 's/^/   /'
        echo ""
    fi
    
    if [ -f "$LOG_DIR/react-frontend.log" ]; then
        echo -e "${GREEN}🟩 REACT FRONTEND (Recent):${NC}"
        tail -n 20 "$LOG_DIR/react-frontend.log" | sed 's/^/   /'
        echo ""
    fi
    
    if [ -f "$LOG_DIR/ai-service.log" ]; then
        echo -e "${PURPLE}🟪 FLASK AI SERVICE (Recent):${NC}"
        tail -n 20 "$LOG_DIR/ai-service.log" | sed 's/^/   /'
        echo ""
    fi
}

# Function to tail all logs simultaneously
tail_all() {
    echo -e "\n${CYAN}🔴 LIVE: Following all logs in real-time...${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}\n"
    
    # Create a temporary script for multitail
    if command -v multitail >/dev/null 2>&1; then
        echo -e "${GREEN}Using multitail for better formatting...${NC}"
        multitail \
            -ci green -l "tail -f $LOG_DIR/node-backend.log" \
            -ci yellow -l "tail -f $LOG_DIR/react-frontend.log" \
            -ci blue -l "tail -f $LOG_DIR/ai-service.log"
    else
        echo -e "${YELLOW}Using basic tail (install multitail for better experience)${NC}\n"
        # Use basic tail with labels
        (
            tail -f "$LOG_DIR/node-backend.log" 2>/dev/null | sed "s/^/[${BLUE}NODE${NC}] /" &
            tail -f "$LOG_DIR/react-frontend.log" 2>/dev/null | sed "s/^/[${GREEN}REACT${NC}] /" &
            tail -f "$LOG_DIR/ai-service.log" 2>/dev/null | sed "s/^/[${PURPLE}FLASK${NC}] /" &
            wait
        )
    fi
}

# Function to show individual service logs
show_individual() {
    echo -e "\n${CYAN}Choose a service to monitor:${NC}"
    echo "1) Node.js Backend"
    echo "2) React Frontend" 
    echo "3) Flask AI Service"
    echo "4) Back to main menu"
    
    read -p "Enter choice (1-4): " choice
    
    case $choice in
        1)
            if [ -f "$LOG_DIR/node-backend.log" ]; then
                echo -e "\n${BLUE}🔴 LIVE: Node.js Backend logs...${NC}"
                echo -e "${YELLOW}Press Ctrl+C to stop${NC}\n"
                tail -f "$LOG_DIR/node-backend.log"
            else
                echo -e "${RED}❌ No Node.js backend log file found${NC}"
            fi
            ;;
        2)
            if [ -f "$LOG_DIR/react-frontend.log" ]; then
                echo -e "\n${GREEN}🔴 LIVE: React Frontend logs...${NC}"
                echo -e "${YELLOW}Press Ctrl+C to stop${NC}\n"
                tail -f "$LOG_DIR/react-frontend.log"
            else
                echo -e "${RED}❌ No React frontend log file found${NC}"
            fi
            ;;
        3)
            if [ -f "$LOG_DIR/ai-service.log" ]; then
                echo -e "\n${PURPLE}🔴 LIVE: Flask AI Service logs...${NC}"
                echo -e "${YELLOW}Press Ctrl+C to stop${NC}\n"
                tail -f "$LOG_DIR/ai-service.log"
            else
                echo -e "${RED}❌ No Flask AI service log file found${NC}"
            fi
            ;;
        4)
            return
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            ;;
    esac
}

# Function to search logs
search_logs() {
    read -p "Enter search term: " search_term
    
    echo -e "\n${CYAN}🔍 Searching for '$search_term' in all logs...${NC}\n"
    
    if [ -f "$LOG_DIR/node-backend.log" ]; then
        echo -e "${BLUE}🟦 NODE.JS BACKEND:${NC}"
        grep -n "$search_term" "$LOG_DIR/node-backend.log" | head -10 | sed 's/^/   /'
        echo ""
    fi
    
    if [ -f "$LOG_DIR/react-frontend.log" ]; then
        echo -e "${GREEN}🟩 REACT FRONTEND:${NC}"
        grep -n "$search_term" "$LOG_DIR/react-frontend.log" | head -10 | sed 's/^/   /'
        echo ""
    fi
    
    if [ -f "$LOG_DIR/ai-service.log" ]; then
        echo -e "${PURPLE}🟪 FLASK AI SERVICE:${NC}"
        grep -n "$search_term" "$LOG_DIR/ai-service.log" | head -10 | sed 's/^/   /'
        echo ""
    fi
}

# Function to clear logs
clear_logs() {
    echo -e "\n${YELLOW}⚠️  This will clear all log files. Are you sure? (y/N)${NC}"
    read -p "Confirm: " confirm
    
    if [[ $confirm =~ ^[Yy]$ ]]; then
        echo -e "${CYAN}🧹 Clearing log files...${NC}"
        
        [ -f "$LOG_DIR/node-backend.log" ] && > "$LOG_DIR/node-backend.log" && echo "✅ Cleared Node.js backend logs"
        [ -f "$LOG_DIR/react-frontend.log" ] && > "$LOG_DIR/react-frontend.log" && echo "✅ Cleared React frontend logs"
        [ -f "$LOG_DIR/ai-service.log" ] && > "$LOG_DIR/ai-service.log" && echo "✅ Cleared Flask AI service logs"
        
        echo -e "${GREEN}🎉 All logs cleared!${NC}"
    else
        echo -e "${BLUE}Operation cancelled${NC}"
    fi
}

# Main menu
main_menu() {
    while true; do
        echo -e "\n${CYAN}🎯 Log Viewer Options:${NC}"
        echo "1) Check log files status"
        echo "2) Show recent logs (last 20 lines)"
        echo "3) Follow all logs in real-time"
        echo "4) Monitor individual service"
        echo "5) Search logs"
        echo "6) Clear all logs"
        echo "7) Exit"
        
        read -p "Choose an option (1-7): " choice
        
        case $choice in
            1) check_logs ;;
            2) show_recent ;;
            3) tail_all ;;
            4) show_individual ;;
            5) search_logs ;;
            6) clear_logs ;;
            7) 
                echo -e "${GREEN}👋 Goodbye!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid choice. Please enter 1-7.${NC}"
                ;;
        esac
    done
}

# Quick options for command line
case "$1" in
    "check")
        check_logs
        ;;
    "recent")
        show_recent
        ;;
    "tail")
        tail_all
        ;;
    "node")
        if [ -f "$LOG_DIR/node-backend.log" ]; then
            echo -e "${BLUE}🔴 Node.js Backend logs:${NC}"
            tail -f "$LOG_DIR/node-backend.log"
        else
            echo -e "${RED}❌ No Node.js backend log file found${NC}"
        fi
        ;;
    "react")
        if [ -f "$LOG_DIR/react-frontend.log" ]; then
            echo -e "${GREEN}🔴 React Frontend logs:${NC}"
            tail -f "$LOG_DIR/react-frontend.log"
        else
            echo -e "${RED}❌ No React frontend log file found${NC}"
        fi
        ;;
    "flask" | "ai")
        if [ -f "$LOG_DIR/ai-service.log" ]; then
            echo -e "${PURPLE}🔴 Flask AI Service logs:${NC}"
            tail -f "$LOG_DIR/ai-service.log"
        else
            echo -e "${RED}❌ No Flask AI service log file found${NC}"
        fi
        ;;
    "clear")
        clear_logs
        ;;
    *)
        main_menu
        ;;
esac 