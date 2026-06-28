module main;
import webview;
import cjson;
import libc;

fn void handle_rpc(char* id, char* req, void* arg) {
    webview::Webview w = (webview::Webview)arg;
    
    cjson::CJson json = cjson::cJSON_Parse(req);
    if (!json) {
        webview::webview_return(w, id, 1, "{\"error\": \"Invalid JSON\"}");
        return;
    }
    
    if (!cjson::cJSON_IsArray(json)) {
        cjson::cJSON_Delete(json);
        webview::webview_return(w, id, 1, "{\"error\": \"Request must be an array\"}");
        return;
    }
    
    cjson::CJson method_item = cjson::cJSON_GetArrayItem(json, 0);
    if (!cjson::cJSON_IsString(method_item)) {
        cjson::cJSON_Delete(json);
        webview::webview_return(w, id, 1, "{\"error\": \"Method name must be a string\"}");
        return;
    }
    
    char* method = cjson::cJSON_GetStringValue(method_item);
    
    if (libc::strcmp((ZString)method, "ping") == 0) {
        webview::webview_return(w, id, 0, "{\"message\": \"pong from C3!\"}");
    } else if (libc::strcmp((ZString)method, "getSystemInfo") == 0) {
        webview::webview_return(w, id, 0, "{\"os\": \"Linux\", \"version\": \"1.0\"}");
    } else {
        webview::webview_return(w, id, 1, "{\"error\": \"Method not found\"}");
    }
    
    cjson::cJSON_Delete(json);
}

fn int main() {
    webview::Webview w = webview::webview_create(1, null);
    webview::webview_set_title(w, "C3 Desktop App");
    webview::webview_set_size(w, 800, 600, webview::HINT_NONE);
    
    // Expose `window.backendRPC` to the frontend
    webview::webview_bind(w, "backendRPC", &handle_rpc, (void*)w);
    
    webview::webview_navigate(w, "file:///media/naranyala/Data/projects-remote/c3written-dotfiles-mgr/frontend/dist/index.html");
    webview::webview_run(w);
    webview::webview_destroy(w);
    return 0;
}
