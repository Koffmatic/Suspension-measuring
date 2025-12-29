#include "serial_cli.h"

#include <Arduino.h>
#include "BriterEncoder.h"
#include "measurements.h"
#include "show_values.h"

static String command;

void initSerialCli()
{
    Serial.begin(115200);
    Serial.println();
    Serial.println("Serial CLI ready. Type 'help' for commands.");
    initShowValues();
}

static void printHelp()
{
    Serial.println();
    Serial.println("Available commands:");
    Serial.println("  help");
    Serial.println("  status");
    Serial.println("  zeroall");
    Serial.println("  zero <id>   (3..6)");
    Serial.println();
}

static void printStatus()
{
    Serial.println("Measured lengths:");
    for (int i = 0; i < 4; i++) {
        Serial.print("  ID ");
        Serial.print(i + 3);
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
    else {
        Serial.print("Unknown command: ");
        Serial.println(command);
        Serial.println("Type 'help'");
    }

    ShowValues();
}
