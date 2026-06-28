module whereami;

extern fn int wai_getExecutablePath(char* out, int capacity, int* dirname_length) ;
extern fn int wai_getModulePath(char* out, int capacity, int* dirname_length) ;
