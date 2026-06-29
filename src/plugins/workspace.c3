module plugins::workspace;
import webview;
import cjson;
import libc;
import core::rpc;
import core::errors;
extern fn int mkdir(char* path, int mode);

const char* CONFIG_DIR = "/media/naranyala/Data/projects-remote/dotfiles-mgr-c3/state";
const char* CONFIG_FILE = "/media/naranyala/Data/projects-remote/dotfiles-mgr-c3/state/workspaces.json";
const char* REPOS_DIR = "./examples/repos";

// Load workspaces from disk
fn cjson::CJson load_workspaces() {
    void* f = libc::fopen(CONFIG_FILE, "r");
    if ((void*)f == null) {
        // Return default lab workspace with all example repos
        mkdir("./state", 0755);
        mkdir(REPOS_DIR, 0755);

        // Create default workspaces.json with relative paths
        char* default_json = "[{\"id\":\"lab\",\"name\":\"Lab (Examples)\",\"groups\":[{\"id\":\"basic\",\"name\":\"Basic\",\"repos\":[{\"id\":\"basic-commits\",\"name\":\"basic-commits\",\"path\":\"./examples/repos/basic-commits\",\"type\":\"local\"},{\"id\":\"initial-commit-only\",\"name\":\"initial-commit-only\",\"path\":\"./examples/repos/initial-commit-only\",\"type\":\"local\"},{\"id\":\"empty-repo\",\"name\":\"empty-repo\",\"path\":\"./examples/repos/empty-repo\",\"type\":\"local\"}]},{\"id\":\"branching\",\"name\":\"Branching\",\"repos\":[{\"id\":\"multiple-branches\",\"name\":\"multiple-branches\",\"path\":\"./examples/repos/multiple-branches\",\"type\":\"local\"},{\"id\":\"merge-conflicts\",\"name\":\"merge-conflicts\",\"path\":\"./examples/repos/merge-conflicts\",\"type\":\"local\"},{\"id\":\"rebase-history\",\"name\":\"rebase-history\",\"path\":\"./examples/repos/rebase-history\",\"type\":\"local\"},{\"id\":\"complex-history\",\"name\":\"complex-history\",\"path\":\"./examples/repos/complex-history\",\"type\":\"local\"},{\"id\":\"orphan-branches\",\"name\":\"orphan-branches\",\"path\":\"./examples/repos/orphan-branches\",\"type\":\"local\"}]},{\"id\":\"advanced\",\"name\":\"Advanced\",\"repos\":[{\"id\":\"tags-releases\",\"name\":\"tags-releases\",\"path\":\"./examples/repos/tags-releases\",\"type\":\"local\"},{\"id\":\"cherry-pick-history\",\"name\":\"cherry-pick-history\",\"path\":\"./examples/repos/cherry-pick-history\",\"type\":\"local\"},{\"id\":\"detached-head\",\"name\":\"detached-head\",\"path\":\"./examples/repos/detached-head\",\"type\":\"local\"},{\"id\":\"submodule-repo\",\"name\":\"submodule-repo\",\"path\":\"./examples/repos/submodule-repo\",\"type\":\"local\"}]},{\"id\":\"special\",\"name\":\"Special Cases\",\"repos\":[{\"id\":\"bare-repo\",\"name\":\"bare-repo.git\",\"path\":\"./examples/repos/bare-repo.git\",\"type\":\"local\"},{\"id\":\"shallow-clone\",\"name\":\"shallow-clone\",\"path\":\"./examples/repos/shallow-clone\",\"type\":\"local\"},{\"id\":\"gitignore-patterns\",\"name\":\"gitignore-patterns\",\"path\":\"./examples/repos/gitignore-patterns\",\"type\":\"local\"},{\"id\":\"large-files\",\"name\":\"large-files\",\"path\":\"./examples/repos/large-files\",\"type\":\"local\"},{\"id\":\"nested-dirs\",\"name\":\"nested-dirs\",\"path\":\"./examples/repos/nested-dirs\",\"type\":\"local\"},{\"id\":\"signed-commits\",\"name\":\"signed-commits\",\"path\":\"./examples/repos/signed-commits\",\"type\":\"local\"},{\"id\":\"worktree-demo\",\"name\":\"worktree-demo\",\"path\":\"./examples/repos/worktree-demo\",\"type\":\"local\"}]},{\"id\":\"dotfiles\",\"name\":\"Dotfiles\",\"repos\":[{\"id\":\"dotfiles-collection\",\"name\":\"dotfiles-collection\",\"path\":\"./examples/repos/dotfiles-collection\",\"type\":\"local\"}]}]},{\"id\":\"default\",\"name\":\"Default\",\"groups\":[]}]";

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

// Save workspaces to disk
fn void save_workspaces(cjson::CJson workspaces) {
    // Ensure directory exists
    mkdir(CONFIG_DIR, 0755);

    char* json_str = cjson::cJSON_Print(workspaces);
    void* f = libc::fopen(CONFIG_FILE, "w");
    if ((void*)f != null) {
        libc::fwrite(json_str, 1, libc::strlen((ZString)json_str), f);
        libc::fclose(f);
    }
    libc::free(json_str);
}

// Find workspace by ID
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

// Generate simple ID from name
fn char* generate_id(char* name) {
    // For now, just use lowercase name with dashes
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

// --- RPC Handlers ---

// workspace.list - List all workspaces
fn void handle_workspace_list(webview::Webview w, char* id, cjson::CJson args) {
    cjson::CJson workspaces = load_workspaces();
    char* json_str = cjson::cJSON_PrintUnformatted(workspaces);
    webview::webview_return(w, id, 0, json_str);
    cjson::cJSON_Delete(workspaces);
    libc::free(json_str);
}

// workspace.create - Create a new workspace
fn void handle_workspace_create(webview::Webview w, char* id, cjson::CJson args) {
    if ((void*)args == null || cjson::cJSON_GetArraySize(args) < 2) {
        webview::webview_return(w, id, 1, "{\"error\": \"Missing workspace name\"}");
        return;
    }

    cjson::CJson name_item = cjson::cJSON_GetArrayItem(args, 1);
    if (!cjson::cJSON_IsString(name_item)) {
        webview::webview_return(w, id, 1, "{\"error\": \"Name must be a string\"}");
        return;
    }

    char* name = cjson::cJSON_GetStringValue(name_item);
    char* ws_id = generate_id(name);

    cjson::CJson workspaces = load_workspaces();

    // Check for duplicate
    if ((void*)find_workspace(workspaces, ws_id) != null) {
        webview::webview_return(w, id, 1, "{\"error\": \"Workspace already exists\"}");
        cjson::cJSON_Delete(workspaces);
        libc::free(ws_id);
        return;
    }

    cjson::CJson ws = cjson::cJSON_CreateObject();
    cjson::cJSON_AddStringToObject(ws, "id", ws_id);
    cjson::cJSON_AddStringToObject(ws, "name", name);
    cjson::cJSON_AddItemToObject(ws, "groups", cjson::cJSON_CreateArray());
    cjson::cJSON_AddItemToArray(workspaces, ws);

    save_workspaces(workspaces);

    char* json_str = cjson::cJSON_PrintUnformatted(ws);
    webview::webview_return(w, id, 0, json_str);
    cjson::cJSON_Delete(workspaces);
    libc::free(json_str);
    libc::free(ws_id);
}

// workspace.delete - Delete a workspace
fn void handle_workspace_delete(webview::Webview w, char* id, cjson::CJson args) {
    if ((void*)args == null || cjson::cJSON_GetArraySize(args) < 2) {
        webview::webview_return(w, id, 1, "{\"error\": \"Missing workspace ID\"}");
        return;
    }

    cjson::CJson id_item = cjson::cJSON_GetArrayItem(args, 1);
    if (!cjson::cJSON_IsString(id_item)) {
        webview::webview_return(w, id, 1, "{\"error\": \"ID must be a string\"}");
        return;
    }

    char* ws_id = cjson::cJSON_GetStringValue(id_item);
    cjson::CJson workspaces = load_workspaces();

    int count = cjson::cJSON_GetArraySize(workspaces);
    for (int i = 0; i < count; i++) {
        cjson::CJson ws = cjson::cJSON_GetArrayItem(workspaces, i);
        cjson::CJson id_field = cjson::cJSON_GetObjectItem(ws, "id");
        if ((void*)id_field != null && cjson::cJSON_IsString(id_field)) {
            if (libc::strcmp((ZString)(cjson::cJSON_GetStringValue(id_field)), (ZString)(ws_id)) == 0) {
                cjson::cJSON_DeleteItemFromArray(workspaces, i);
                save_workspaces(workspaces);
                webview::webview_return(w, id, 0, "{\"ok\": true}");
                cjson::cJSON_Delete(workspaces);
                return;
            }
        }
    }

    webview::webview_return(w, id, 1, "{\"error\": \"Workspace not found\"}");
    cjson::cJSON_Delete(workspaces);
}

// workspace.add-group - Add a repo group to workspace
fn void handle_workspace_add_group(webview::Webview w, char* id, cjson::CJson args) {
    if ((void*)args == null || cjson::cJSON_GetArraySize(args) < 3) {
        webview::webview_return(w, id, 1, "{\"error\": \"Missing workspace ID and group name\"}");
        return;
    }

    cjson::CJson ws_id_item = cjson::cJSON_GetArrayItem(args, 1);
    cjson::CJson group_name_item = cjson::cJSON_GetArrayItem(args, 2);

    if (!cjson::cJSON_IsString(ws_id_item) || !cjson::cJSON_IsString(group_name_item)) {
        webview::webview_return(w, id, 1, "{\"error\": \"Arguments must be strings\"}");
        return;
    }

    char* ws_id = cjson::cJSON_GetStringValue(ws_id_item);
    char* group_name = cjson::cJSON_GetStringValue(group_name_item);

    cjson::CJson workspaces = load_workspaces();
    cjson::CJson ws = find_workspace(workspaces, ws_id);

    if ((void*)ws == null) {
        webview::webview_return(w, id, 1, "{\"error\": \"Workspace not found\"}");
        cjson::cJSON_Delete(workspaces);
        return;
    }

    cjson::CJson groups = cjson::cJSON_GetObjectItem(ws, "groups");
    if ((void*)groups == null) {
        groups = cjson::cJSON_CreateArray();
        cjson::cJSON_AddItemToObject(ws, "groups", groups);
    }

    char* group_id = generate_id(group_name);

    cjson::CJson group = cjson::cJSON_CreateObject();
    cjson::cJSON_AddStringToObject(group, "id", group_id);
    cjson::cJSON_AddStringToObject(group, "name", group_name);
    cjson::cJSON_AddItemToObject(group, "repos", cjson::cJSON_CreateArray());
    cjson::cJSON_AddItemToArray(groups, group);

    save_workspaces(workspaces);

    char* json_str = cjson::cJSON_PrintUnformatted(group);
    webview::webview_return(w, id, 0, json_str);
    cjson::cJSON_Delete(workspaces);
    libc::free(json_str);
    libc::free(group_id);
}

// workspace.remove-group - Remove a group from workspace
fn void handle_workspace_remove_group(webview::Webview w, char* id, cjson::CJson args) {
    if ((void*)args == null || cjson::cJSON_GetArraySize(args) < 3) {
        webview::webview_return(w, id, 1, "{\"error\": \"Missing workspace ID and group ID\"}");
        return;
    }

    cjson::CJson ws_id_item = cjson::cJSON_GetArrayItem(args, 1);
    cjson::CJson group_id_item = cjson::cJSON_GetArrayItem(args, 2);

    if (!cjson::cJSON_IsString(ws_id_item) || !cjson::cJSON_IsString(group_id_item)) {
        webview::webview_return(w, id, 1, "{\"error\": \"Arguments must be strings\"}");
        return;
    }

    char* ws_id = cjson::cJSON_GetStringValue(ws_id_item);
    char* group_id = cjson::cJSON_GetStringValue(group_id_item);

    cjson::CJson workspaces = load_workspaces();
    cjson::CJson ws = find_workspace(workspaces, ws_id);

    if ((void*)ws == null) {
        webview::webview_return(w, id, 1, "{\"error\": \"Workspace not found\"}");
        cjson::cJSON_Delete(workspaces);
        return;
    }

    cjson::CJson groups = cjson::cJSON_GetObjectItem(ws, "groups");
    if ((void*)groups != null) {
        int count = cjson::cJSON_GetArraySize(groups);
        for (int i = 0; i < count; i++) {
            cjson::CJson group = cjson::cJSON_GetArrayItem(groups, i);
            cjson::CJson id_field = cjson::cJSON_GetObjectItem(group, "id");
            if ((void*)id_field != null && cjson::cJSON_IsString(id_field)) {
                if (libc::strcmp((ZString)(cjson::cJSON_GetStringValue(id_field)), (ZString)(group_id)) == 0) {
                    cjson::cJSON_DeleteItemFromArray(groups, i);
                    save_workspaces(workspaces);
                    webview::webview_return(w, id, 0, "{\"ok\": true}");
                    cjson::cJSON_Delete(workspaces);
                    return;
                }
            }
        }
    }

    webview::webview_return(w, id, 1, "{\"error\": \"Group not found\"}");
    cjson::cJSON_Delete(workspaces);
}

// workspace.add-repo - Add a repo to a group
fn void handle_workspace_add_repo(webview::Webview w, char* id, cjson::CJson args) {
    if ((void*)args == null || cjson::cJSON_GetArraySize(args) < 5) {
        webview::webview_return(w, id, 1, "{\"error\": \"Missing arguments: [wsId, groupId, repoName, repoPath]\"}");
        return;
    }

    cjson::CJson ws_id_item = cjson::cJSON_GetArrayItem(args, 1);
    cjson::CJson group_id_item = cjson::cJSON_GetArrayItem(args, 2);
    cjson::CJson repo_name_item = cjson::cJSON_GetArrayItem(args, 3);
    cjson::CJson repo_path_item = cjson::cJSON_GetArrayItem(args, 4);

    if (!cjson::cJSON_IsString(ws_id_item) || !cjson::cJSON_IsString(group_id_item) ||
        !cjson::cJSON_IsString(repo_name_item) || !cjson::cJSON_IsString(repo_path_item)) {
        webview::webview_return(w, id, 1, "{\"error\": \"All arguments must be strings\"}");
        return;
    }

    char* ws_id = cjson::cJSON_GetStringValue(ws_id_item);
    char* group_id = cjson::cJSON_GetStringValue(group_id_item);
    char* repo_name = cjson::cJSON_GetStringValue(repo_name_item);
    char* repo_path = cjson::cJSON_GetStringValue(repo_path_item);

    cjson::CJson workspaces = load_workspaces();
    cjson::CJson ws = find_workspace(workspaces, ws_id);

    if ((void*)ws == null) {
        webview::webview_return(w, id, 1, "{\"error\": \"Workspace not found\"}");
        cjson::cJSON_Delete(workspaces);
        return;
    }

    // Find group
    cjson::CJson groups = cjson::cJSON_GetObjectItem(ws, "groups");
    if ((void*)groups == null) {
        webview::webview_return(w, id, 1, "{\"error\": \"No groups in workspace\"}");
        cjson::cJSON_Delete(workspaces);
        return;
    }

    int group_count = cjson::cJSON_GetArraySize(groups);
    for (int i = 0; i < group_count; i++) {
        cjson::CJson group = cjson::cJSON_GetArrayItem(groups, i);
        cjson::CJson id_field = cjson::cJSON_GetObjectItem(group, "id");
        if ((void*)id_field != null && cjson::cJSON_IsString(id_field)) {
            if (libc::strcmp((ZString)(cjson::cJSON_GetStringValue(id_field)), (ZString)(group_id)) == 0) {
                cjson::CJson repos = cjson::cJSON_GetObjectItem(group, "repos");
                if ((void*)repos == null) {
                    repos = cjson::cJSON_CreateArray();
                    cjson::cJSON_AddItemToObject(group, "repos", repos);
                }

                char* repo_id = generate_id(repo_name);

                // Determine type: if path starts with / or ~ it's local, otherwise remote
                int is_local = (repo_path[0] == '/' || repo_path[0] == '~') ? 1 : 0;

                cjson::CJson repo = cjson::cJSON_CreateObject();
                cjson::cJSON_AddStringToObject(repo, "id", repo_id);
                cjson::cJSON_AddStringToObject(repo, "name", repo_name);
                cjson::cJSON_AddStringToObject(repo, "path", repo_path);
                cjson::cJSON_AddStringToObject(repo, "type", is_local ? "local" : "remote");
                cjson::cJSON_AddItemToArray(repos, repo);

                save_workspaces(workspaces);

                char* json_str = cjson::cJSON_PrintUnformatted(repo);
                webview::webview_return(w, id, 0, json_str);
                cjson::cJSON_Delete(workspaces);
                libc::free(json_str);
                libc::free(repo_id);
                return;
            }
        }
    }

    webview::webview_return(w, id, 1, "{\"error\": \"Group not found\"}");
    cjson::cJSON_Delete(workspaces);
}

// workspace.remove-repo - Remove a repo from a group
fn void handle_workspace_remove_repo(webview::Webview w, char* id, cjson::CJson args) {
    if ((void*)args == null || cjson::cJSON_GetArraySize(args) < 4) {
        webview::webview_return(w, id, 1, "{\"error\": \"Missing arguments: [wsId, groupId, repoId]\"}");
        return;
    }

    cjson::CJson ws_id_item = cjson::cJSON_GetArrayItem(args, 1);
    cjson::CJson group_id_item = cjson::cJSON_GetArrayItem(args, 2);
    cjson::CJson repo_id_item = cjson::cJSON_GetArrayItem(args, 3);

    if (!cjson::cJSON_IsString(ws_id_item) || !cjson::cJSON_IsString(group_id_item) ||
        !cjson::cJSON_IsString(repo_id_item)) {
        webview::webview_return(w, id, 1, "{\"error\": \"All arguments must be strings\"}");
        return;
    }

    char* ws_id = cjson::cJSON_GetStringValue(ws_id_item);
    char* group_id = cjson::cJSON_GetStringValue(group_id_item);
    char* repo_id = cjson::cJSON_GetStringValue(repo_id_item);

    cjson::CJson workspaces = load_workspaces();
    cjson::CJson ws = find_workspace(workspaces, ws_id);

    if ((void*)ws == null) {
        webview::webview_return(w, id, 1, "{\"error\": \"Workspace not found\"}");
        cjson::cJSON_Delete(workspaces);
        return;
    }

    cjson::CJson groups = cjson::cJSON_GetObjectItem(ws, "groups");
    if ((void*)groups != null) {
        int group_count = cjson::cJSON_GetArraySize(groups);
        for (int i = 0; i < group_count; i++) {
            cjson::CJson group = cjson::cJSON_GetArrayItem(groups, i);
            cjson::CJson id_field = cjson::cJSON_GetObjectItem(group, "id");
            if ((void*)id_field != null && cjson::cJSON_IsString(id_field)) {
                if (libc::strcmp((ZString)(cjson::cJSON_GetStringValue(id_field)), (ZString)(group_id)) == 0) {
                    cjson::CJson repos = cjson::cJSON_GetObjectItem(group, "repos");
                    if ((void*)repos != null) {
                        int repo_count = cjson::cJSON_GetArraySize(repos);
                        for (int j = 0; j < repo_count; j++) {
                            cjson::CJson repo = cjson::cJSON_GetArrayItem(repos, j);
                            cjson::CJson rid = cjson::cJSON_GetObjectItem(repo, "id");
                            if ((void*)rid != null && cjson::cJSON_IsString(rid)) {
                                if (libc::strcmp((ZString)(cjson::cJSON_GetStringValue(rid)), (ZString)(repo_id)) == 0) {
                                    cjson::cJSON_DeleteItemFromArray(repos, j);
                                    save_workspaces(workspaces);
                                    webview::webview_return(w, id, 0, "{\"ok\": true}");
                                    cjson::cJSON_Delete(workspaces);
                                    return;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    webview::webview_return(w, id, 1, "{\"error\": \"Repo not found\"}");
    cjson::cJSON_Delete(workspaces);
}

// workspace.get - Get full workspace details
fn void handle_workspace_get(webview::Webview w, char* id, cjson::CJson args) {
    if ((void*)args == null || cjson::cJSON_GetArraySize(args) < 2) {
        webview::webview_return(w, id, 1, "{\"error\": \"Missing workspace ID\"}");
        return;
    }

    cjson::CJson ws_id_item = cjson::cJSON_GetArrayItem(args, 1);
    if (!cjson::cJSON_IsString(ws_id_item)) {
        webview::webview_return(w, id, 1, "{\"error\": \"ID must be a string\"}");
        return;
    }

    char* ws_id = cjson::cJSON_GetStringValue(ws_id_item);
    cjson::CJson workspaces = load_workspaces();
    cjson::CJson ws = find_workspace(workspaces, ws_id);

    if ((void*)ws == null) {
        webview::webview_return(w, id, 1, "{\"error\": \"Workspace not found\"}");
        cjson::cJSON_Delete(workspaces);
        return;
    }

    char* json_str = cjson::cJSON_PrintUnformatted(ws);
    webview::webview_return(w, id, 0, json_str);
    cjson::cJSON_Delete(workspaces);
    libc::free(json_str);
}

// workspace.rename - Rename a workspace
fn void handle_workspace_rename(webview::Webview w, char* id, cjson::CJson args) {
    if ((void*)args == null || cjson::cJSON_GetArraySize(args) < 3) {
        webview::webview_return(w, id, 1, "{\"error\": \"Missing workspace ID and new name\"}");
        return;
    }

    cjson::CJson ws_id_item = cjson::cJSON_GetArrayItem(args, 1);
    cjson::CJson name_item = cjson::cJSON_GetArrayItem(args, 2);

    if (!cjson::cJSON_IsString(ws_id_item) || !cjson::cJSON_IsString(name_item)) {
        webview::webview_return(w, id, 1, "{\"error\": \"Arguments must be strings\"}");
        return;
    }

    char* ws_id = cjson::cJSON_GetStringValue(ws_id_item);
    char* new_name = cjson::cJSON_GetStringValue(name_item);

    cjson::CJson workspaces = load_workspaces();
    cjson::CJson ws = find_workspace(workspaces, ws_id);

    if ((void*)ws == null) {
        webview::webview_return(w, id, 1, "{\"error\": \"Workspace not found\"}");
        cjson::cJSON_Delete(workspaces);
        return;
    }

    cjson::CJson name_field = cjson::cJSON_GetObjectItem(ws, "name");
    if ((void*)name_field != null) {
        cjson::cJSON_SetValuestring(name_field, new_name);
    }

    save_workspaces(workspaces);
    webview::webview_return(w, id, 0, "{\"ok\": true}");
    cjson::cJSON_Delete(workspaces);
}

// --- Init ---

fn int init() {
    // Ensure config directory exists
    mkdir(CONFIG_DIR, 0755);

    int rc;
    rc = core::rpc::register("workspace.list", &handle_workspace_list);
    if (rc != errors::ERR_OK) return rc;

    rc = core::rpc::register("workspace.get", &handle_workspace_get);
    if (rc != errors::ERR_OK) return rc;

    rc = core::rpc::register("workspace.create", &handle_workspace_create);
    if (rc != errors::ERR_OK) return rc;

    rc = core::rpc::register("workspace.delete", &handle_workspace_delete);
    if (rc != errors::ERR_OK) return rc;

    rc = core::rpc::register("workspace.rename", &handle_workspace_rename);
    if (rc != errors::ERR_OK) return rc;

    rc = core::rpc::register("workspace.add-group", &handle_workspace_add_group);
    if (rc != errors::ERR_OK) return rc;

    rc = core::rpc::register("workspace.remove-group", &handle_workspace_remove_group);
    if (rc != errors::ERR_OK) return rc;

    rc = core::rpc::register("workspace.add-repo", &handle_workspace_add_repo);
    if (rc != errors::ERR_OK) return rc;

    rc = core::rpc::register("workspace.remove-repo", &handle_workspace_remove_repo);
    if (rc != errors::ERR_OK) return rc;

    return errors::ERR_OK;
}
