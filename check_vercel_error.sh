#!/bin/bash
while true; do
  OUTPUT=$(curl -s https://tattoo-hub.xyz/ru)
  if echo "$OUTPUT" | grep -q "Invalid locale passed to getRequestConfig"; then
    echo "NEW BUILD DEPLOYED! Found the locale mismatch error!"
    echo "$OUTPUT" | grep -o 'Invalid locale passed to getRequestConfig[^<]*'
    exit 0
  fi
  sleep 3
done
