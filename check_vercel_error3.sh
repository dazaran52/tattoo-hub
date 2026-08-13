#!/bin/bash
while true; do
  OUTPUT=$(curl -s https://tattoo-hub.xyz/ru)
  if ! echo "$OUTPUT" | grep -q 'Error: NEXT_NOT_FOUND' && ! echo "$OUTPUT" | grep -q 'GET_MESSAGES FAILED'; then
    echo "NEW BUILD DEPLOYED! Site is working or threw a different error!"
    echo "$OUTPUT" | grep -o 'Error: [^<]*' || echo "NO ERRORS FOUND IN HTML. Site is back up!"
    exit 0
  fi
  sleep 3
done
