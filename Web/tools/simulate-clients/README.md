SignalR Client Simulator

This small Node.js script opens multiple SignalR connections to the `/hub/meetings` hub and authenticates each connection with a JWT that contains the `Attendee` role. It's useful to simulate many frontend attendees without opening browser windows.

Quick start (Windows cmd):

1. Open a cmd.exe and navigate to this folder:

   cd /d C:\Users\sigur\Documents\GitHub\Bachelor-Project-Sandbox\Web\tools\simulate-clients

2. Install dependencies:

   npm install

3. Run the simulator (example):

   set JWT_KEY=your_jwt_signing_secret
   set JWT_ISSUER=fa-live-mvp
   set SIGNALR_URL=http://localhost:5000/hub/meetings
   set CLIENT_COUNT=10
   node simulate.js

Notes:
- The simulator signs tokens locally using `JWT_KEY`. Provide the same signing secret used by your Web API (from `Jwt:Key` in your configuration).
- The token audience is set to `attendee` to match the server's expected audiences.
- You can tune `START_DELAY_MS` and `CLIENT_COUNT` via environment variables.
- The script registers a sample handler for `ReceiveMessage`. Add handlers/invocations to match your hub API.
{
  "name": "signalr-client-simulator",
  "version": "1.0.0",
  "description": "Simple simulator that opens multiple SignalR connections with Attendee JWTs",
  "main": "simulate.js",
  "scripts": {
    "start": "node simulate.js"
  },
  "dependencies": {
    "@microsoft/signalr": "^7.0.5",
    "jsonwebtoken": "^9.0.0"
  }
}

