module cjson;

// CJson types
typedef CJson = void*;

extern fn CJson cJSON_Parse(char* json);
extern fn char* cJSON_Print(CJson item);
extern fn char* cJSON_PrintUnformatted(CJson item);
extern fn void cJSON_Delete(CJson item);
extern fn CJson cJSON_GetObjectItem(CJson object, char* string);
extern fn CJson cJSON_GetObjectItemCaseSensitive(CJson object, char* string);
extern fn CJson cJSON_CreateObject();
extern fn CJson cJSON_CreateArray();
extern fn CJson cJSON_CreateString(char* string);
extern fn CJson cJSON_CreateNumber(double num);
extern fn CJson cJSON_CreateBool(int boolean);
extern fn int cJSON_AddItemToObject(CJson object, char* string, CJson item);
extern fn int cJSON_AddItemToArray(CJson array, CJson item);
extern fn int cJSON_IsNumber(CJson item);
extern fn int cJSON_IsString(CJson item);
extern fn int cJSON_IsBool(CJson item);
extern fn int cJSON_IsArray(CJson item);
extern fn int cJSON_IsObject(CJson item);
extern fn int cJSON_GetArraySize(CJson array);
extern fn CJson cJSON_GetArrayItem(CJson array, int index);
extern fn double cJSON_GetNumberValue(CJson item);
extern fn char* cJSON_GetStringValue(CJson item);
extern fn CJson cJSON_AddStringToObject(CJson object, char* name, char* string);
extern fn CJson cJSON_AddNumberToObject(CJson object, char* name, double number);
extern fn CJson cJSON_AddBoolToObject(CJson object, char* name, int boolean);
extern fn CJson cJSON_AddObjectToObject(CJson object, char* name);
extern fn CJson cJSON_AddArrayToObject(CJson object, char* name);
extern fn void cJSON_DeleteItemFromArray(CJson array, int index);
extern fn char* cJSON_SetValuestring(CJson object, char* valuestring);
extern fn CJson cJSON_Duplicate(CJson item, int recurse);
extern fn CJson cJSON_DetachItemFromArray(CJson array, int index);
extern fn void cJSON_DeleteItemFromObject(CJson object, char* string);
