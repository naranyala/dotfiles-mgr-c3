module plugins::repo;
struct Dirent { ulong d_ino; long d_off; ushort d_reclen; char d_type; char[256] d_name; }
extern fn void* opendir(char* name);
extern fn void* readdir(void* dirp);
extern fn int closedir(void* dirp);
import webview;
import cjson;
import libc;
import core::rpc;
import core::errors;
import libgit2;

extern fn void* popen(char* command, char* type);
extern fn int pclose(void* stream);
extern fn char* fgets(char* s, int size, void* stream);
extern fn int fputs(char* s, void* stream);
extern fn void* fopen(char* filename, char* mode);
extern fn int fclose(void* stream);
extern fn int mkdir(char* path, int mode);

// Default storage path for repos (examples lab)
const char* DEFAULT_REPOS_DIR = "/media/naranyala/Data/projects-remote/dotfiles-mgr-c3/examples";
const char* USER_REPOS_DIR = "/media/naranyala/Data/projects-remote/dotfiles-mgr-c3/state/repos";
const char* LAST_WORKSPACE_FILE = "/media/naranyala/Data/projects-remote/dotfiles-mgr-c3/state/last_workspace.txt";
char[512] current_workspace;

fn void init_git() {
    libgit2::git_libgit2_init();
    
    // Check if we have a saved last workspace
    bool loaded = false;
    void* fp = fopen(LAST_WORKSPACE_FILE, "r");
    if (fp != null) {
        char[512] buf;
        if (fgets(&buf[0], 512, fp) != null) {
            int len = (int)libc::strlen((ZString)&buf[0]);
            if (len > 0 && buf[len - 1] == '\n') buf[len - 1] = 0;
            if ((int)libc::strlen((ZString)&buf[0]) > 0) {
                libc::strncpy(&current_workspace[0], &buf[0], 512);
                loaded = true;
            }
        }
        fclose(fp);
    }
    
    if (!loaded) {
        // Default to examples directory for lab workspace
        libc::strncpy(&current_workspace[0], DEFAULT_REPOS_DIR, 512);
    }
    
    // Also ensure user repos dir exists
    mkdir("/media/naranyala/Data/projects-remote/dotfiles-mgr-c3/state", 0o755);
    mkdir(USER_REPOS_DIR, 0o755);
}

// --- RPC Handlers ---

// repo.set_workspace
fn void handle_repo_set_workspace(webview::Webview w, char* id, cjson::CJson args) {
    if ((void*)args == null || cjson::cJSON_GetArraySize(args) < 2) {
        webview::webview_return(w, id, 1, "{\"error\": \"Missing path\"}");
        return;
    }
    cjson::CJson path_item = cjson::cJSON_GetArrayItem(args, 1);
    if (!cjson::cJSON_IsString(path_item)) {
        webview::webview_return(w, id, 1, "{\"error\": \"Path must be string\"}");
        return;
    }
    char* path = cjson::cJSON_GetStringValue(path_item);
    libc::strncpy(&current_workspace[0], path, 512);
    mkdir(&current_workspace[0], 0o755);
    
    // Save to persistent file
    void* fp = fopen(LAST_WORKSPACE_FILE, "w");
    if (fp != null) {
        fputs(&current_workspace[0], fp);
        fclose(fp);
    }
    
    webview::webview_return(w, id, 0, "{\"status\": \"ok\"}");
}

fn void handle_repo_get_workspace(webview::Webview w, char* id, cjson::CJson args) {
    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddStringToObject(result, "workspace", &current_workspace[0]);
    char* json_str = cjson::cJSON_PrintUnformatted(result);
    webview::webview_return(w, id, 0, json_str);
    cjson::cJSON_Delete(result);
    libc::free(json_str);
}


// repo.clone - Clone a remote repo
fn void handle_repo_clone(webview::Webview w, char* id, cjson::CJson args) {
    if ((void*)args == null || cjson::cJSON_GetArraySize(args) < 2) {
        webview::webview_return(w, id, 1, "{\"error\": \"Missing clone URL\"}");
        return;
    }
    
    cjson::CJson url_item = cjson::cJSON_GetArrayItem(args, 1);
    if (!cjson::cJSON_IsString(url_item)) {
        webview::webview_return(w, id, 1, "{\"error\": \"URL must be a string\"}");
        return;
    }
    
    char* url = cjson::cJSON_GetStringValue(url_item);
    
    char[1024] cmd;
    libc::snprintf(&cmd[0], 1024, "cd %s && git clone %s 2>&1", &current_workspace[0], url);
    
    void* fp = popen(&cmd[0], "r");
    if (fp == null) {
        webview::webview_return(w, id, 1, "{\"error\": \"Failed to run git clone process\"}");
        return;
    }
    
    char[4096] output;
    output[0] = '\0';
    char[256] buffer;
    while (fgets(&buffer[0], 256, fp) != null) {
        libc::strncat(&output[0], &buffer[0], 4096 - libc::strlen((ZString)&output[0]) - 1);
    }
    int status = pclose(fp);
    
    if (status != 0) {
        cjson::CJson result = cjson::cJSON_CreateObject();
        cjson::cJSON_AddStringToObject(result, "error", &output[0]);
        char* err_str = cjson::cJSON_PrintUnformatted(result);
        webview::webview_return(w, id, 1, err_str);
        cjson::cJSON_Delete(result);
        libc::free(err_str);
        return;
    }
    
    webview::webview_return(w, id, 0, "{\"status\": \"ok\"}");
}

fn void handle_repo_list(webview::Webview w, char* id, cjson::CJson args) {
    cjson::CJson result = cjson::cJSON_CreateArray();
    
    void* dbg = libc::fopen("/media/naranyala/Data/projects-remote/dotfiles-mgr-c3/backend_debug.log", "w");
    if (dbg != null) {
        libc::fprintf(dbg, "handle_repo_list called!\n");
        libc::fprintf(dbg, "current_workspace: '%s'\n", (char*)&current_workspace[0]);
        libc::fflush(dbg);
    }

    char[1024] cmd;
    libc::snprintf(&cmd[0], 1024, "find %s -type d \\( -name \".git\" -o -name \"*.git\" \\) 2>/dev/null", (char*)&current_workspace[0]);

    if (dbg != null) {
        libc::fprintf(dbg, "cmd: %s\n", &cmd[0]);
        libc::fflush(dbg);
    }

    void* fp = popen(&cmd[0], "r");
    if (fp != null) {
        char[1024] buf;
        int repo_count = 0;
        while (fgets(&buf[0], 1024, fp) != null) {
            int len = (int)libc::strlen((ZString)&buf[0]);
            if (len > 0 && buf[len - 1] == '\n') buf[len - 1] = 0;
            len = (int)libc::strlen((ZString)&buf[0]);
            
            if (len > 5 && libc::strncmp((ZString)&buf[len - 5], (ZString)"/.git", 5) == 0) {
                buf[len - 5] = 0;
            }

            char* repo_path_str = &buf[0];
            if (dbg != null) libc::fprintf(dbg, "found path: %s\n", repo_path_str);

            libgit2::GitRepository r;
            int err = libgit2::git_repository_open(&r, repo_path_str);
            if (err == 0) {
                repo_count++;
                if (dbg != null) {
                    libc::fprintf(dbg, "valid repo opened!\n");
                    libc::fflush(dbg);
                }
                cjson::CJson repo = cjson::cJSON_CreateObject();
                cjson::cJSON_AddStringToObject(repo, "path", repo_path_str);

                char* rel_name = repo_path_str;
                int ws_len = (int)libc::strlen((ZString)&current_workspace[0]);
                if (libc::strncmp((ZString)repo_path_str, (ZString)&current_workspace[0], (usz)ws_len) == 0) {
                    rel_name = repo_path_str + ws_len;
                    if (rel_name[0] == '/') rel_name++;
                }
                cjson::cJSON_AddStringToObject(repo, "name", rel_name);
                cjson::cJSON_AddBoolToObject(repo, "isRepo", 1);
                cjson::cJSON_AddStringToObject(repo, "type", "local");

                libgit2::GitReference head;
                if (libgit2::git_repository_head(&head, r) == 0) {
                    char* branch = libgit2::git_reference_name(head);
                    if (libc::strncmp((ZString)branch, (ZString)"refs/heads/", 11) == 0) {
                        branch = branch + 11;
                    }
                    cjson::cJSON_AddStringToObject(repo, "branch", branch);
                    libgit2::git_reference_free(head);
                }

                cjson::cJSON_AddBoolToObject(repo, "isEmpty", libgit2::git_repository_is_empty(r));
                libgit2::git_repository_free(r);
                cjson::cJSON_AddItemToArray(result, repo);
            }
        }
        pclose(fp);
    }
    
    if (dbg != null) {
        libc::fprintf(dbg, "Finished handle_repo_list!\n");
        libc::fclose(dbg);
    }

    char* json_str = cjson::cJSON_PrintUnformatted(result);
    webview::webview_return(w, id, 0, json_str);
    cjson::cJSON_Delete(result);
    libc::free(json_str);
}

// repo.info - Get repo info
fn void handle_repo_info(webview::Webview w, char* id, cjson::CJson args) {
    if ((void*)args == null) {
        webview::webview_return(w, id, 1, "{\"error\": \"Missing repo name\"}");
        return;
    }

    cjson::CJson name_item = cjson::cJSON_GetArrayItem(args, 1);
    if (!cjson::cJSON_IsString(name_item)) {
        webview::webview_return(w, id, 1, "{\"error\": \"Repo name must be a string\"}");
        return;
    }

    char* name = cjson::cJSON_GetStringValue(name_item);
    char[512] repo_path;
    if (name[0] == '/' || name[0] == '.' || name[0] == '~') {
        libc::strncpy(&repo_path[0], name, 512);
    } else {
        libc::snprintf(&repo_path[0], 512, "%s/%s", (char*)&current_workspace[0], name);
    }

    libgit2::GitRepository r;
    if (libgit2::git_repository_open(&r, &repo_path[0]) != 0) {
        webview::webview_return(w, id, 1, "{\"error\": \"Repository not found\"}");
        return;
    }

    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddStringToObject(result, "name", name);
    cjson::cJSON_AddStringToObject(result, "path", &repo_path[0]);
    cjson::cJSON_AddBoolToObject(result, "isEmpty", libgit2::git_repository_is_empty(r));
    cjson::cJSON_AddBoolToObject(result, "isBare", libgit2::git_repository_is_bare(r));

    // Get current branch
    libgit2::GitReference head;
    if (libgit2::git_repository_head(&head, r) == 0) {
        char* branch = libgit2::git_reference_name(head);
        if (libc::strncmp(branch, "refs/heads/", 11) == 0) {
            branch = branch + 11;
        }
        cjson::cJSON_AddStringToObject(result, "branch", branch);
        libgit2::git_reference_free(head);
    }

    // Get branches list
    cjson::CJson branches = cjson::cJSON_CreateArray();
    void* iter;
    if (libgit2::git_branch_iterator_new(&iter, r, libgit2::GIT_BRANCH_LOCAL) == 0) {
        libgit2::GitReference branch_ref;
        int branch_type;
        while (libgit2::git_branch_next(&branch_ref, &branch_type, iter) == 0) {
            char* branch_name;
            if (libgit2::git_branch_name(&branch_name, branch_ref) == 0) {
                cjson::cJSON_AddItemToArray(branches, cjson::cJSON_CreateString(branch_name));
            }
            libgit2::git_reference_free(branch_ref);
        }
        libgit2::git_branch_iterator_free(iter);
    }
    cjson::cJSON_AddItemToObject(result, "branches", branches);

    // Get remotes
    cjson::CJson remotes = cjson::cJSON_CreateArray();
    libgit2::GitStrArray remote_list;
    if (libgit2::git_remote_list(&remote_list, r) == 0) {
        for (int i = 0; i < remote_list.count; i++) {
            libgit2::GitRemote remote;
            if (libgit2::git_remote_lookup(&remote, r, remote_list.strings[i]) == 0) {
                cjson::CJson remote_obj = cjson::cJSON_CreateObject();
                cjson::cJSON_AddStringToObject(remote_obj, "name", remote_list.strings[i]);
                cjson::cJSON_AddStringToObject(remote_obj, "url", libgit2::git_remote_url(remote));
                cjson::cJSON_AddItemToArray(remotes, remote_obj);
                libgit2::git_remote_free(remote);
            }
        }
    }
    cjson::cJSON_AddItemToObject(result, "remotes", remotes);

    libgit2::git_repository_free(r);

    char* json_str = cjson::cJSON_PrintUnformatted(result);
    webview::webview_return(w, id, 0, json_str);
    cjson::cJSON_Delete(result);
    libc::free(json_str);
}

// repo.tree - Get file tree
fn void handle_repo_tree(webview::Webview w, char* id, cjson::CJson args) {
    if ((void*)args == null) {
        webview::webview_return(w, id, 1, "{\"error\": \"Missing arguments\"}");
        return;
    }

    cjson::CJson name_item = cjson::cJSON_GetArrayItem(args, 1);
    if (!cjson::cJSON_IsString(name_item)) {
        webview::webview_return(w, id, 1, "{\"error\": \"Repo name must be a string\"}");
        return;
    }

    char* name = cjson::cJSON_GetStringValue(name_item);
    char[512] repo_path;
    if (name[0] == '/' || name[0] == '.' || name[0] == '~') {
        libc::strncpy(&repo_path[0], name, 512);
    } else {
        libc::snprintf(&repo_path[0], 512, "%s/%s", (char*)&current_workspace[0], name);
    }

    libgit2::GitRepository r;
    if (libgit2::git_repository_open(&r, &repo_path[0]) != 0) {
        webview::webview_return(w, id, 1, "{\"error\": \"Repository not found\"}");
        return;
    }

    cjson::CJson result = cjson::cJSON_CreateArray();

    libgit2::GitReference head;
    if (libgit2::git_repository_head(&head, r) == 0) {
        libgit2::GitCommit commit;
        if (libgit2::git_commit_lookup(&commit, r, libgit2::git_reference_target(head)) == 0) {
            libgit2::GitTree tree;
            if (libgit2::git_commit_tree(&tree, commit) == 0) {
                int count = libgit2::git_tree_entrycount(tree);
                for (int i = 0; i < count; i++) {
                    libgit2::GitTreeEntry entry;
                    if (libgit2::git_tree_entry_byindex(&entry, tree, i) == 0) {
                        cjson::CJson item = cjson::cJSON_CreateObject();
                        cjson::cJSON_AddStringToObject(item, "name", libgit2::git_tree_entry_name(entry));
                        int type = libgit2::git_tree_entry_type(entry);
                        cjson::cJSON_AddStringToObject(item, "type", type == libgit2::GIT_OBJECT_TREE ? "dir" : "file");
                        cjson::cJSON_AddItemToArray(result, item);
                    }
                }
                libgit2::git_tree_free(tree);
            }
            libgit2::git_commit_free(commit);
        }
        libgit2::git_reference_free(head);
    }

    libgit2::git_repository_free(r);

    char* json_str = cjson::cJSON_PrintUnformatted(result);
    webview::webview_return(w, id, 0, json_str);
    cjson::cJSON_Delete(result);
    libc::free(json_str);
}

// repo.file - Read file content
fn void handle_repo_file(webview::Webview w, char* id, cjson::CJson args) {
    if ((void*)args == null || cjson::cJSON_GetArraySize(args) < 3) {
        webview::webview_return(w, id, 1, "{\"error\": \"Missing arguments: [repo, path]\"}");
        return;
    }

    cjson::CJson name_item = cjson::cJSON_GetArrayItem(args, 1);
    cjson::CJson path_item = cjson::cJSON_GetArrayItem(args, 2);

    if (!cjson::cJSON_IsString(name_item) || !cjson::cJSON_IsString(path_item)) {
        webview::webview_return(w, id, 1, "{\"error\": \"Arguments must be strings\"}");
        return;
    }

    char* name = cjson::cJSON_GetStringValue(name_item);
    char* file_path = cjson::cJSON_GetStringValue(path_item);

    char[512] repo_path;
    if (name[0] == '/' || name[0] == '.' || name[0] == '~') {
        libc::strncpy(&repo_path[0], name, 512);
    } else {
        libc::snprintf(&repo_path[0], 512, "%s/%s", (char*)&current_workspace[0], name);
    }

    libgit2::GitRepository r;
    if (libgit2::git_repository_open(&r, &repo_path[0]) != 0) {
        webview::webview_return(w, id, 1, "{\"error\": \"Repository not found\"}");
        return;
    }

    // Read from disk directly (read-only, no checkout needed)
    char[1024] full_path;
    libc::snprintf(&full_path[0], 1024, "%s/%s", repo_path, file_path);

    void* f = libc::fopen((ZString)&full_path[0], "r");
    if (f == null) {
        libgit2::git_repository_free(r);
        webview::webview_return(w, id, 1, "{\"error\": \"File not found\"}");
        return;
    }

    libc::fseek(f, 0, libc::SEEK_END);
    long size = libc::ftell(f);
    libc::fseek(f, 0, libc::SEEK_SET);

    char* content = libc::malloc((usz)size + 1);
    libc::fread(content, 1, (usz)size, f);
    content[size] = 0;
    libc::fclose(f);

    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddStringToObject(result, "path", file_path);
    cjson::cJSON_AddStringToObject(result, "content", content);
    cjson::cJSON_AddNumberToObject(result, "size", (double)size);

    libc::free(content);
    libgit2::git_repository_free(r);

    char* json_str = cjson::cJSON_PrintUnformatted(result);
    webview::webview_return(w, id, 0, json_str);
    cjson::cJSON_Delete(result);
    libc::free(json_str);
}

// repo.history - Get commit history
fn void handle_repo_history(webview::Webview w, char* id, cjson::CJson args) {
    if ((void*)args == null) {
        webview::webview_return(w, id, 1, "{\"error\": \"Missing repo name\"}");
        return;
    }

    cjson::CJson name_item = cjson::cJSON_GetArrayItem(args, 1);
    if (!cjson::cJSON_IsString(name_item)) {
        webview::webview_return(w, id, 1, "{\"error\": \"Repo name must be a string\"}");
        return;
    }

    char* name = cjson::cJSON_GetStringValue(name_item);
    char[512] repo_path;
    if (name[0] == '/' || name[0] == '.' || name[0] == '~') {
        libc::strncpy(&repo_path[0], name, 512);
    } else {
        libc::snprintf(&repo_path[0], 512, "%s/%s", (char*)&current_workspace[0], name);
    }

    libgit2::GitRepository r;
    if (libgit2::git_repository_open(&r, &repo_path[0]) != 0) {
        webview::webview_return(w, id, 1, "{\"error\": \"Repository not found\"}");
        return;
    }

    cjson::CJson result = cjson::cJSON_CreateArray();

    libgit2::GitRevwalk walk;
    if (libgit2::git_revwalk_new(&walk, r) == 0) {
        libgit2::git_revwalk_push_head(walk);
        libgit2::git_revwalk_sorting(walk, libgit2::GIT_SORT_TIME);

        libgit2::GitOid oid;
        int count = 0;
        while (libgit2::git_revwalk_next(&oid, walk) == 0 && count < 100) {
            libgit2::GitCommit commit;
            if (libgit2::git_commit_lookup(&commit, r, &oid) == 0) {
                cjson::CJson item = cjson::cJSON_CreateObject();

                // Get OID as hex string
                char[41] oid_hex;
                libgit2::GitOid* commit_id = libgit2::git_commit_id(commit);
                for (int i = 0; i < 20; i++) {
                    libc::snprintf(&oid_hex[i * 2], 3, "%02x", (int)commit_id.id[i]);
                }
                oid_hex[40] = 0;
                cjson::cJSON_AddStringToObject(item, "id", &oid_hex[0]);

                char* msg = libgit2::git_commit_message(commit);
                if (msg != null) {
                    // Get first line only
                    char* newline = libc::strchr(msg, '\n');
                    if (newline != null) *newline = 0;
                    cjson::cJSON_AddStringToObject(item, "message", msg);
                }

                libgit2::GitSignature author;
                if (libgit2::git_commit_author(&author, commit) == 0) {
                    cjson::cJSON_AddStringToObject(item, "author", author.name);
                    cjson::cJSON_AddStringToObject(item, "email", author.email);
                }

                cjson::cJSON_AddItemToArray(result, item);
                libgit2::git_commit_free(commit);
                count++;
            }
        }
        libgit2::git_revwalk_free(walk);
    }

    libgit2::git_repository_free(r);

    char* json_str = cjson::cJSON_PrintUnformatted(result);
    webview::webview_return(w, id, 0, json_str);
    cjson::cJSON_Delete(result);
    libc::free(json_str);
}

// repo.branches - List branches
fn void handle_repo_branches(webview::Webview w, char* id, cjson::CJson args) {
    if ((void*)args == null) {
        webview::webview_return(w, id, 1, "{\"error\": \"Missing repo name\"}");
        return;
    }

    cjson::CJson name_item = cjson::cJSON_GetArrayItem(args, 1);
    if (!cjson::cJSON_IsString(name_item)) {
        webview::webview_return(w, id, 1, "{\"error\": \"Repo name must be a string\"}");
        return;
    }

    char* name = cjson::cJSON_GetStringValue(name_item);
    char[512] repo_path;
    if (name[0] == '/' || name[0] == '.' || name[0] == '~') {
        libc::strncpy(&repo_path[0], name, 512);
    } else {
        libc::snprintf(&repo_path[0], 512, "%s/%s", (char*)&current_workspace[0], name);
    }

    libgit2::GitRepository r;
    if (libgit2::git_repository_open(&r, &repo_path[0]) != 0) {
        webview::webview_return(w, id, 1, "{\"error\": \"Repository not found\"}");
        return;
    }

    cjson::CJson result = cjson::cJSON_CreateArray();

    // Get current branch
    char* current_branch = null;
    libgit2::GitReference head;
    if (libgit2::git_repository_head(&head, r) == 0) {
        current_branch = libgit2::git_reference_name(head);
        if (libc::strncmp(current_branch, "refs/heads/", 11) == 0) {
            current_branch = current_branch + 11;
        }
    }

    // Local branches
    void* iter;
    if (libgit2::git_branch_iterator_new(&iter, r, libgit2::GIT_BRANCH_LOCAL) == 0) {
        libgit2::GitReference branch_ref;
        int branch_type;
        while (libgit2::git_branch_next(&branch_ref, &branch_type, iter) == 0) {
            char* branch_name;
            if (libgit2::git_branch_name(&branch_name, branch_ref) == 0) {
                cjson::CJson item = cjson::cJSON_CreateObject();
                cjson::cJSON_AddStringToObject(item, "name", branch_name);
                cjson::cJSON_AddBoolToObject(item, "current",
                    current_branch != null && libc::strcmp((ZString)branch_name, (ZString)current_branch) == 0 ? 1 : 0);
                cjson::cJSON_AddItemToArray(result, item);
            }
            libgit2::git_reference_free(branch_ref);
        }
        libgit2::git_branch_iterator_free(iter);
    }

    if ((void*)head != null) libgit2::git_reference_free(head);
    libgit2::git_repository_free(r);

    char* json_str = cjson::cJSON_PrintUnformatted(result);
    webview::webview_return(w, id, 0, json_str);
    cjson::cJSON_Delete(result);
    libc::free(json_str);
}

// repo.search - Search files in repo
fn void handle_repo_search(webview::Webview w, char* id, cjson::CJson args) {
    if ((void*)args == null || cjson::cJSON_GetArraySize(args) < 3) {
        webview::webview_return(w, id, 1, "{\"error\": \"Missing arguments: [repo, query]\"}");
        return;
    }

    cjson::CJson name_item = cjson::cJSON_GetArrayItem(args, 1);
    cjson::CJson query_item = cjson::cJSON_GetArrayItem(args, 2);

    if (!cjson::cJSON_IsString(name_item) || !cjson::cJSON_IsString(query_item)) {
        webview::webview_return(w, id, 1, "{\"error\": \"Arguments must be strings\"}");
        return;
    }

    char* name = cjson::cJSON_GetStringValue(name_item);
    char* query = cjson::cJSON_GetStringValue(query_item);

    char[512] repo_path;
    if (name[0] == '/' || name[0] == '.' || name[0] == '~') {
        libc::strncpy(&repo_path[0], name, 512);
    } else {
        libc::snprintf(&repo_path[0], 512, "%s/%s", (char*)&current_workspace[0], name);
    }

    // Simple file name search using opendir
    cjson::CJson result = cjson::cJSON_CreateArray();

    void* dir = opendir(&repo_path[0]);
    if (dir != null) {
        Dirent* entry;
        while ((entry = readdir(dir)) != null) {
            if (entry.d_name[0] == '.') continue;
            if (libc::strstr((ZString)&entry.d_name[0], (ZString)query) != null) {
                cjson::cJSON_AddItemToArray(result, cjson::cJSON_CreateString(&entry.d_name[0]));
            }
        }
        closedir(dir);
    }

    char* json_str = cjson::cJSON_PrintUnformatted(result);
    webview::webview_return(w, id, 0, json_str);
    cjson::cJSON_Delete(result);
    libc::free(json_str);
}

// --- Init ---

fn int init() {
    init_git();

    int rc;
    rc = core::rpc::register("repo.set_workspace", &handle_repo_set_workspace);
    if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("repo.get_workspace", &handle_repo_get_workspace);
    if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("repo.clone", &handle_repo_clone);
    if (rc != errors::ERR_OK) return rc;

    rc = core::rpc::register("repo.list", &handle_repo_list);
    if (rc != errors::ERR_OK) return rc;

    rc = core::rpc::register("repo.info", &handle_repo_info);
    if (rc != errors::ERR_OK) return rc;

    rc = core::rpc::register("repo.tree", &handle_repo_tree);
    if (rc != errors::ERR_OK) return rc;

    rc = core::rpc::register("repo.file", &handle_repo_file);
    if (rc != errors::ERR_OK) return rc;

    rc = core::rpc::register("repo.history", &handle_repo_history);
    if (rc != errors::ERR_OK) return rc;

    rc = core::rpc::register("repo.branches", &handle_repo_branches);
    if (rc != errors::ERR_OK) return rc;

    rc = core::rpc::register("repo.search", &handle_repo_search);
    if (rc != errors::ERR_OK) return rc;

    return errors::ERR_OK;
}
