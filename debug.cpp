#include "debug.h"

/*
 * Default debug level.
 * This is the only place where the default is defined.
 *
 * Recommended defaults:
 * - DEBUG_OFF     for production
 * - DEBUG_INFO    for development
 */
DebugLevel debugLevel = DEBUG_INFO;
