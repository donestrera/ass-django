#include <Adafruit_Sensor.h>
#include <DHT.h>
#include <DHT_U.h>

// Pins for sensors and components
#define PIR_PIN 3           // PIR motion sensor pin
#define SMOKE_SENSOR_PIN A1 // Smoke sensor pin
#define DHT_PIN 2           // DHT sensor pin
#define LED_PIN 13          // LED pin (shared for smoke sensor and PIR)
#define BELL_PIN 12         // Fire alarm bell pin

// PIR motion sensor variables
bool pirMotionDetected = false;
bool motionFirstDetected = false;           // Flag for first detection
unsigned long motionStartTime = 0;          // Time when motion was first detected
const unsigned long MOTION_TIMEOUT = 10000; // 10 seconds, ma on ang sensor if maka detect ug motion
bool pirEnabled = true;                     // Flag to control PIR sensor state

// Smoke sensor variables
const int SMOKE_THRESHOLD = 210; // amount sa data para ma trigger ang smoke
const int SMOKE_HYSTERESIS = 5;
#define SAMPLE_SIZE 3 // mura ni cya ug margin data
int smokeSamples[SAMPLE_SIZE];
int smokeIndex = 0;
int smokeTotal = 0;
bool smokeDetected = false;
unsigned long smokeAlarmTimer = 0;
const unsigned long ALARM_DURATION = 10000; // 10 seconds in milliseconds

// DHT sensor variables
#define DHTTYPE DHT22
DHT_Unified dht(DHT_PIN, DHTTYPE);
uint32_t dhtDelayMS;

// Function prototypes
void addSmokeSample(int value);
int getSmokeAverage();
void printSensorData(float temperature, float humidity, const char *motionStatus, const char *smokeStatus);

void setup()
{
  Serial.begin(9600);
  pinMode(PIR_PIN, INPUT);
  pinMode(SMOKE_SENSOR_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BELL_PIN, OUTPUT);

  digitalWrite(LED_PIN, HIGH); // LED off (HIGH)
  digitalWrite(BELL_PIN, LOW); // Alarm off (LOW)

  dht.begin();
  sensor_t sensor;
  dht.temperature().getSensor(&sensor);
  dhtDelayMS = sensor.min_delay / 1000;

  // Initialize smoke samples array
  for (int i = 0; i < SAMPLE_SIZE; i++)
  {
    smokeSamples[i] = 0;
  }
}

void loop()
{
  unsigned long currentMillis = millis();

  // --- PIR Motion Sensor with 10-second active duration ---
  int motionState = digitalRead(PIR_PIN);

  // Only process motion if PIR is enabled
  if (pirEnabled)
  {
    // Check for new motion detection
    if (motionState == HIGH)
    {
      if (!pirMotionDetected)
      {
        // First time motion is detected
        pirMotionDetected = true;
        motionFirstDetected = true; // Set flag for first detection
        motionStartTime = currentMillis;
        digitalWrite(LED_PIN, LOW); // LED on
      }
      else
      {
        // Motion is still being detected, update the timer
        motionStartTime = currentMillis;
      }
    }

    // Check if motion has timed out
    if (pirMotionDetected && (currentMillis - motionStartTime >= MOTION_TIMEOUT))
    {
      pirMotionDetected = false;
      motionFirstDetected = false;
      digitalWrite(LED_PIN, HIGH); // LED off
    }
  }
  else
  {
    // If PIR is disabled, ensure motion detection is off
    if (pirMotionDetected)
    {
      pirMotionDetected = false;
      motionFirstDetected = false;
      digitalWrite(LED_PIN, HIGH); // LED off
    }
  }

  // --- Smoke Sensor ---
  int rawSmokeData = analogRead(SMOKE_SENSOR_PIN);
  addSmokeSample(rawSmokeData);
  int smokeAverage = getSmokeAverage();

  if (smokeAverage >= SMOKE_THRESHOLD + SMOKE_HYSTERESIS && !smokeDetected)
  {
    digitalWrite(LED_PIN, LOW);   // LED on
    digitalWrite(BELL_PIN, HIGH); // Activate alarm
    smokeDetected = true;
    smokeAlarmTimer = currentMillis;
  }
  else if (smokeDetected && currentMillis - smokeAlarmTimer >= ALARM_DURATION)
  {
    digitalWrite(LED_PIN, HIGH); // LED off
    digitalWrite(BELL_PIN, LOW); // Deactivate alarm
    smokeDetected = false;
  }

  // --- DHT Sensor ---
  delay(dhtDelayMS);
  sensors_event_t event;
  float temperature = NAN, humidity = NAN;

  dht.temperature().getEvent(&event);
  if (!isnan(event.temperature))
  {
    temperature = event.temperature;
  }

  dht.humidity().getEvent(&event);
  if (!isnan(event.relative_humidity))
  {
    humidity = event.relative_humidity;
  }

  // Send sensor data update with motion first detection flag
  static unsigned long lastPrintTime = 0;
  if (currentMillis - lastPrintTime >= 1000)
  { // Update every second
    bool shouldReportMotion = pirEnabled && pirMotionDetected && motionFirstDetected;
    if (shouldReportMotion)
    {
      motionFirstDetected = false; // Reset the flag after reporting
    }

    printSensorData(temperature, humidity,
                    shouldReportMotion ? "Motion is Detected!" : "No Motion",
                    smokeDetected ? "Smoke is Detected!" : "No Smoke");
    lastPrintTime = currentMillis;
  }

  // Check for serial commands
  if (Serial.available() > 0)
  {
    String command = Serial.readStringUntil('\n');
    command.trim();

    if (command == "PIR_ON")
    {
      pirEnabled = true;
      Serial.println("{\"message\":\"PIR sensor enabled\"}");
    }
    else if (command == "PIR_OFF")
    {
      pirEnabled = false;
      pirMotionDetected = false;
      digitalWrite(LED_PIN, HIGH); // LED off
      Serial.println("{\"message\":\"PIR sensor disabled\"}");
    }
  }

  delay(50); // Small delay for stability
}

void addSmokeSample(int value)
{
  smokeTotal -= smokeSamples[smokeIndex];
  smokeSamples[smokeIndex] = value;
  smokeTotal += value;
  smokeIndex = (smokeIndex + 1) % SAMPLE_SIZE;
}

int getSmokeAverage()
{
  return smokeTotal / SAMPLE_SIZE;
}

void printSensorData(float temperature, float humidity, const char *motionStatus, const char *smokeStatus)
{
  // Create JSON format string
  Serial.print("{");
  Serial.print("\"temperature\":");
  Serial.print(isnan(temperature) ? "null" : String(temperature));
  Serial.print(",\"humidity\":");
  Serial.print(isnan(humidity) ? "null" : String(humidity));
  Serial.print(",\"motionDetected\":");
  Serial.print(pirMotionDetected ? "true" : "false");
  Serial.print(",\"smokeDetected\":");
  Serial.print(strcmp(smokeStatus, "Smoke is Detected!") == 0 ? "true" : "false");
  Serial.println("}");
}