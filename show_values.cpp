#include "measurements.h"
#include <Arduino.h>

void initShowValues()
{
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
