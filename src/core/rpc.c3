module core::rpc;
import webview;
import cjson;
import libc;
import core::errors;
import core::plugin;

alias RpcHandler = fn void(webview::Webview, char*, cjson::CJson);

struct RpcRegistry {
    char*[128] methods;
    RpcHandler[128] handlers;
    char*[128] plugin_ids;
    bool[128] active;
    int count;
}

struct LogEntry {
    char* level;
    char* message;
    char* source;
    long timestamp;
}

struct LogBuffer {
    LogEntry[256] entries;
    int head;
    int count;
}

RpcRegistry global_registry;
LogBuffer global_logs;

fn void init() {
    global_registry.count = 0;
    for (int i = 0; i < 128; i++) {
        global_registry.active[i] = false;
    }
    global_logs.head = 0;
    global_logs.count = 0;
    errors::error_init();
    plugin::init();
}

fn void log_push(char* level, char* message, char* source) {
    // In a real implementation, we'd need to copy the strings.
    // For now, we'll assume they are managed or we'll just use them.
    // This is a simplification for the task.
    
    LogEntry* entry = &global_logs.entries[global_logs.head];
    entry.level = level;
    entry.message = message;
    entry.source = source;
    entry.timestamp = 0; // Should use actual timestamp
    
    libc::printf("[%s] %s: %s\n", level, source, message);

    // Emit to frontend
    cjson::CJson log_json = cjson::cJSON_CreateObject();
    cjson::cJSON_AddStringToObject(log_json, "level", level);
    cjson::cJSON_AddStringToObject(log_json, "message", message);
    cjson::cJSON_AddStringToObject(log_json, "source", source);
    char* log_str = cjson::cJSON_PrintUnformatted(log_json);
    emit_frontend("terminal.log", log_str);
    libc::free(log_str);
    cjson::cJSON_Delete(log_json);
}

// Register a method (unnamespaced)
fn int register(char* method, RpcHandler handler) {
    return register_namespaced(method, handler, null);
}

// Register a method with plugin namespace
fn int register_namespaced(char* method, RpcHandler handler, char* plugin_id) {
    if (global_registry.count >= 128) {
        errors::error_push(errors::ERR_REGISTRY_FULL, "RPC registry full", "rpc::register");
        return errors::ERR_REGISTRY_FULL;
    }

    for (int i = 0; i < global_registry.count; i++) {
        if (global_registry.active[i] &&
            libc::strcmp((ZString)method, (ZString)global_registry.methods[i]) == 0) {
            errors::error_push(errors::ERR_INVALID_REQUEST, "Method already registered", "rpc::register");
            return errors::ERR_INVALID_REQUEST;
        }
    }

    global_registry.methods[global_registry.count] = method;
    global_registry.handlers[global_registry.count] = handler;
    global_registry.plugin_ids[global_registry.count] = plugin_id;
    global_registry.active[global_registry.count] = true;
    global_registry.count++;

    // Emit plugin method registered event
    if (plugin_id != null) {
        plugin::emit("rpc.method.registered", plugin_id, method);
    }

    return errors::ERR_OK;
}

// Register multiple methods for a plugin
fn int register_batch(char** methods, RpcHandler* handlers, int count, char* plugin_id) {
    for (int i = 0; i < count; i++) {
        int rc = register_namespaced(methods[i], handlers[i], plugin_id);
        if (rc != errors::ERR_OK) return rc;
    }
    return errors::ERR_OK;
}

// Unregister all methods for a plugin
fn void unregister_plugin(char* plugin_id) {
    for (int i = global_registry.count - 1; i >= 0; i--) {
        if (global_registry.active[i] &&
            global_registry.plugin_ids[i] != null &&
            libc::strcmp((ZString)plugin_id, (ZString)global_registry.plugin_ids[i]) == 0) {
            global_registry.active[i] = false;
            global_registry.count--;
            // Shift remaining
            for (int j = i; j < global_registry.count; j++) {
                global_registry.methods[j] = global_registry.methods[j + 1];
                global_registry.handlers[j] = global_registry.handlers[j + 1];
                global_registry.plugin_ids[j] = global_registry.plugin_ids[j + 1];
                global_registry.active[j] = global_registry.active[j + 1];
            }
        }
    }
}

// Get list of registered methods
fn int get_methods(char** out_methods, int max) {
    int count = 0;
    for (int i = 0; i < global_registry.count && count < max; i++) {
        if (global_registry.active[i]) {
            out_methods[count] = global_registry.methods[i];
            count++;
        }
    }
    return count;
}

// --- RPC Handlers ---

fn void handle_logs_get(webview::Webview w, char* id, cjson::CJson json) {
    cjson::CJson logs_array = cjson::cJSON_CreateArray();
    for (int i = 0; i < global_logs.count; i++) {
        int idx = (global_logs.head - global_logs.count + i + 256) % 256;
        LogEntry* entry = &global_logs.entries[idx];
        cjson::CJson log_obj = cjson::cJSON_CreateObject();
        cjson::cJSON_AddStringToObject(log_obj, "level", entry.level);
        cjson::cJSON_AddStringToObject(log_obj, "message", entry.message);
        cjson::cJSON_AddStringToObject(log_obj, "source", entry.source);
        cjson::cJSON_AddNumberToObject(log_obj, "timestamp", (double)entry.timestamp);
        cjson::cJSON_AddItemToArray(logs_array, log_obj);
    }
    char* str = cjson::cJSON_PrintUnformatted(logs_array);
    webview::webview_return(w, id, 1, str);
    libc::free(str);
    cjson::cJSON_Delete(logs_array);
}

fn void handle_state_get(webview::Webview w, char* id, cjson::CJson json) {
    cjson::CJson state_obj = cjson::cJSON_CreateObject();
    
    // Errors state
    cjson::CJson errors_array = cjson::cJSON_CreateArray();
    for (int i = 0; i < errors::global_errors.count; i++) {
        errors::ErrorInfo* err = &errors::global_errors.entries[i];
        cjson::CJson err_obj = cjson::cJSON_CreateObject();
        cjson::cJSON_AddNumberToObject(err_obj, "code", (double)err.code);
        cjson::cJSON_AddStringToObject(err_obj, "message", err.message);
        cjson::cJSON_AddStringToObject(err_obj, "source", err.source);
        cjson::cJSON_AddItemToArray(errors_array, err_obj);
    }
    cjson::cJSON_AddItemToObject(state_obj, "errors", errors_array);

    // Registry state
    cjson::CJson registry_obj = cjson::cJSON_CreateObject();
    cjson::cJSON_AddNumberToObject(registry_obj, "method_count", (double)global_registry.count);
    cjson::cJSON_AddItemToObject(state_obj, "registry", registry_obj);

    char* str = cjson::cJSON_PrintUnformatted(state_obj);
    webview::webview_return(w, id, 1, str);
    libc::free(str);
    cjson::cJSON_Delete(state_obj);
}

fn void handle_rpc_callback(char* id, char* req, void* arg) {
    webview::Webview w = (webview::Webview)arg;

    if (!w) {
        errors::error_push(errors::ERR_WEBVIEW_NULL, "Webview is null", "rpc::handle_rpc");
        return;
    }

    if (!req || !id) {
        errors::error_push(errors::ERR_INVALID_ARGS, "Null request or id", "rpc::handle_rpc");
        webview::webview_return(w, id, 1, errors::error_to_json(errors::ERR_INVALID_ARGS, "Null request or id"));
        return;
    }

    cjson::CJson json = cjson::cJSON_Parse(req);
    if (!json) {
        errors::error_push(errors::ERR_JSON_PARSE, "Invalid JSON", "rpc::handle_rpc");
        webview::webview_return(w, id, 1, errors::error_to_json(errors::ERR_JSON_PARSE, "Invalid JSON"));
        return;
    }

    if (!cjson::cJSON_IsArray(json)) {
        cjson::cJSON_Delete(json);
        errors::error_push(errors::ERR_INVALID_REQUEST, "Request must be an array", "rpc::handle_rpc");
        webview::webview_return(w, id, 1, errors::error_to_json(errors::ERR_INVALID_REQUEST, "Request must be an array"));
        return;
    }

    cjson::CJson method_item = cjson::cJSON_GetArrayItem(json, 0);
    if (!cjson::cJSON_IsString(method_item)) {
        cjson::cJSON_Delete(json);
        errors::error_push(errors::ERR_INVALID_REQUEST, "Method name must be a string", "rpc::handle_rpc");
        webview::webview_return(w, id, 1, errors::error_to_json(errors::ERR_INVALID_REQUEST, "Method name must be a string"));
        return;
    }

    char* method = cjson::cJSON_GetStringValue(method_item);

    // Check for our new methods first
    if (libc::strcmp((ZString)method, (ZString)"logs.get") == 0) {
        handle_logs_get(w, id, json);
        cjson::cJSON_Delete(json);
        return;
    }
    if (libc::strcmp((ZString)method, (ZString)"state.get") == 0) {
        handle_state_get(w, id, json);
        cjson::cJSON_Delete(json);
        return;
    }

    for (int i = 0; i < global_registry.count; i++) {
        if (global_registry.active[i] &&
            libc::strcmp((ZString)method, (ZString)global_registry.methods[i]) == 0) {

            // Emit before-call event
            if (global_registry.plugin_ids[i] != null) {
                plugin::emit("rpc.method.before", global_registry.plugin_ids[i], method);
            }

            global_registry.handlers[i](w, id, json);

            // Emit after-call event
            if (global_registry.plugin_ids[i] != null) {
                plugin::emit("rpc.method.after", global_registry.plugin_ids[i], method);
            }

            cjson::cJSON_Delete(json);
            return;
        }
    }

    char* msg = errors::error_to_json(errors::ERR_METHOD_NOT_FOUND, "Method not found");
    errors::error_push(errors::ERR_METHOD_NOT_FOUND, "Method not found", "rpc::handle_rpc");
    webview::webview_return(w, id, 1, msg);
    libc::free(msg);
    cjson::cJSON_Delete(json);
}

webview::Webview global_webview;

fn void emit_frontend(char* event, char* payload) {
    if (!global_webview) return;
    char[4096] script;
    libc::snprintf(&script[0], 4096, 
        "window.dispatchEvent(new CustomEvent('%s', { detail: %s }));", 
        event, payload);
    webview::webview_eval(global_webview, &script[0]);
}

fn void bind(webview::Webview w) {
    if (!w) {
        errors::error_push(errors::ERR_WEBVIEW_NULL, "Cannot bind to null webview", "rpc::bind");
        return;
    }
    global_webview = w;
    webview::webview_bind(w, "backendRPC", &handle_rpc_callback, (void*)w);
}
