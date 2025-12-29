#include "measurements.h"
#include "BriterEncoder.h"
#include "debug.h"

float measuredLength[BriterEncoder::NUM_ENCODERS] = {0};

void initMeasurements()
{
    // Nothing to init yet
}

void handleCANMessage(const twai_message_t& msg)
{
    uint8_t id;
    int32_t raw;

    // Try to parse Briter READ response
    if (!BriterEncoder::parseReadResponse(msg, id, raw)) {
        DBG_VERBOSE("[MEAS][DROP] frame not read response");
        DBG_VERBOSEF("[MEAS][DROP] ID=0x%lX DLC=%d\n",
                     msg.identifier,
                     msg.data_length_code);
        return;
    }

    // Validate encoder ID
    if (id < BriterEncoder::FIRST_ID || id > BriterEncoder::LAST_ID) {
        DBG_VERBOSEF("[MEAS][DROP] invalid encoder ID=%d\n", id);
        return;
    }

    // Convert ID to array index
    int idx = id - BriterEncoder::FIRST_ID;
    if (idx < 0 || idx >= BriterEncoder::NUM_ENCODERS) {
        DBG_ERRORF("[MEAS][ERR] index out of range id=%d idx=%d\n", id, idx);
        return;
    }

    // Convert raw value to physical length
    float value = (485.0f / 32767.0f) * raw;
    if (value > 700.0f) {
        value -= 1455.0f;
    }

    measuredLength[idx] = value;

    // Verbose debug only
    DBG_VERBOSEF("[MEAS] ID=%d raw=%ld val=%.2f\n",
                 id, raw, value);
}
