#ifndef __CONFIG_H__
#define __CONFIG_H__

#include <driver/gpio.h>   // <-- IMPORTANT!!

/*
* ## Board settings on IDE ##
*
* Board:	          ESP32 Dev Module
* Upload Speed:	    921600
* CPU Frequency:	  240MHz (WiFi)
* Flash Mode:	      QIO
* Flash Size:	      4MB (32Mb)
* Core Debug Level:	None
* PSRAM:	          Disable
* Arduino Runs On:	Core 1
*/

// PIN definitions (typed, ESP-IDF compatible)
#define PIN_5V_EN    GPIO_NUM_16

#define CAN_TX_PIN   GPIO_NUM_27
#define CAN_RX_PIN   GPIO_NUM_26
#define CAN_SE_PIN   GPIO_NUM_23

#define RS485_EN_PIN GPIO_NUM_17
#define RS485_TX_PIN GPIO_NUM_22
#define RS485_RX_PIN GPIO_NUM_21
#define RS485_SE_PIN GPIO_NUM_19

#define SD_MISO_PIN  GPIO_NUM_2
#define SD_MOSI_PIN  GPIO_NUM_15
#define SD_SCLK_PIN  GPIO_NUM_14
#define SD_CS_PIN    GPIO_NUM_13

#define WS2812_PIN   GPIO_NUM_4

#endif
