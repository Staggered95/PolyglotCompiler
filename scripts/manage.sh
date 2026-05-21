#!/bin/bash

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

show_help() {
    echo -e "${CYAN}Polyglot Engine CLI${NC}"
    echo -e "Usage: ./scripts/manage.sh [command]\n"
    echo -e "Commands:"
    echo -e "  ${YELLOW}auto${NC}    - Run setup, build, start UI, and attach logs (Recommended)"
    echo -e "  start   - Boot the engine and open the UI in browser"
    echo -e "  test    - Boot the engine and test via terminal/editor"
    echo -e "  build   - Build Docker images"
    echo -e "  restart - Rebuild API image and restart containers"
    echo -e "  clean   - Destroy all containers, networks, and images"
    echo -e "  logs    - Tail the server logs"
    echo -e "  setup   - Pull base images and check dependencies"
    echo -e "  --help, -h - Show this menu"
}

setup() {
    if ! command -v docker > /dev/null 2>&1 || ! command -v git > /dev/null 2>&1 || ! command -v jq > /dev/null 2>&1; then
        echo -e "${YELLOW}docker, jq, and git need to be installed first${NC}"
        exit 1
    fi
    docker pull python:3.11-alpine
    docker pull node:18-alpine
}

build() {
    HASH=$(git rev-parse --short HEAD)
    docker build -f ./containers/api/Dockerfile -t polyglot-api:$HASH -t polyglot-api:latest .
    docker build -f ./containers/python/Dockerfile -t polyglot-py:$HASH -t polyglot-py:latest .
    docker build -f ./containers/nodejs/Dockerfile -t polyglot-js:$HASH -t polyglot-js:latest .
    
    echo -e "\n${GREEN}Build successful!${NC}"
    echo -e "You have two choices to run the engine:"
    echo -e "  1. ${CYAN}./scripts/manage.sh start${NC} (Web UI)"
    echo -e "  2. ${CYAN}./scripts/manage.sh test${NC}  (Terminal)"
    echo -e "\nTip: Run ${YELLOW}./scripts/manage.sh logs${NC} in a split terminal to see live output."
}

restart() {
    docker compose down
    HASH=$(git rev-parse --short HEAD)
    docker build -f ./containers/api/Dockerfile -t polyglot-api:$HASH -t polyglot-api:latest .
    docker compose up -d
    echo -e "${GREEN}Engine restarted successfully!${NC}"
}

test() {
    docker compose up -d || { exit 1; }
    while ! curl -s --head --fail localhost:5000/health > /dev/null 2>&1; do
        sleep 1
    done
    
    read -p "Enter filename (no need of extension): " file_name
    echo -e "Select language (0-1): \n 0) Python \n 1) Nodejs"
    read -p "Choice: " language
    case $language in
        0) extension="py" ;;
        1) extension="js" ;;
        *) exit 1 ;;
    esac
    
    file="$file_name.$extension"
    ${EDITOR:-nano} "$file"

    JSON_PAYLOAD=$(jq -n --arg t "$extension" --arg c "$(cat $file)" '{type: $t, code: $c}')

    if [[ -f "$file" ]]; then
        curl -s -X POST -d "$JSON_PAYLOAD" \
             -H "Content-Type: application/json" \
             http://localhost:5000/execute
        rm "$file"
    fi

    docker compose down -v
}

start() {
    docker compose up -d || { exit 1; }
    
    while ! curl -s --head --fail localhost:5000 > /dev/null 2>&1; do
        sleep 1
    done
    
    if command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:5000
    elif command -v open &> /dev/null; then
        open http://localhost:5000
    elif command -v start &> /dev/null; then
        start http://localhost:5000
    else
        echo "========================================="
        echo "Please manually open your browser to:"
        echo -e "${GREEN}http://localhost:5000${NC}"
        echo "========================================="
    fi
}

logs() {
    echo -e "${CYAN}Tailing API logs... (Press Ctrl+C to exit)${NC}"
    docker compose logs -f | sed -e $'s/ERROR/\033[1;31mERROR\033[0m/g' -e $'s/CRITICAL/\033[1;31mCRITICAL\033[0m/g' -e $'s/SUCCESS/\033[1;32mSUCCESS\033[0m/g'
}

clean() {
    docker compose down -v
    docker rmi -f $(docker images -q 'polyglot*') 2>/dev/null
    rm -f ./workspaces/*
}

auto() {
    setup
    build
    start
    logs
}

case $1 in
    "setup") setup ;;
    "build") build ;;
    "test") test ;;
    "start") start ;;
    "restart") restart ;;
    "clean") clean ;;
    "logs") logs ;;
    "auto") auto ;;
    "--help"|"-h") show_help ;;
    *)
        echo -e "Invalid Argument."
        echo -e "Run ${YELLOW}./scripts/manage.sh --help${NC} for a list of commands."
        echo -e "Or just run ${GREEN}./scripts/manage.sh auto${NC} to do everything at once!"
        ;;
esac