#!/usr/bin/env bash
# Commands to start services in correct order (UNIX / WSL)

set -euo pipefail

echo "1) Start MongoDB (outside scope of this script). Ensure mongod is running."

echo "2) Start AI service (FastAPI, port 8001)"
echo "   cd ai-service && source ../.venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8001 --reload"

echo "3) Start backend (Express, port 8000)"
echo "   cd backend && npm install && npm run dev"

echo "4) Start frontend (Vite, port 5173)"
echo "   cd frontend && npm install && npm run dev"

echo "Run each command in its terminal. Monitor logs for errors." 
