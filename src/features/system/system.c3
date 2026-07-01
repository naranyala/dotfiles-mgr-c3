module features::system;
import webview;
import cjson;
import libc;
import core::rpc;
import core::errors;
import shared::json_utils;

fn void handle_get_system_info(webview::Webview w, char* id, cjson::CJson args) {
    if ((void*)args == null || cjson::cJSON_GetArraySize(args) > 1) {
        errors::error_push(errors::ERR_INVALID_ARGS, "Invalid args for getSystemInfo", "system");
        shared::json_utils::rpc_return_error(w, id, "Invalid arguments");
        return;
    }

    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddStringToObject(result, "os", "Linux");
    cjson::cJSON_AddStringToObject(result, "version", "1.0");
    cjson::cJSON_AddBoolToObject(result, "ok", 1);

    shared::json_utils::rpc_return_json(w, id, result);
}

fn int init() {
    return core::rpc::register("system.getSystemInfo", &handle_get_system_info);
}
