module features::workspace;
import cjson;
import libc;

fn cjson::CJson load_workspaces() {
    void* f = libc::fopen(CONFIG_FILE, "r");
    if ((void*)f == null) {
        mkdir("./state", 0755);
        mkdir(REPOS_DIR, 0755);

        char* default_json =
            "[{\"id\":\"lab\",\"name\":\"Lab (Examples)\",\"groups\":["
            "{\"id\":\"basic\",\"name\":\"Basic\",\"repos\":["
            "{\"id\":\"basic-commits\",\"name\":\"basic-commits\",\"path\":\"./examples/repos/basic-commits\",\"type\":\"local\"},"
            "{\"id\":\"initial-commit-only\",\"name\":\"initial-commit-only\",\"path\":\"./examples/repos/initial-commit-only\",\"type\":\"local\"},"
            "{\"id\":\"empty-repo\",\"name\":\"empty-repo\",\"path\":\"./examples/repos/empty-repo\",\"type\":\"local\"}]},"
            "{\"id\":\"branching\",\"name\":\"Branching\",\"repos\":["
            "{\"id\":\"multiple-branches\",\"name\":\"multiple-branches\",\"path\":\"./examples/repos/multiple-branches\",\"type\":\"local\"},"
            "{\"id\":\"merge-conflicts\",\"name\":\"merge-conflicts\",\"path\":\"./examples/repos/merge-conflicts\",\"type\":\"local\"},"
            "{\"id\":\"rebase-history\",\"name\":\"rebase-history\",\"path\":\"./examples/repos/rebase-history\",\"type\":\"local\"},"
            "{\"id\":\"complex-history\",\"name\":\"complex-history\",\"path\":\"./examples/repos/complex-history\",\"type\":\"local\"},"
            "{\"id\":\"orphan-branches\",\"name\":\"orphan-branches\",\"path\":\"./examples/repos/orphan-branches\",\"type\":\"local\"}]},"
            "{\"id\":\"advanced\",\"name\":\"Advanced\",\"repos\":["
            "{\"id\":\"tags-releases\",\"name\":\"tags-releases\",\"path\":\"./examples/repos/tags-releases\",\"type\":\"local\"},"
            "{\"id\":\"cherry-pick-history\",\"name\":\"cherry-pick-history\",\"path\":\"./examples/repos/cherry-pick-history\",\"type\":\"local\"},"
            "{\"id\":\"detached-head\",\"name\":\"detached-head\",\"path\":\"./examples/repos/detached-head\",\"type\":\"local\"},"
            "{\"id\":\"submodule-repo\",\"name\":\"submodule-repo\",\"path\":\"./examples/repos/submodule-repo\",\"type\":\"local\"}]},"
            "{\"id\":\"special\",\"name\":\"Special Cases\",\"repos\":["
            "{\"id\":\"bare-repo\",\"name\":\"bare-repo.git\",\"path\":\"./examples/repos/bare-repo.git\",\"type\":\"local\"},"
            "{\"id\":\"shallow-clone\",\"name\":\"shallow-clone\",\"path\":\"./examples/repos/shallow-clone\",\"type\":\"local\"}]}]}]";

        void* df = libc::fopen(CONFIG_FILE, "w");
        if (df != null) {
            libc::fwrite(default_json, 1, libc::strlen((ZString)default_json), df);
            libc::fclose(df);
        }

        cjson::CJson ws = cjson::cJSON_Parse(default_json);
        if ((void*)ws == null) {
            return cjson::cJSON_CreateArray();
        }
        return ws;
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

    if ((void*)json == null) {
        return cjson::cJSON_CreateArray();
    }
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

fn cjson::CJson find_workspace(cjson::CJson workspaces, char* id) {
    int count = cjson::cJSON_GetArraySize(workspaces);
    for (int i = 0; i < count; i++) {
        cjson::CJson ws = cjson::cJSON_GetArrayItem(workspaces, i);
        cjson::CJson id_item = cjson::cJSON_GetObjectItem(ws, "id");
        if ((void*)id_item != null && cjson::cJSON_IsString(id_item)) {
            if (libc::strcmp((ZString)(cjson::cJSON_GetStringValue(id_item)), (ZString)(id)) == 0) {
                return ws;
            }
        }
    }
    return (cjson::CJson)null;
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
