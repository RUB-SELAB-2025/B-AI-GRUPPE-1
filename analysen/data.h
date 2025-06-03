///// TYPE DEFFINITIONS /////
typedef struct 
{   char UUID[8];
    struct { int r, g, b; } color;
} Datastream;

typedef struct DatastreamNodeS 
{   Datastream datastream;
    struct DatastreamNodeS* next; 
} DatastreamNode;

///// FUNCTIONS /////
void DATA_datastreamsJson(char**, int*);

void DATA_startup();
void DATA_proceed();