#include "outgoing.h"
#include <libwebsockets.h>
#include <stdbool.h>
#include "data.h"

///// DATA /////
static int outgoing_callback(struct lws*, enum lws_callback_reasons, void*, void*, size_t);
static struct lws_protocols outgoing_protocols[] =  {
                                                        {
                                                            .callback = outgoing_callback,
                                                            .name = "outgoing_protocol",
                                                            .per_session_data_size = 0,
                                                            .rx_buffer_size = 0,
                                                            .tx_packet_size = 0
                                                        },
                                                        LWS_PROTOCOL_LIST_TERM
                                                    };
static struct lws_context *context;
static bool websockedConnected = false;

///// FUNCTIONS /////
static int 
outgoing_callback(struct lws *wsi, enum lws_callback_reasons reason, void *user, void *in, size_t len)
{
    switch (reason) {
        case LWS_CALLBACK_HTTP: 
        {   // Hier den URI des Antrags überprüfen
            char uri[256];
            int n = lws_hdr_copy(wsi, uri, sizeof(uri), WSI_TOKEN_GET_URI);

            if (n >= 0 && strncmp(uri, "/UUID", 5) == 0) {
                // JSON Antwort erstellen
                unsigned char response[1024] = {0};
                unsigned char* res = response;
                unsigned char** bufferPosition = &res;
                unsigned char*  bufferEnd = response+sizeof(response);
                
                char* content;
                int contentLength;
                DATA_datastreamsJson(&content, &contentLength);

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
        
        case LWS_CALLBACK_RECEIVE:
        {   printf("websocket receive\n");
            lws_callback_on_writable(wsi);
            break;
        }
        
        case LWS_CALLBACK_ESTABLISHED: 
        {   printf("connection established\n");
            websockedConnected = true;
            break;
        }

        case LWS_CALLBACK_WS_PEER_INITIATED_CLOSE: 
        {   printf("connection closed\n");
            websockedConnected = false;
            break;
        }

        case LWS_CALLBACK_FILTER_PROTOCOL_CONNECTION: 
        {   if (websockedConnected)
            {   printf("connection rejected. Another connection is still running!\n");
                return 1;
            }
            break;
        }
        
        case LWS_CALLBACK_SERVER_WRITEABLE: 
        {   unsigned char response[98 + LWS_PRE] = {0};
            unsigned char* res = response;
            unsigned char** bufferPosition = &res;
            unsigned char*  bufferEnd = response+sizeof(response);
            
            char* dataPointJsonString;
            int dataPointJsonStringLength;
            if (DATA_pullSendDataQueueJson(&dataPointJsonString, &dataPointJsonStringLength) == 0)
            {   snprintf(*bufferPosition, bufferEnd-*bufferPosition, dataPointJsonString);
                lws_write(wsi, response, dataPointJsonStringLength-1, LWS_WRITE_TEXT);
            }
            lws_callback_on_writable(wsi);
            break;
        }
        default:
            break;
    }
    return 0;
}



void
OUTGOING_startup()
{   struct lws_context_creation_info info;

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
        return;
    }
}

void
OUTGOING_proceed()
{   // lws_service verarbeitet WebSocket- und HTTP-Anfragen
    lws_service(context, 0);
}

void 
OUTGOING_shutdown()
{   // Cleanup
    lws_context_destroy(context);
}