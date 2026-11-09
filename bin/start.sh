#!/bin/bash
set -e

SERVICES="${@:-postgres redis}"
docker compose up -d $SERVICES
