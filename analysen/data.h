///// TYPE DEFFINITIONS /////
typedef struct 
{   char UUID[8];
    struct { int r, g, b; } color;
} Datastream;

typedef struct 
{   float timestamp;
    int devicesAmount;
    char** devices;
    float* values;
} DataPoint;

typedef struct DatastreamNodeS 
{   Datastream datastream;
    struct DatastreamNodeS* next; 
} DatastreamNode;

///// FUNCTIONS /////
void DATA_datastreamsJson(char**, int*);
int  DATA_pullSendDataQueueJson(char**, int*);

void DATA_startup();
void DATA_proceed();