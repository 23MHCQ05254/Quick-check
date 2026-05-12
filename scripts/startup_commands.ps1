Write-Host "1) Start MongoDB (ensure mongod/mongosh available and running)"

Write-Host "2) Start AI service (FastAPI, port 8001)"
Write-Host "   cd ai-service; .\..\.venv\Scripts\Activate.ps1; uvicorn main:app --host 0.0.0.0 --port 8001 --reload"

Write-Host "3) Start backend (Express, port 8000)"
Write-Host "   cd backend; npm install; npm run dev"

Write-Host "4) Start frontend (Vite, port 5173)"
Write-Host "   cd frontend; npm install; npm run dev"

Write-Host "Run each command in its own terminal and monitor logs."
