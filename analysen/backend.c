#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <libwebsockets.h>
#include <signal.h>

///// TYPE DEFFINITIONS /////

typedef struct 
{   char UUID[8];
    struct { int r, g, b; } color;
} Datastream;

typedef struct DatastreamNodeS 
{   Datastream datastream;
    struct DatastreamNodeS* next; 
} DatastreamNode;

///// DATA /////

DatastreamNode datastreamList = {   .datastream = 0,
                                    .next = NULL};

///// FUNCTIONS /////

#define stringTransfer(start, size, string, stringSize) do{     \
    snprintf(start, size, string);                              \
    start += stringSize;                                        \
    size -= stringSize;                                         \
}while(0)


static void 
datastreamsJson(char** datastreamJsonString, int* datastreamJsonStringLength)
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

static int 
incomming_callback(struct lws *wsi, enum lws_callback_reasons reason, void *user, void *in, size_t len)
{
    return 0;
}

static int 
outgoing_callback(struct lws *wsi, enum lws_callback_reasons reason, void *user, void *in, size_t len)
{
    switch (reason) {
        case LWS_CALLBACK_HTTP: {
            // Hier den URI des Antrags überprüfen
            char uri[256];
            int n = lws_hdr_copy(wsi, uri, sizeof(uri), WSI_TOKEN_GET_URI);

            if (n >= 0 && strncmp(uri, "/UUID", 5) == 0) {
                printf("yey1\n");
                // JSON Antwort erstellen
                unsigned char response[1024] = {0};
                unsigned char* res = response;
                unsigned char** bufferPosition = &res;
                unsigned char*  bufferEnd = response+sizeof(response);
                
                char* content;
                int contentLength;
                datastreamsJson(&content, &contentLength);

                // Antwort senden
                lws_add_http_common_headers(wsi, 200, "application/json; charset=utf-8", contentLength-1, bufferPosition, bufferEnd); 
                lws_finalize_http_header(wsi, bufferPosition, bufferEnd);
                snprintf(*bufferPosition, bufferEnd-*bufferPosition, content);
                lws_write(wsi, (unsigned char *)response, strlen(response), LWS_WRITE_HTTP_HEADERS);
            } else {
                // Wenn URI nicht "/UUID", dann eine Standard-Fehlermeldung senden
                const char *error_message = "404 Not Found";
                lws_write(wsi, (unsigned char *)error_message, strlen(error_message), LWS_WRITE_HTTP);
            }
            break;
        }
        default:
            break;
    }
    return 0;
}

static struct lws_protocols outgoing_protocols[] = {
    {
        .callback = outgoing_callback,
        .name = "outgoing_protocol",
        .per_session_data_size = 0,
        .rx_buffer_size = 0,
        .tx_packet_size = 0
    },
    LWS_PROTOCOL_LIST_TERM
};

static struct lws_protocols incomming_protocols[] = {
    {
        .callback = incomming_callback,
        .name = "incomming_protocol",
        .per_session_data_size = 0,
        .rx_buffer_size = 0,
        .tx_packet_size = 0
    },
    LWS_PROTOCOL_LIST_TERM
};

// Hauptfunktion
int main() {
    Datastream datastream1 = {"1002345", {0, 0, 255}};
    datastreamAdd(datastream1);
    Datastream datastream2 = {"2993450", {255, 0, 0}};
    datastreamAdd(datastream2);


    struct lws_context_creation_info info;
    struct lws_context *context;



    // Initialisierung der Konfiguration für libwebsockets
    memset(&info, 0, sizeof(info));
    info.port = 8080;  // HTTP und WebSocket-Server auf Port 8080
    info.protocols = outgoing_protocols; // HTTP-Protokoll verwenden
    info.extensions = NULL;
    info.gid = -1;
    info.uid = -1;

    context = lws_create_context(&info);
    if (!context) {
        fprintf(stderr, "libwebsockets context creation failed\n");
        return -1;
    }

    // Starten des Event Loops
    while (1) {
        // lws_service verarbeitet WebSocket- und HTTP-Anfragen
        lws_service(context, 0);
    }

    // Cleanup
    lws_context_destroy(context);
    return 0;
}