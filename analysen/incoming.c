#include "incoming.h"
#include <libwebsockets.h>

///// DATA /////
static int incomming_callback(struct lws*, enum lws_callback_reasons, void*, void*, size_t);
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

///// FUNCTIONS /////
static int 
incomming_callback(struct lws *wsi, enum lws_callback_reasons reason, void *user, void *in, size_t len)
{
    return 0;
}

void
INCOMING_startup()
{
}

void
INCOMING_proceed()
{
}