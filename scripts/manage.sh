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
    (cd .. && docker compose );
}