module shared::json_utils;
import webview;
import cjson;
import libc;

/**
 * Standardizes returning a JSON result to the webview and cleaning up.
 * Use this in every RPC handler to avoid boilerplate.
 */
fn void rpc_return_json(webview::Webview w, char* id, cjson::CJson result) {
    if ((void*)result == null) {
        webview::webview_return(w, id, 1, "{\"error\": \"null result\"}");
        return;
    }
    char* json_str = cjson::cJSON_PrintUnformatted(result);
    webview::webview_return(w, id, 0, json_str);
    libc::free(json_str);
    cjson::cJSON_Delete(result);
}

/**
 * Standardizes returning an error JSON.
 */
fn void rpc_return_error(webview::Webview w, char* id, char* message) {
    cjson::CJson err = cjson::cJSON_CreateObject();
    cjson::cJSON_AddStringToObject(err, "error", message);
    rpc_return_json(w, id, err);
}

/**
 * Helper to create a simple key-value JSON object.
 */
fn cjson::CJson json_kv(char* key, char* value) {
    cjson::CJson obj = cjson::cJSON_CreateObject();
    cjson::cJSON_AddStringToObject(obj, key, value);
    return obj;
}
