#include <Arduino.h>
#include "../config.h"

#include "can_bus.h"
#include "BriterEncoder.h"
#include "measurements.h"
#include "serial_cli.h"
// #include "ota_update.h"   // myöhemmin

// Active encoder ID (Briter encoders start from ID 3)
uint8_t actID = 3;
const uint8_t FIRST_ID = 3;
const uint8_t LAST_ID  = 6;


void setup()
{
    initSerialCli();
    initCAN();
    initMeasurements();
    // initOTA();
}

void loop()
{
    handleCAN();

    static uint32_t lastPoll = 0;
    if (millis() - lastPoll >= 10) {
        BriterEncoder::sendRead(actID);

        actID++;
        if (actID > BriterEncoder::LAST_ID)
            actID = BriterEncoder::FIRST_ID;

        lastPoll = millis();
    }

    handleSerialCli();
}
