#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";

// For Wokwi Private IoT Gateway / VS Code local backend:
//   http://host.wokwi.internal:3000
// For Wokwi's public online gateway, replace this with a public HTTPS URL
// that forwards to your backend, e.g. an ngrok or Cloudflare Tunnel URL.
const char* API_BASE_URL = "http://sharpness-agreeably-saved.ngrok-free.dev";

const char* DEVICE_ID = "esp32-main-01";

const int LOAD_SENSOR_PIN = 34;
const int RELAY_LED_PIN = 26;
const int STATUS_LED_PIN = 2;

unsigned long lastTelemetryMs = 0;
unsigned long lastRelayPollMs = 0;
bool relayOn = true;
WiFiClient plainClient;
WiFiClientSecure secureClient;

String endpoint(const char* path) {
  String base = API_BASE_URL;
  if (base.endsWith("/")) {
    base.remove(base.length() - 1);
  }
  return base + path;
}

bool usesHttps(const String& url) {
  return url.startsWith("https://");
}

bool beginHttp(HTTPClient& http, const String& url) {
  http.setTimeout(8000);
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);

  if (usesHttps(url)) {
    secureClient.setInsecure();
    return http.begin(secureClient, url);
  }

  return http.begin(plainClient, url);
}

void addTunnelHeaders(HTTPClient& http) {
  http.addHeader("ngrok-skip-browser-warning", "true");
  http.addHeader("User-Agent", "PowerTrack-Wokwi-ESP32/1.0");
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD, 6);

  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(200);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("WiFi connected, IP: ");
  Serial.println(WiFi.localIP());
}

int postJson(const String& url, const String& body) {
  HTTPClient http;
  if (!beginHttp(http, url)) {
    Serial.print("POST ");
    Serial.print(url);
    Serial.println(" -> begin failed");
    return -1000;
  }

  http.addHeader("Content-Type", "application/json");
  addTunnelHeaders(http);
  int code = http.POST(body);
  String response = http.getString();
  http.end();

  Serial.print("POST ");
  Serial.print(url);
  Serial.print(" -> ");
  Serial.print(code);
  if (code < 0) {
    Serial.print(" ");
    Serial.print(http.errorToString(code));
  }
  if (response.length()) {
    Serial.print(" ");
    Serial.print(response);
  }
  Serial.println();
  return code;
}

void registerDevice() {
  String body = "{";
  body += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
  body += "\"label\":\"Wokwi ESP32 Energy Node\",";
  body += "\"relay_pin\":\"GPIO26\",";
  body += "\"is_essential\":true,";
  body += "\"current_state\":\"on\"";
  body += "}";

  postJson(endpoint("/api/devices"), body);
}

void pollRelayCommand() {
  String url = endpoint("/api/devices/relay");
  HTTPClient http;
  if (!beginHttp(http, url)) {
    Serial.print("Relay poll ");
    Serial.print(url);
    Serial.println(" -> begin failed");
    return;
  }

  addTunnelHeaders(http);
  int code = http.GET();
  String payload = http.getString();
  http.end();

  if (code == 200) {
    if (payload.indexOf("\"relay_state\":\"OFF\"") >= 0) {
      relayOn = false;
    } else if (payload.indexOf("\"relay_state\":\"ON\"") >= 0) {
      relayOn = true;
    }
  }

  digitalWrite(RELAY_LED_PIN, relayOn ? HIGH : LOW);

  Serial.print("Relay poll ");
  Serial.print(url);
  Serial.print(" -> ");
  Serial.print(code);
  if (code < 0) {
    Serial.print(" ");
    Serial.print(http.errorToString(code));
  }
  Serial.print(" state=");
  Serial.println(relayOn ? "ON" : "OFF");
}

void sendTelemetry() {
  int raw = analogRead(LOAD_SENSOR_PIN);
  float demandRatio = raw / 4095.0;
  float voltage = 228.0 + 5.0 * sin(millis() / 8000.0);
  float powerWatts = relayOn ? 80.0 + (demandRatio * 920.0) : 0.0;
  float current = voltage > 0.0 ? powerWatts / voltage : 0.0;

  String body = "{";
  body += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
  body += "\"voltage\":" + String(voltage, 2) + ",";
  body += "\"current\":" + String(current, 3) + ",";
  body += "\"power_watts\":" + String(powerWatts, 1);
  body += "}";

  postJson(endpoint("/api/readings"), body);
}

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_LED_PIN, OUTPUT);
  pinMode(STATUS_LED_PIN, OUTPUT);
  pinMode(LOAD_SENSOR_PIN, INPUT);

  digitalWrite(RELAY_LED_PIN, HIGH);
  connectWiFi();
  if (String(API_BASE_URL).indexOf("your-ngrok-url") >= 0) {
    Serial.println("WARNING: Replace API_BASE_URL with your real tunnel URL before running.");
  }
  registerDevice();
  pollRelayCommand();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    digitalWrite(STATUS_LED_PIN, LOW);
    connectWiFi();
  }

  digitalWrite(STATUS_LED_PIN, millis() % 1000 < 500 ? HIGH : LOW);

  unsigned long now = millis();
  if (now - lastRelayPollMs >= 3000) {
    lastRelayPollMs = now;
    pollRelayCommand();
  }

  if (now - lastTelemetryMs >= 5000) {
    lastTelemetryMs = now;
    sendTelemetry();
  }
}
