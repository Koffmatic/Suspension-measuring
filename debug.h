#pragma once
#include <Arduino.h>

/*
 * Global debug levels.
 * These are intentionally simple and ordered.
 */
enum DebugLevel : uint8_t {
    DEBUG_OFF = 0,
    DEBUG_ERROR,
    DEBUG_INFO,
    DEBUG_VERBOSE
};

/*
 * Current debug level (runtime configurable).
 * Default value is set in debug.cpp.
 */
extern DebugLevel debugLevel;

/*
 * Core debug macros.
 * These must be cheap when disabled.
 */

#define DBG_ERROR(msg) \
    do { \
        if (debugLevel >= DEBUG_ERROR) { \
            Serial.println(msg); \
        } \
    } while (0)

#define DBG_INFO(msg) \
    do { \
        if (debugLevel >= DEBUG_INFO) { \
            Serial.println(msg); \
        } \
    } while (0)

#define DBG_VERBOSE(msg) \
    do { \
        if (debugLevel >= DEBUG_VERBOSE) { \
            Serial.println(msg); \
        } \
    } while (0)

/*
 * printf-style helpers (optional but very useful for CAN/measurements)
 */
#define DBG_ERRORF(fmt, ...) \
    do { \
        if (debugLevel >= DEBUG_ERROR) { \
            Serial.printf(fmt, ##__VA_ARGS__); \
        } \
    } while (0)

#define DBG_INFOF(fmt, ...) \
    do { \
        if (debugLevel >= DEBUG_INFO) { \
            Serial.printf(fmt, ##__VA_ARGS__); \
        } \
    } while (0)

#define DBG_VERBOSEF(fmt, ...) \
    do { \
        if (debugLevel >= DEBUG_VERBOSE) { \
            Serial.printf(fmt, ##__VA_ARGS__); \
        } \
    } while (0)
