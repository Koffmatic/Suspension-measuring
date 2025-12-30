#pragma once
#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>

#include "can_bus.h"

/* =========================
 *  SDLOG_VERSION
 * ========================= 
 * NOTE!!!
 * Increment this value whenever:
 *  - any record structure changes
 *  - record type meanings change
 *  - record ordering or binary layout changes
 *
 * This version is written once at the beginning of each log file.
 * Offline parsers MUST check this value before decoding.
 */
#define SDLOG_VERSION 0x01

/* =========================
 *  SDLOG RECORD TYPES
 * ========================= */

typedef enum : uint8_t {
    REC_SENSORS  = 0x01,    // Suspension, IMU, future sensors
    REC_VEHICLE  = 0x02,    // CAN bus (ECU, speed, RPM, etc)
    REC_SNIFF    = 0x03,    // RAW sniffing without scaling
} SdlogRecordType;

/* =========================
 *  RECORD DEFINITIONS
 * ========================= */

// --- Sensor record (example, existing structure) ---
typedef struct __attribute__((packed)) {
    uint8_t  type;       // REC_SENSORS
    uint64_t ts_us;
    /* sensor payload continues */
} SdlogSensorRecord;

// --- Vehicle / CAN record ---
typedef struct __attribute__((packed)) {
    uint8_t  type;       // REC_VEHICLE
    uint64_t ts_us;
    uint32_t can_id;
    uint8_t  dlc;
    uint8_t  data[8];
} SdlogVehicleRecord;

// --- Sniff record --- //
typedef struct __attribute__((packed)) {
    uint8_t  type;      // REC_SNIFF
    uint64_t ts_us;
    uint32_t can_id;
    uint8_t  dlc;
    uint8_t  data[8];
} SdlogSniffRecord;

/* =========================
 *  SDLOG API
 * ========================= */

bool sdlog_init(void);
bool sdlog_start(void);
void sdlog_stop(void);

bool sdlog_push(const void* data, size_t len);

bool sdlog_is_running(void);
uint32_t sdlog_dropped(void);

void sdlog_log_sniff(const CanFrame& frame);
void sdlog_log_vehicle_frame(uint32_t can_id,
                             uint8_t dlc,
                             const uint8_t* data);
