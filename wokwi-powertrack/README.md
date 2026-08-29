# PowerTrack Wokwi ESP32 Bridge

This folder contains a drop-in Wokwi ESP32 project that connects a simulated energy node to the PowerTrack backend.

## What it does

- Connects to Wokwi WiFi using `Wokwi-GUEST`
- Registers the node through `POST /api/devices`
- Sends telemetry every 5 seconds to `POST /api/readings`
- Polls relay commands every 3 seconds from `GET /api/devices/relay`
- Uses the potentiometer as the simulated load level
- Uses the green LED as the simulated relay output

## Backend target

The sketch is set to:

```cpp
const char* API_BASE_URL = "http://host.wokwi.internal:3000";
```

Use that value when the simulator can reach your local computer through the Wokwi Private IoT Gateway or Wokwi for VS Code.

If you run the project on the public Wokwi website without the private gateway, `localhost` and `host.wokwi.internal` will not reach your machine. In that case, expose the backend with a public tunnel and replace `API_BASE_URL`, for example:

```cpp
const char* API_BASE_URL = "https://your-tunnel.example.com";
```

For ngrok, point the tunnel at the backend:

```bash
ngrok http 3000
```

Then copy the generated `https://...ngrok-free.app` URL into `API_BASE_URL`. Do not leave the placeholder value in the sketch.

## Running

1. Start the backend from `backend/`:

   ```bash
   npm start
   ```

2. Start the frontend from `frontend/`:

   ```bash
   npm run dev
   ```

3. Open your Wokwi project and copy in `sketch.ino` and `diagram.json`, or open this folder through Wokwi for VS Code.
4. Run the simulation. The dashboard should update within one polling cycle.

## Smoke tests

After the ESP32 starts, these endpoints should show activity:

```bash
curl http://localhost:3000/api/readings/latest
curl http://localhost:3000/api/devices
curl http://localhost:3000/api/devices/relay
```

If you are using a tunnel, test the tunnel from your computer before starting Wokwi:

```bash
curl https://your-real-ngrok-url.ngrok-free.app/api/readings/health
curl https://your-real-ngrok-url.ngrok-free.app/api/devices/relay
```

Both commands should return JSON. If they fail locally, Wokwi will fail too.
