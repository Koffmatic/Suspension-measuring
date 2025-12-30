#include "serial_cli.h"
#include "debug.h"

#include <Arduino.h>
#include "BriterEncoder.h"
#include "measurements.h"

static String command;

static const char* debugLevelToString(DebugLevel lvl)
{
    switch (lvl) {
        case DEBUG_OFF:     return "OFF";
        case DEBUG_ERROR:   return "ERROR";
        case DEBUG_INFO:    return "INFO";
        case DEBUG_VERBOSE: return "VERBOSE";
        default:            return "UNKNOWN";
    }
}

void initSerialCli()
{
    Serial.begin(115200);
    Serial.println();
    Serial.println("Serial CLI ready. Type 'help' for commands.");
}

static void printHelp()
{
    Serial.println();
    Serial.println("Available commands:");
    Serial.println("  help");
    Serial.println("  status              Show measured values");
    Serial.println("  zero <id>           Zero encoder (ID 3..6)");
    Serial.println("  zeroall             Zero all encoders");
    Serial.println("  debug               Show current debug level");
    Serial.println("  debug off|error|info|verbose");
    Serial.println();
}

static void printStatus()
{
    Serial.println("Measured lengths:");
    for (int i = 0; i < BriterEncoder::NUM_ENCODERS; i++) {
        Serial.print("  ID ");
        Serial.print(i + BriterEncoder::FIRST_ID);
        Serial.print(": ");
        Serial.println(measuredLength[i]);
    }
}

void handleSerialCli()
{
    if (!Serial.available())
        return;

    command = Serial.readStringUntil('\n');
    command.trim();

    if (command.length() == 0)
        return;

    if (command.equalsIgnoreCase("help")) {
        printHelp();
    }
    else if (command.equalsIgnoreCase("status")) {
        printStatus();
    }
    else if (command.equalsIgnoreCase("zeroall")) {
        Serial.println("Command: ZERO ALL encoders");
        BriterEncoder::sendZeroAll();
    }
    else if (command.startsWith("zero ")) {
        int id = command.substring(5).toInt();
        if (id >= BriterEncoder::FIRST_ID && id <= BriterEncoder::LAST_ID) {
            Serial.print("Command: ZERO encoder ID ");
            Serial.println(id);
            BriterEncoder::sendZero((uint8_t)id);
        } else {
            Serial.println("Invalid ID (use 3..6)");
        }
    }
    else if (command.startsWith("debug")) {

        if (command == "debug") {
            Serial.print("Debug level: ");
            Serial.println(debugLevelToString(debugLevel));
            return;
        }

        if (command.endsWith("off")) {
            debugLevel = DEBUG_OFF;
        }
        else if (command.endsWith("error")) {
            debugLevel = DEBUG_ERROR;
        }
        else if (command.endsWith("info")) {
            debugLevel = DEBUG_INFO;
        }
        else if (command.endsWith("verbose")) {
            debugLevel = DEBUG_VERBOSE;
        }
        else {
            Serial.println("Usage: debug [off|error|info|verbose]");
            return;
        }

        Serial.print("Debug level set to ");
        Serial.println(debugLevelToString(debugLevel));
    }
    else {
        Serial.print("Unknown command: ");
        Serial.println(command);
        Serial.println("Type 'help'");
    }
}

void ShowValues()
{
    static uint32_t lastPrint = 0;
    if (millis() - lastPrint < 1000) return;
    lastPrint = millis();

    for (int i = 0; i < 4; i++) {
        Serial.print("measuredLength[");
        Serial.print(i);
        Serial.print("] = ");
        Serial.print(measuredLength[i]);
        Serial.print("  ");
    }
    Serial.println();
}