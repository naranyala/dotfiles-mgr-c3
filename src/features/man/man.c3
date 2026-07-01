module features::man;
import webview;
import cjson;
import libc;
import core::rpc;
import core::errors;

extern fn void* popen(char* command, char* type);
extern fn int pclose(void* stream);
extern fn char* fgets(char* s, int size, void* stream);
extern fn int system(char* command);

fn char* run_cmd(char* cmd) {
    void* fp = popen(cmd, "r");
    if (fp == null) return null;
    char[8192] output;
    output[0] = 0;
    char[256] buf;
    while (fgets(&buf[0], 256, fp) != null) {
        libc::strncat(&output[0], &buf[0], 8192 - libc::strlen((ZString)&output[0]) - 1);
    }
    pclose(fp);
    int len = (int)libc::strlen((ZString)&output[0]);
    char* result = (char*)libc::malloc((usz)(len + 1));
    libc::strncpy(result, &output[0], (usz)(len + 1));
    return result;
}

fn void handle_man_list(webview::Webview w, char* id, cjson::CJson args) {
    char* output = run_cmd("man -k . 2>/dev/null | head -200");
    if ((void*)output == null) output = libc::strdup("");
    
    cjson::CJson result = cjson::cJSON_CreateArray();
    char* line = output;
    while (*line) {
        char* eol = libc::strchr(line, '\n');
        if (eol != null) *eol = 0;
        if (libc::strlen((ZString)line) > 0) {
            char* sep = libc::strchr(line, ' ');
            if (sep != null) {
                *sep = 0;
                char* name = line;
                char* desc = sep + 1;
                cjson::CJson item = cjson::cJSON_CreateObject();
                cjson::cJSON_AddStringToObject(item, "name", name);
                cjson::cJSON_AddStringToObject(item, "desc", desc);
                cjson::cJSON_AddItemToArray(result, item);
            }
        }
        if (eol != null) { line = eol + 1; } else { break; }
    }
    libc::free(output);
    
    char* json_str = cjson::cJSON_PrintUnformatted(result);
    webview::webview_return(w, id, 0, json_str);
    libc::free(json_str);
    cjson::cJSON_Delete(result);
}

fn void handle_man_get(webview::Webview w, char* id, cjson::CJson args) {
    char* name = null;
    if ((void*)args != null && cjson::cJSON_GetArraySize(args) > 1) {
        cjson::CJson item = cjson::cJSON_GetArrayItem(args, 1);
        if (cjson::cJSON_IsString(item)) name = cjson::cJSON_GetStringValue(item);
    }
    if (name == null) {
        webview::webview_return(w, id, 1, "{\"error\": \"Missing man page name\"}");
        return;
    }
    
    char[512] cmd;
    libc::snprintf(&cmd[0], 512, "man %s 2>/dev/null", name);
    char* output = run_cmd(&cmd[0]);
    if (output == null) output = libc::strdup("");
    
    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddStringToObject(result, "name", name);
    cjson::cJSON_AddStringToObject(result, "content", output);
    libc::free(output);
    
    char* json_str = cjson::cJSON_PrintUnformatted(result);
    webview::webview_return(w, id, 0, json_str);
    libc::free(json_str);
    cjson::cJSON_Delete(result);
}

fn int init() {
    int rc;
    rc = core::rpc::register("man.list", &handle_man_list);
    if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("man.get", &handle_man_get);
    if (rc != errors::ERR_OK) return rc;
    return errors::ERR_OK;
}
