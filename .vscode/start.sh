#!/bin/bash

env_dir=. # .env directory
docker_dir=$env_dir # docker-compose.yml directory

# Start Docker Compose services
echo "Starting Docker Compose services..."
sudo docker compose --env-file $env_dir/.env -f $docker_dir/docker-compose.yml up --build
