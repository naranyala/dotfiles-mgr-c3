module features::system;
import webview;
import cjson;
import libc;
import core::rpc;
import core::errors;

fn void handle_get_system_info(webview::Webview w, char* id, cjson::CJson args) {
    if ((void*)args == null || cjson::cJSON_GetArraySize(args) > 1) {
        errors::error_push(errors::ERR_INVALID_ARGS, "Invalid args for getSystemInfo", "system");
        webview::webview_return(w, id, 1, "{\"error\": \"Invalid arguments\"}");
        return;
    }

    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddStringToObject(result, "os", "Linux");
    cjson::cJSON_AddStringToObject(result, "version", "1.0");
    cjson::cJSON_AddBoolToObject(result, "ok", 1);

    char* json_str = cjson::cJSON_PrintUnformatted(result);
    webview::webview_return(w, id, 0, json_str);
    cjson::cJSON_Delete(result);
    libc::free(json_str);
}

fn int init() {
    return core::rpc::register("system.getSystemInfo", &handle_get_system_info);
}
