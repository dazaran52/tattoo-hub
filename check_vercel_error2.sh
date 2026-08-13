#!/bin/bash
while true; do
  OUTPUT=$(curl -s https://tattoo-hub.xyz/ru)
  if ! echo "$OUTPUT" | grep -q 'Error: NEXT_NOT_FOUND'; then
    echo "NEW BUILD DEPLOYED! Error changed!"
    echo "$OUTPUT" | grep -o 'Error: [^<]*'
    exit 0
  fi
  sleep 3
done
