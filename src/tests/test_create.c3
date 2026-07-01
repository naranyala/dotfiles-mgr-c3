module test_create;
import libc;
import cjson;
import std::io;
extern fn int mkdir(char* path, int mode);

const char* CONFIG_DIR = "/home/naranyala/.local/share/dotfiles-mgr";
const char* CONFIG_FILE = "/home/naranyala/.local/share/dotfiles-mgr/workspaces.json";

fn cjson::CJson load_workspaces() {
    void* f = libc::fopen(CONFIG_FILE, "r");
    if ((void*)f == null) {
        char* default_json = "[{\"id\":\"laboratory\",\"name\":\"Laboratory\",\"groups\":[]}]";
        return cjson::cJSON_Parse(default_json);
    }
    libc::fseek(f, 0, libc::SEEK_END);
    long size = libc::ftell(f);
    libc::fseek(f, 0, libc::SEEK_SET);
    char* content = libc::malloc((usz)(size + 1));
    libc::fread(content, 1, (usz)size, f);
    content[size] = 0;
    libc::fclose(f);
    cjson::CJson json = cjson::cJSON_Parse(content);
    libc::free(content);
    return json;
}

fn void save_workspaces(cjson::CJson workspaces) {
    mkdir(CONFIG_DIR, 0755);
    char* json_str = cjson::cJSON_Print(workspaces);
    void* f = libc::fopen(CONFIG_FILE, "w");
    if ((void*)f != null) {
        libc::fwrite(json_str, 1, libc::strlen((ZString)json_str), f);
        libc::fclose(f);
    }
    libc::free(json_str);
}

fn char* generate_id(char* name) {
    int len = (int)libc::strlen((ZString)name);
    char* id = libc::malloc((usz)(len + 1));
    for (int i = 0; i < len; i++) {
        char c = name[i];
        if (c >= 'A' && c <= 'Z') { c = c + 32; }
        else if (c == ' ') c = '-';
        id[i] = c;
    }
    id[len] = 0;
    return id;
}

fn void test_main() {
    char* name = "Test";
    char* ws_id = generate_id(name);
    cjson::CJson workspaces = load_workspaces();
    cjson::CJson ws = cjson::cJSON_CreateObject();
    cjson::cJSON_AddStringToObject(ws, "id", ws_id);
    cjson::cJSON_AddStringToObject(ws, "name", name);
    cjson::cJSON_AddItemToObject(ws, "groups", cjson::cJSON_CreateArray());
    cjson::cJSON_AddItemToArray(workspaces, ws);
    
    save_workspaces(workspaces);
    char* json_str = cjson::cJSON_PrintUnformatted(ws);
    io::printn((ZString)json_str);
    
    cjson::cJSON_Delete(workspaces);
    libc::free(json_str);
    libc::free(ws_id);
}
