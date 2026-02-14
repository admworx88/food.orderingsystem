---
name: kill-port
description: Find and kill the process running on port 3000 (or user-specified port)
---

# Kill Port

Quickly kill the process running on a specified port (defaults to 3000).

## What This Does

1. Uses `lsof` to find the process ID (PID) listening on the port
2. Kills the process with `kill -9` (force kill)
3. Verifies the port is freed

## Usage

User can say:
- "kill port 3000"
- "free up port 3000"
- "something is running on port 3000"
- "kill the dev server"

## Implementation

```bash
# Default to port 3000 if not specified
PORT=${1:-3000}

echo "Looking for processes on port $PORT..."

# Find and kill the process
PID=$(lsof -ti:$PORT)

if [ -z "$PID" ]; then
  echo "✅ No process found on port $PORT"
  exit 0
fi

echo "Found process $PID on port $PORT"
kill -9 $PID

# Wait a moment for the process to die
sleep 1

# Verify it's gone
if lsof -ti:$PORT > /dev/null 2>&1; then
  echo "❌ Failed to kill process on port $PORT"
  exit 1
else
  echo "✅ Successfully killed process on port $PORT"
fi
```

## Notes

- Uses `kill -9` (SIGKILL) which cannot be caught by the process
- Common for Next.js dev server that didn't shut down cleanly
- Port 3000 is the default for `npm run dev` in this project
