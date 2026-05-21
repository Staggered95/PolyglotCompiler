#!/bin/bash

setup() {
    # getting result as 0 if command found. > dont show the output on terminal
    if ! command -v docker > /dev/null 2>&1 || ! command -v git > /dev/null 2>&1 || ! command -v jq > /dev/null 2>&1; then
        echo "docker, jq, and git need to be installed first";
        exit 1;
    fi
    docker pull python:3.11-alpine;
    docker pull node:18-alpine;
}

build() {
    HASH=$(git rev-parse --short HEAD);
    (  docker build -f ./containers/api/Dockerfile -t polyglot-api:$HASH -t polyglot-api:latest . );
    (  docker build -f ./containers/python/Dockerfile -t polyglot-py:$HASH -t polyglot-py:latest . );
    (  docker build -f ./containers/nodejs/Dockerfile -t polyglot-js:$HASH -t polyglot-js:latest . );
}

test() {
    docker compose up -d || { echo "Docker Compose failed! Aborting."; exit 1; }
    # wait for containers to boot up
    while ! curl -s --head --fail localhost:5000/health > /dev/null; do
        echo "Containers booting up..."
        sleep 1
    done
    echo "containers booted up. proceeding with tests";
    
    read -p "Enter filename (no need of extension): " file_name;
    echo -e "Select language (0-1): \n 0) Python \n 1) Nodejs";
    read -p "Choice: " language;
    case $language in
        0) extension="py" ;;
        1) extension="js" ;;
        *) 
            echo "Incompatible language. Aborting!";
            exit 1;
        ;;
    esac
    
    file="$file_name.$extension";
    #if $EDITOR exists, use it, else use nano. need to learn more about this
    ${EDITOR:-nano} "$file";

    # need to learn more about jq
    JSON_PAYLOAD=$(jq -n --arg t "$extension" --arg c "$(cat $file)" '{type: $t, code: $c}')

    if [[ -f "$file" ]]; then
        curl -X POST -d "$JSON_PAYLOAD" \
             -H "Content-Type: application/json" \
             http://localhost:5000/execute;
        rm $file;
    else
        echo "File not found".
    fi

    (  docker compose down -v);
}

view() {
    echo "Booting Polyglot Engine..."
    docker compose up -d || { echo "Docker Compose failed! Aborting."; exit 1; }
    
    # Ping the root URL until the HTML file is successfully served
    while ! curl -s --head --fail localhost:5000 > /dev/null; do
        echo "Containers booting up..."
        sleep 1
    done
    
    echo "Engine is live! Opening workspace..."
    
    # Cross-platform browser launch
    if command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:5000        # Linux
    elif command -v open &> /dev/null; then
        open http://localhost:5000            # macOS
    elif command -v start &> /dev/null; then
        start http://localhost:5000           # Windows
    else
        echo "========================================="
        echo "Please manually open your browser to:"
        # color the line below in green to stand out
        echo "http://localhost:5000"
        echo "========================================="
    fi
}

logs() {
    echo "Tailing API logs... (Press Ctrl+C to exit)"
    
    # GREP_COLORS='mt=01;31' forces the matched words to be bold red
    docker compose logs -f | GREP_COLORS='mt=01;31' grep --color=always -E 'ERROR|CRITICAL|$'
}

clean() {
    echo "1/3: Stopping and removing containers/networks..."
    docker compose down -v

    echo "2/3: Removing custom Docker images..."
    docker rmi -f $(docker images -q 'polyglot*') 2>/dev/null
    
    echo "3/3: Emptying workspaces folder..."
    rm -f ./workspaces/*
    
    echo "Environment successfully cleaned!"
}

case $1 in
    "setup")
        setup
        ;;
    "build")
        build
        ;;
    "test")
        test
        ;;
    "clean")
        clean
        ;;
    "logs")
        logs
        ;;
    "view")
        view
        ;;
    *)
        echo -e "Invalid Argument. Use: \n setup \n build \n test \n clean \n logs"
        ;;
esac