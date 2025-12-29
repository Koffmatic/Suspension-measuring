#include "measurements.h"
#include "BriterEncoder.h"

float measuredLength[4] = {0};

void initMeasurements()
{
}

void handleCANMessage(const twai_message_t& msg)
{
    uint8_t id;
    int32_t raw;

    if (!BriterEncoder::parseReadResponse(msg, id, raw))
        return;

    int idx = id - BriterEncoder::FIRST_ID;

    float value = (485.0f / 32767.0f) * raw;
    if (value > 700.0f) value -= 1455.0f;

    measuredLength[idx] = value;
}
