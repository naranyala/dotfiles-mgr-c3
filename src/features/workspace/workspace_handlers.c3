module features::workspace;
import webview;
import cjson;
import libc;

fn void handle_workspace_list(webview::Webview w, char* id, cjson::CJson args) {
    cjson::CJson workspaces = load_workspaces();
    char* json_str = cjson::cJSON_PrintUnformatted(workspaces);
    webview::webview_return(w, id, 0, json_str);
    cjson::cJSON_Delete(workspaces);
    libc::free(json_str);
}

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

    cjson::CJson removed = cjson::cJSON_GetObjectItem(ws, "removed");
    if ((void*)removed == null) {
        removed = cjson::cJSON_CreateArray();
        cjson::cJSON_AddItemToObject(ws, "removed", removed);
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
                                    cjson::CJson removed_repo = cjson::cJSON_Duplicate(repo, 1);
                                    cjson::cJSON_AddStringToObject(removed_repo, "groupId", group_id);
                                    cjson::cJSON_AddItemToArray(removed, removed_repo);

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

fn void handle_workspace_restore_repo(webview::Webview w, char* id, cjson::CJson args) {
    if ((void*)args == null || cjson::cJSON_GetArraySize(args) < 3) {
        webview::webview_return(w, id, 1, "{\"error\": \"Missing arguments: [wsId, repoId]\"}");
        return;
    }

    cjson::CJson ws_id_item = cjson::cJSON_GetArrayItem(args, 1);
    cjson::CJson repo_id_item = cjson::cJSON_GetArrayItem(args, 2);

    if (!cjson::cJSON_IsString(ws_id_item) || !cjson::cJSON_IsString(repo_id_item)) {
        webview::webview_return(w, id, 1, "{\"error\": \"All arguments must be strings\"}");
        return;
    }

    char* ws_id = cjson::cJSON_GetStringValue(ws_id_item);
    char* repo_id = cjson::cJSON_GetStringValue(repo_id_item);

    cjson::CJson workspaces = load_workspaces();
    cjson::CJson ws = find_workspace(workspaces, ws_id);

    if ((void*)ws == null) {
        webview::webview_return(w, id, 1, "{\"error\": \"Workspace not found\"}");
        cjson::cJSON_Delete(workspaces);
        return;
    }

    cjson::CJson removed = cjson::cJSON_GetObjectItem(ws, "removed");
    if ((void*)removed == null) {
        webview::webview_return(w, id, 1, "{\"error\": \"No removed repos\"}");
        cjson::cJSON_Delete(workspaces);
        return;
    }

    int removed_count = cjson::cJSON_GetArraySize(removed);
    for (int i = 0; i < removed_count; i++) {
        cjson::CJson repo = cjson::cJSON_GetArrayItem(removed, i);
        cjson::CJson rid = cjson::cJSON_GetObjectItem(repo, "id");
        if ((void*)rid != null && cjson::cJSON_IsString(rid)) {
            if (libc::strcmp((ZString)(cjson::cJSON_GetStringValue(rid)), (ZString)(repo_id)) == 0) {
                cjson::CJson gid = cjson::cJSON_GetObjectItem(repo, "groupId");
                char* target_group_id = (void*)gid != null && cjson::cJSON_IsString(gid)
                    ? cjson::cJSON_GetStringValue(gid) : null;

                cjson::CJson groups = cjson::cJSON_GetObjectItem(ws, "groups");
                cjson::CJson target_group = (cjson::CJson)null;
                if ((void*)groups != null && target_group_id != null) {
                    int gc = cjson::cJSON_GetArraySize(groups);
                    for (int g = 0; g < gc; g++) {
                        cjson::CJson grp = cjson::cJSON_GetArrayItem(groups, g);
                        cjson::CJson gid_field = cjson::cJSON_GetObjectItem(grp, "id");
                        if ((void*)gid_field != null && cjson::cJSON_IsString(gid_field)) {
                            if (libc::strcmp((ZString)(cjson::cJSON_GetStringValue(gid_field)), (ZString)(target_group_id)) == 0) {
                                target_group = grp;
                                break;
                            }
                        }
                    }
                }

                if ((void*)target_group == null && (void*)groups != null && cjson::cJSON_GetArraySize(groups) > 0) {
                    target_group = cjson::cJSON_GetArrayItem(groups, 0);
                }

                if ((void*)target_group == null) {
                    webview::webview_return(w, id, 1, "{\"error\": \"No groups to restore into\"}");
                    cjson::cJSON_Delete(workspaces);
                    return;
                }

                cjson::cJSON_DeleteItemFromObject(repo, "groupId");

                cjson::CJson repos = cjson::cJSON_GetObjectItem(target_group, "repos");
                if ((void*)repos == null) {
                    repos = cjson::cJSON_CreateArray();
                    cjson::cJSON_AddItemToObject(target_group, "repos", repos);
                }
                cjson::cJSON_AddItemToArray(repos, repo);

                cjson::CJson detached = cjson::cJSON_DetachItemFromArray(removed, i);
                cjson::cJSON_Delete(detached);

                save_workspaces(workspaces);
                webview::webview_return(w, id, 0, "{\"ok\": true}");
                cjson::cJSON_Delete(workspaces);
                return;
            }
        }
    }

    webview::webview_return(w, id, 1, "{\"error\": \"Repo not found in removed list\"}");
    cjson::cJSON_Delete(workspaces);
}

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
