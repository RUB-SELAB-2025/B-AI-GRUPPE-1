#include "data.h"
#include "incoming.h"
#include "outgoing.h"

int main(int argc, char **argv)
{   DATA_startup();
    INCOMING_startup();
    OUTGOING_startup();
    while(1)
    {   DATA_proceed();
        INCOMING_proceed();
        OUTGOING_proceed();
    }
    OUTGOING_shutdown();
}