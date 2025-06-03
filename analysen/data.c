#include "data.h"
#include <stdio.h>
#include <stdlib.h>

///// DATA /////
static DatastreamNode datastreamList = {.datastream = 0,
                                        .next = NULL};

///// DEFINES /////
#define stringTransfer(start, size, string, stringSize) do{     \
    snprintf(start, size, string);                              \
    start += stringSize;                                        \
    size -= stringSize;                                         \
}while(0)

///// FUNCTIONS /////
void 
DATA_datastreamsJson(char** datastreamJsonString, int* datastreamJsonStringLength)
{   int datastreamsAmount = 0;
    DatastreamNode* datastreamListEnd = &datastreamList;   
    while( datastreamListEnd->next != NULL )
    {   datastreamListEnd = datastreamListEnd->next;
        datastreamsAmount ++;
    }   

    int jsonStringLength = 30;                                                  // base length of the json string and terminating \0
    jsonStringLength += 60*datastreamsAmount;                                   // extra length for the color(41) and device(19) attrebutes of each datastream
    jsonStringLength += datastreamsAmount > 1 ? 4*(datastreamsAmount-1) : 0;    // extra length for the commas inbetween attrebutes

    char* jsonString = malloc(sizeof(char)*jsonStringLength);
    if (jsonString == NULL){return;}

    char* jsonStringPosition = jsonString;
    int remainingSize = jsonStringLength;

    *datastreamJsonStringLength = jsonStringLength;
    *datastreamJsonString = jsonString;

    // colors
    stringTransfer(jsonStringPosition, remainingSize, "{\"colors\": [", 12);
    DatastreamNode* currentNode = &datastreamList;   
    while( currentNode->next != NULL )
    {   currentNode = currentNode->next;
        stringTransfer(jsonStringPosition, remainingSize, "{\"color\": {\"r\": ", 16);
        stringTransfer(jsonStringPosition, remainingSize, "100", 3);
        stringTransfer(jsonStringPosition, remainingSize, ", \"g\": ", 7);
        stringTransfer(jsonStringPosition, remainingSize, "100", 3);
        stringTransfer(jsonStringPosition, remainingSize, ", \"b\": ", 7);
        stringTransfer(jsonStringPosition, remainingSize, "100", 3);
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

void
DATA_startup()
{   Datastream datastream1 = {"1002345", {0, 0, 255}};
    datastreamAdd(datastream1);
    Datastream datastream2 = {"2993450", {255, 0, 0}};
    datastreamAdd(datastream2);
}

void
DATA_proceed()
{   
}