#!/bin/bash

setup() {
    # getting result as 0 if command found. > dont show the output on terminal
    if ! command -v docker > /dev/null 2>&1 || ! command -v git > /dev/null 2>&1; then
        echo "docker and git need to be installed first";
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
    echo -e "Select language (0-1): \n 0) Python \n 1)Nodejs";
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
    else
        echo "File not found".
    fi

    (  docker compose down -v);
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
    *)
        echo -e "Invalid Arguement. Use either: \n setup \n build \n test";
        ;;
esac