.PHONY: install env db seed run check docker-up docker-down format help

help:
	@echo ""
	@echo "  E-Commerce AI System — Available Commands"
	@echo "  ─────────────────────────────────────────"
	@echo "  make install      Install all Python dependencies"
	@echo "  make env          Copy .env.example to .env"
	@echo "  make check        Run pre-flight connection check"
	@echo "  make db           Create DB tables (no seed data)"
	@echo "  make seed         Seed DB with sample data"
	@echo "  make run          Start FastAPI development server"
	@echo "  make scheduler    Start background ML job scheduler"
	@echo "  make docker-up    Start PostgreSQL + pgAdmin via Docker"
	@echo "  make docker-down  Stop Docker services"
	@echo "  make docker-full  Start everything (DB + API) via Docker"
	@echo "  make format       Format code with black + isort"
	@echo ""

install:
	pip install -r requirements.txt

env:
	@[ -f .env ] && echo ".env already exists" || (cp .env.example .env && echo "Created .env — please edit DATABASE_URL and SECRET_KEY")

check:
	python test_connection.py

db:
	python -c "from app.core.database import create_tables; create_tables(); print('Tables created.')"

seed:
	python scripts/seed.py

run:
	python main.py

scheduler:
	pip install apscheduler -q
	python scheduler.py

docker-up:
	docker-compose up -d db pgadmin
	@echo "PostgreSQL running on localhost:5432"
	@echo "pgAdmin running on http://localhost:5050  (admin@admin.com / admin)"

docker-down:
	docker-compose down

docker-full:
	docker-compose up --build

format:
	pip install black isort -q
	black .
	isort .

# Full local setup in one command
setup: install env docker-up
	@echo ""
	@echo "Waiting for PostgreSQL to be ready..."
	@sleep 5
	@make seed
	@echo ""
	@echo "Setup complete! Run: make run"
