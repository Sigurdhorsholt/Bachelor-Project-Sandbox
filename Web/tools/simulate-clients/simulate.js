/*
  Simple SignalR client simulator for testing the /hub/meetings hub as multiple Attendees.

  Usage (Windows cmd):
    set JWT_KEY=your_jwt_signing_secret
    set JWT_ISSUER=fa-live-mvp
    set SIGNALR_URL=http://localhost:5000/hub/meetings
    set CLIENT_COUNT=10
    node simulate.js

  Environment variables (defaults):
    SIGNALR_URL - default: http://localhost:5000/hub/meetings
    JWT_KEY      - REQUIRED
    JWT_ISSUER   - default: fa-live-mvp
    CLIENT_COUNT - default: 5
    START_DELAY_MS - default: 200 (ms between client connects)
*/

const { HubConnectionBuilder, LogLevel } = require('@microsoft/signalr');
const jwt = require('jsonwebtoken');

const SIGNALR_URL = process.env.SIGNALR_URL || 'http://localhost:5000/hub/meetings';
const JWT_KEY = process.env.JWT_KEY;
const JWT_ISSUER = process.env.JWT_ISSUER || 'fa-live-mvp';
const CLIENT_COUNT = parseInt(process.env.CLIENT_COUNT || '5', 10);
const START_DELAY_MS = parseInt(process.env.START_DELAY_MS || '200', 10);

if (!JWT_KEY) {
  console.error('ERROR: JWT_KEY environment variable is required.');
  process.exit(1);
}

function makeToken(i) {
  // Put role in common claim keys so the server's normalization picks it up
  const payload = {
    sub: `sim-${i}`,
    name: `sim-${i}`,
    role: 'Attendee',
    roles: ['Attendee']
  };

  const token = jwt.sign(payload, JWT_KEY, {
    issuer: JWT_ISSUER,
    audience: 'attendee',
    expiresIn: '1h'
  });

  return token;
}

async function createClient(i) {
  const token = makeToken(i);
  const connection = new HubConnectionBuilder()
    .withUrl(SIGNALR_URL, { accessTokenFactory: () => token })
    .configureLogging(LogLevel.Warning)
    .build();

  connection.onclose(err => console.warn(`Client ${i} closed:`, err && err.message));

  // Generic handlers - you can add handlers that match your hub methods
  connection.on('ReceiveMessage', (...args) => {
    console.log(`Client ${i} got ReceiveMessage:`, ...args);
  });

  try {
    await connection.start();
    console.log(`Client ${i} connected.`);
  } catch (err) {
    console.error(`Client ${i} failed to connect:`, err && err.message ? err.message : err);
  }

  return connection;
}

(async () => {
  console.log(`Simulator starting: url=${SIGNALR_URL} clients=${CLIENT_COUNT} issuer=${JWT_ISSUER}`);

  const clients = [];
  for (let i = 1; i <= CLIENT_COUNT; i++) {
    const client = await createClient(i);
    clients.push(client);
    await new Promise(r => setTimeout(r, START_DELAY_MS));
  }

  console.log(`${clients.length} clients created. Press Ctrl+C to exit.`);

  // Keep process alive
  process.stdin.resume();
})();

