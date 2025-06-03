#include "data.h"

#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>

#include "config.h"

///// DATA /////
static DatastreamNode datastreamList = {.datastream = 0,
                                        .next = NULL};
static DataPoint sendQueue[CFG_sendQueueLength] = {0};
static int sendQueueHead = 0;
static int sendQueueTail = 0;
///// DEFINES /////
#define stringTransfer(start, size, string, stringSize) do{     \
    snprintf(start, size, string);                              \
    start += stringSize;                                        \
    size -= stringSize;                                         \
}while(0)

///// FUNCTIONS /////
static void 
DATA_intToString(int number, char** res, int* length)
{   if (number == 0) 
    {   (*res)[0] = '0';
        *length = 1;
        return;
    }
    int pos = 1;
    int stringLength = 0;
    while (pos <= number)
    {   pos *= 10;
    }
    for (int i = 0; i < CFG_floatToStringBufferSize/2; i++)
    {   pos /= 10;
        (*res)[i] =  (number/pos)%10 + '0';
        stringLength ++;
        if (pos == 1)
        {   break;
        }
    }
    *length = stringLength;
}

static void
DATA_floatToString(float number, char** res, int* lenght)
{   char* string = *res;
    *lenght = 0;
    if (number < 0)
    {   number *= -1;
        *lenght+=1;
        string[0] = '-';
        string += 1;
    }else
    {

    }

    int intergerPart = (int)number;
    int floatPart = (int)((number - (float)intergerPart + 1)*CFG_floatPrecision);
    int integerPartLength;
    DATA_intToString(intergerPart, &string, &integerPartLength);
    int floatPartLength;
    char* res_ = string+integerPartLength;
    DATA_intToString(floatPart, &res_, &floatPartLength);
    string[integerPartLength] = '.';
    string[floatPartLength+integerPartLength] = '\0';
    
    *lenght += integerPartLength + floatPartLength;
}

void 
DATA_datastreamsJson(char** datastreamJsonString, int* datastreamJsonStringLength)
{   int datastreamsAmount = 0;
    DatastreamNode* datastreamListEnd = &datastreamList;   
    while( datastreamListEnd->next != NULL )
    {   datastreamListEnd = datastreamListEnd->next;
        datastreamsAmount ++;
    }   

    char jsonString[CFG_dataJsonStringBufferSize] = {0};
    char* jsonStringPosition = jsonString;
    int remainingSize = CFG_dataJsonStringBufferSize;

    char stringBufferArray[CFG_floatToStringBufferSize];
    char* stringBuffer = stringBufferArray;
    int stringSize;

    // colors
    stringTransfer(jsonStringPosition, remainingSize, "{\"colors\": [", 12);
    DatastreamNode* currentNode = &datastreamList;   
    while( currentNode->next != NULL )
    {   currentNode = currentNode->next;
        stringTransfer(jsonStringPosition, remainingSize, "{\"color\": {\"r\": ", 16);
        DATA_intToString(currentNode->datastream.color.r, &stringBuffer, &stringSize);
        stringTransfer(jsonStringPosition, remainingSize, stringBuffer, stringSize);
        stringTransfer(jsonStringPosition, remainingSize, ", \"g\": ", 7);
        DATA_intToString(currentNode->datastream.color.g, &stringBuffer, &stringSize);
        stringTransfer(jsonStringPosition, remainingSize, stringBuffer, stringSize);
        stringTransfer(jsonStringPosition, remainingSize, ", \"b\": ", 7);
        DATA_intToString(currentNode->datastream.color.b, &stringBuffer, &stringSize);
        stringTransfer(jsonStringPosition, remainingSize, stringBuffer, stringSize);
        stringTransfer(jsonStringPosition, remainingSize, "}}", 2);
        if (currentNode->next != NULL)
        {   stringTransfer(jsonStringPosition, remainingSize, ", ", 2);
        }
    }   
    // devices
    stringTransfer(jsonStringPosition, remainingSize, "], \"devices\": [", 15);
    currentNode = &datastreamList;   
    while( currentNode->next != NULL )
    {   currentNode = currentNode->next;
        stringTransfer(jsonStringPosition, remainingSize, "{\"UUID\": \"", 10);
        stringTransfer(jsonStringPosition, remainingSize, currentNode->datastream.UUID, 7);
        stringTransfer(jsonStringPosition, remainingSize, "\"}", 2);
        if (currentNode->next != NULL)
        {   stringTransfer(jsonStringPosition, remainingSize, ", ", 2);
        }
    }
    // end
    stringTransfer(jsonStringPosition, remainingSize, "]}\0", 3);

    *datastreamJsonString = jsonString;
    *datastreamJsonStringLength = CFG_dataJsonStringBufferSize - remainingSize;
}

static void
datastreamAdd(Datastream datastream)
{   DatastreamNode* datastreamListEnd = &datastreamList;   
    while( datastreamListEnd->next != NULL )
    {   datastreamListEnd = datastreamListEnd->next;
    }
    DatastreamNode* newNode = malloc(sizeof(DatastreamNode));
    if (newNode == NULL){return;}
    newNode->datastream = datastream;
    newNode->next = NULL;
    datastreamListEnd->next = newNode;
}

static int
DATA_pullSendDataQueue(DataPoint* dataPoint)
{   if (sendQueueHead == sendQueueTail) { return 1; }
    *dataPoint = sendQueue[sendQueueTail];
    sendQueueTail = (sendQueueTail+1)%CFG_sendQueueLength;
    return 0;
}

static void
DATA_pushSendDataQueue(DataPoint* dataPoint)
{   sendQueue[sendQueueHead] = *dataPoint;
    sendQueueHead = (sendQueueHead+1)%CFG_sendQueueLength;
    if (sendQueueHead == sendQueueTail) 
    {   sendQueueTail = (sendQueueTail+1)%CFG_sendQueueLength; 
    }
}

int
DATA_pullSendDataQueueJson(char** dataPointJsonString, int* dataPointJsonStringLength)
{   DataPoint dataPoint;
    if (DATA_pullSendDataQueue(&dataPoint)) { return 1; }
    char jsonString[CFG_dataJsonStringBufferSize] = {0};
    char* jsonStringPosition = jsonString;
    int remainingSize = CFG_dataJsonStringBufferSize;

    char stringBufferArray[CFG_floatToStringBufferSize];
    char* stringBuffer = stringBufferArray;
    int stringSize;

    stringTransfer(jsonStringPosition, remainingSize, "{\"devices\": [", 13);
    for (int i = 0; i < dataPoint.devicesAmount; i++)
    {   stringTransfer(jsonStringPosition, remainingSize, "\"", 1);
        stringTransfer(jsonStringPosition, remainingSize, dataPoint.devices[i], 7);   
        stringTransfer(jsonStringPosition, remainingSize, "\"", 1);
        if (i != dataPoint.devicesAmount-1)
        {   stringTransfer(jsonStringPosition, remainingSize, ", ", 2);
        }
    }
    stringTransfer(jsonStringPosition, remainingSize, "], \"data\": [{\"timestamp\": ", 26);
    DATA_floatToString(dataPoint.timestamp, &stringBuffer, &stringSize);
    stringTransfer(jsonStringPosition, remainingSize, stringBuffer, stringSize);
    stringTransfer(jsonStringPosition, remainingSize, ", \"value\": [", 12);
    for (int i = 0; i < dataPoint.devicesAmount; i++)
    {   DATA_floatToString(dataPoint.values[i], &stringBuffer, &stringSize);
        stringTransfer(jsonStringPosition, remainingSize, stringBuffer, stringSize);  
        if (i != dataPoint.devicesAmount-1)
        {   stringTransfer(jsonStringPosition, remainingSize, ", ", 2);
        }
    }
    stringTransfer(jsonStringPosition, remainingSize, "]}]}\0", 5);

    *dataPointJsonString = jsonString;
    *dataPointJsonStringLength = CFG_dataJsonStringBufferSize - remainingSize;

    return 0;
}

void
DATA_startup()
{   // testdata:
    static Datastream datastream1 = {"1002345", {1, 100, 255}};
    datastreamAdd(datastream1);
    static Datastream datastream2 = {"2993450", {255, 99, 0}};
    datastreamAdd(datastream2);

    static char* devices[] = {"1002345", "2993450"};
    static float data0[] = {0.0, 2.0};
    static float data1[] = {-1.0, 2.2};
    static float data2[] = {0.0, 2.8};
    static float data3[] = {-1.0, 3.0};
    static float data4[] = {0.0, 2.8};
    static float data5[] = {-1.0, 2.2};
    static float data6[] = {0.0, 2.0};
    static float data7[] = {-1.0, 2.2};
    static float data8[] = {0.0, 2.8};
    static float data9[] = {-1.0, 3.0};

    static DataPoint datapoint0 = {17485.42, 2, devices, data0};
    static DataPoint datapoint1 = {17486.43, 2, devices, data1};
    static DataPoint datapoint2 = {17487.44, 2, devices, data2};
    static DataPoint datapoint3 = {17488.45, 2, devices, data3};
    static DataPoint datapoint4 = {17489.46, 2, devices, data4};
    static DataPoint datapoint5 = {17490.47, 2, devices, data5};
    static DataPoint datapoint6 = {17491.48, 2, devices, data6};
    static DataPoint datapoint7 = {17492.49, 2, devices, data7};
    static DataPoint datapoint8 = {17493.50, 2, devices, data8};
    static DataPoint datapoint9 = {17494.51, 2, devices, data9};
    
    DATA_pushSendDataQueue(&datapoint0);
    DATA_pushSendDataQueue(&datapoint1);
    DATA_pushSendDataQueue(&datapoint2);
    DATA_pushSendDataQueue(&datapoint3);
    DATA_pushSendDataQueue(&datapoint4);
    DATA_pushSendDataQueue(&datapoint5);
    DATA_pushSendDataQueue(&datapoint6);
    DATA_pushSendDataQueue(&datapoint7);
    DATA_pushSendDataQueue(&datapoint8);
    DATA_pushSendDataQueue(&datapoint9);
}

void
DATA_proceed()
{   
}