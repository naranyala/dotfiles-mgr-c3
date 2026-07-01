module core::errors;

import libc;
import cjson;
import std::io;

// Error Categories
const int ERR_OK = 0;

// RPC & Protocol Errors (1000-1999)
const int ERR_JSON_PARSE = 1001;
const int ERR_INVALID_REQUEST = 1002;
const int ERR_METHOD_NOT_FOUND = 1003;
const int ERR_HANDLER_CRASH = 1004;
const int ERR_REGISTRY_FULL = 1005;
const int ERR_INVALID_ARGS = 1006;

// Webview/UI Errors (2000-2999)
const int ERR_WEBVIEW = 2001;
const int ERR_WEBVIEW_NULL = 2002;

// External Library Errors (3000-3999)
const int ERR_SQLITE = 3001;
const int ERR_GIT = 3002;
const int ERR_ARCHIVE = 3003;
const int ERR_ZIP = 3004;

// Plugin Errors (4000-4999)
const int ERR_PLUGIN = 4001;
const int ERR_PLUGIN_NOT_FOUND = 4002;

// System & OS Errors (5000-5999)
const int ERR_PERMISSION_DENIED = 5001;
const int ERR_NOT_FOUND = 5002;
const int ERR_IO = 5003;
const int ERR_NOT_SUPPORTED = 5004;

struct ErrorInfo {
    int code;
    char* message;
    char* source;
    long timestamp;
}

struct ErrorLog {
    ErrorInfo[256] entries;
    int head;
    int count;
}

ErrorLog global_errors;

fn void error_init() {
    global_errors.head = 0;
    global_errors.count = 0;
}

fn void error_push(int code, char* message, char* source) {
    ErrorInfo* entry = &global_errors.entries[global_errors.head];
    entry.code = code;
    entry.message = message;
    entry.source = source;
    entry.timestamp = libc::time(null);
    
    io::printfn("[ERROR] %d | %s | %s", code, source, message);

    global_errors.head = (global_errors.head + 1) % 256;
    if (global_errors.count < 256) global_errors.count++;
}

fn char* error_to_json(int code, char* message, char* source) {
    cjson::CJson obj = cjson::cJSON_CreateObject();
    cjson::cJSON_AddBoolToObject(obj, "error", 1);
    cjson::cJSON_AddNumberToObject(obj, "code", (double)code);
    cjson::cJSON_AddStringToObject(obj, "message", message);
    if (source != null) {
        cjson::cJSON_AddStringToObject(obj, "source", source);
    }
    char* str = cjson::cJSON_PrintUnformatted(obj);
    cjson::cJSON_Delete(obj);
    return str;
}

fn bool error_has_critical() {
    if (global_errors.count == 0) return false;
    int last_idx = (global_errors.head - 1 + 256) % 256;
    return global_errors.entries[last_idx].code >= 2000;
}
