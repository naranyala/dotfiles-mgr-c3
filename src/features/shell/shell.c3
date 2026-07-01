module features::shell;
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
extern fn void* opendir(char* name);
extern fn void* readdir(void* dirp);
extern fn int closedir(void* dirp);
extern fn int mkdir(char* path, int mode);
extern fn int rmdir(char* path);
extern fn int unlink(char* path);
extern fn int system(char* command);
extern fn char* getenv(char* name);
extern fn int setenv(char* name, char* value, int overwrite);
extern fn int unsetenv(char* name);
extern fn int kill(int pid, int sig);
extern fn int getpid();
extern fn char* getcwd(char* buf, int size);
extern fn int chdir(char* path);
extern fn int access(char* path, int mode);
extern fn char* getlogin();
extern fn int gethostname(char* name, int len);

struct Dirent { ulong d_ino; long d_off; ushort d_reclen; char d_type; char[256] d_name; }

const char* WORKSPACE_DIR = "/media/naranyala/Data/projects-remote/dotfiles-mgr-c3/workspace";
const char* TRASH_DIR = "/media/naranyala/Data/projects-remote/dotfiles-mgr-c3/workspace/.trash";
char[512] global_cwd;

fn void init_cwd() {
    char[512] buf;
    if (getcwd(&buf[0], 512) != null) {
        libc::strncpy(&global_cwd[0], &buf[0], 511);
        global_cwd[511] = 0;
    } else {
        libc::strncpy(&global_cwd[0], WORKSPACE_DIR, 511);
    }
    mkdir(WORKSPACE_DIR, 0o755);
    mkdir(TRASH_DIR, 0o755);
}

fn void json_return(webview::Webview w, char* id, int status, cjson::CJson obj) {
    char* str = cjson::cJSON_PrintUnformatted(obj);
    webview::webview_return(w, id, status, str);
    libc::free(str);
    cjson::cJSON_Delete(obj);
}

fn void json_return_ok(webview::Webview w, char* id, cjson::CJson obj) {
    json_return(w, id, 0, obj);
}

fn void json_return_err(webview::Webview w, char* id, char* message) {
    cjson::CJson obj = cjson::cJSON_CreateObject();
    cjson::cJSON_AddBoolToObject(obj, "error", 1);
    cjson::cJSON_AddStringToObject(obj, "message", message);
    json_return(w, id, 1, obj);
}

fn char* arg_str(cjson::CJson args, int index) {
    if (cjson::cJSON_GetArraySize(args) <= index) return null;
    cjson::CJson item = cjson::cJSON_GetArrayItem(args, index);
    if (!cjson::cJSON_IsString(item)) return null;
    return cjson::cJSON_GetStringValue(item);
}

fn char* arg_str_default(cjson::CJson args, int index, char* def) {
    char* s = arg_str(args, index);
    return s != null ? s : def;
}

fn double arg_num(cjson::CJson args, int index, double def) {
    if (cjson::cJSON_GetArraySize(args) <= index) return def;
    cjson::CJson item = cjson::cJSON_GetArrayItem(args, index);
    if (!cjson::cJSON_IsNumber(item)) return def;
    return cjson::cJSON_GetNumberValue(item);
}

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
    char* result = libc::malloc((usz)(len + 1));
    libc::strncpy(result, &output[0], (usz)(len + 1));
    return result;
}

fn void handle_exec(webview::Webview w, char* id, cjson::CJson args) {
    char* cmd = arg_str(args, 1);
    if (cmd == null) { json_return_err(w, id, "Missing command"); return; }

    char[2048] full_cmd;
    libc::snprintf(&full_cmd[0], 2048, "cd '%s' && %s 2>&1", &global_cwd[0], cmd);
    char* output = run_cmd(&full_cmd[0]);
    if (output == null) { json_return_err(w, id, "Failed to execute command"); return; }

    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddStringToObject(result, "output", output);
    libc::free(output);
    json_return_ok(w, id, result);
}

fn void handle_log(webview::Webview w, char* id, cjson::CJson args) {
    char* msg = arg_str(args, 1);
    char* level = arg_str_default(args, 2, "info");
    if (msg == null) { json_return_err(w, id, "Missing message"); return; }

    libc::printf("[%s] %s\n", level, msg);
    cjson::CJson obj = cjson::cJSON_CreateObject();
    cjson::cJSON_AddBoolToObject(obj, "ok", 1);
    json_return_ok(w, id, obj);
}

fn void handle_hostname(webview::Webview w, char* id, cjson::CJson args) {
    char[256] buf;
    gethostname(&buf[0], 256);
    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddStringToObject(result, "hostname", &buf[0]);
    json_return_ok(w, id, result);
}

fn void handle_username(webview::Webview w, char* id, cjson::CJson args) {
    char* user = getlogin();
    if (user == null) user = getenv("USER");
    if (user == null) user = "unknown";
    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddStringToObject(result, "username", user);
    json_return_ok(w, id, result);
}

fn void handle_uname(webview::Webview w, char* id, cjson::CJson args) {
    char* output = run_cmd("uname -srvm");
    if (output == null) { json_return_err(w, id, "uname failed"); return; }
    int len = (int)libc::strlen((ZString)output);
    if (len > 0 && output[len - 1] == '\n') output[len - 1] = 0;

    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddStringToObject(result, "raw", output);
    cjson::cJSON_AddStringToObject(result, "sysname", "Linux");
    cjson::cJSON_AddStringToObject(result, "machine", output);
    cjson::cJSON_AddStringToObject(result, "release", "");
    cjson::cJSON_AddStringToObject(result, "version", "");
    libc::free(output);
    json_return_ok(w, id, result);
}

fn void handle_memory_info(webview::Webview w, char* id, cjson::CJson args) {
    char* output = run_cmd("free -b | awk '/Mem:/{print $2,$7}'");
    if (output == null) { json_return_err(w, id, "Failed to get memory info"); return; }

    long total = 0;
    long available = 0;
    libc::sscanf(output, "%ld %ld", &total, &available);
    long used = total - available;
    int used_pct = total > 0 ? (int)(used * 100 / total) : 0;

    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddNumberToObject(result, "total", (double)total);
    cjson::cJSON_AddNumberToObject(result, "available", (double)available);
    cjson::cJSON_AddNumberToObject(result, "used", (double)used);
    cjson::cJSON_AddNumberToObject(result, "usedPercent", (double)used_pct);
    libc::free(output);
    json_return_ok(w, id, result);
}

fn void handle_uptime(webview::Webview w, char* id, cjson::CJson args) {
    char* output = run_cmd("cat /proc/uptime | awk '{print $1}'");
    if (output == null) { json_return_err(w, id, "Failed to get uptime"); return; }

    double seconds = 0;
    libc::sscanf(output, "%lf", &seconds);

    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddNumberToObject(result, "seconds", seconds);
    libc::free(output);
    json_return_ok(w, id, result);
}

fn void handle_disk_usage(webview::Webview w, char* id, cjson::CJson args) {
    char* path = arg_str_default(args, 1, "/");
    char[512] cmd;
    libc::snprintf(&cmd[0], 512, "df -B1 '%s' | awk 'NR==2{print $2,$3,$4,$5}'", path);
    char* output = run_cmd(&cmd[0]);
    if (output == null) { json_return_err(w, id, "Failed to get disk usage"); return; }

    long total = 0;
    long used = 0;
    long disk_free = 0;
    int used_pct = 0;
    libc::sscanf(output, "%ld %ld %ld %d%%", &total, &used, &disk_free, &used_pct);

    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddNumberToObject(result, "total", (double)total);
    cjson::cJSON_AddNumberToObject(result, "used", (double)used);
    cjson::cJSON_AddNumberToObject(result, "free", (double)disk_free);
    cjson::cJSON_AddNumberToObject(result, "usedPercent", (double)used_pct);
    libc::free(output);
    json_return_ok(w, id, result);
}

fn void handle_system_info(webview::Webview w, char* id, cjson::CJson args) {
    char* home = getenv("HOME");
    if (home == null) home = "/root";

    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddStringToObject(result, "platform", "linux");
    cjson::cJSON_AddStringToObject(result, "homeDir", home);
    cjson::cJSON_AddStringToObject(result, "cwd", &global_cwd[0]);
    json_return_ok(w, id, result);
}

fn void handle_read_file(webview::Webview w, char* id, cjson::CJson args) {
    char* path = arg_str(args, 1);
    if (path == null) { json_return_err(w, id, "Missing path"); return; }

    void* f = libc::fopen((ZString)path, "r");
    if (f == null) { json_return_err(w, id, "File not found"); return; }

    libc::fseek(f, 0, libc::SEEK_END);
    long size = libc::ftell(f);
    libc::fseek(f, 0, libc::SEEK_SET);

    char* content = libc::malloc((usz)size + 1);
    libc::fread(content, 1, (usz)size, f);
    content[size] = 0;
    libc::fclose(f);

    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddStringToObject(result, "content", content);
    cjson::cJSON_AddNumberToObject(result, "size", (double)size);
    cjson::cJSON_AddStringToObject(result, "path", path);
    libc::free(content);
    json_return_ok(w, id, result);
}

fn void handle_write_file(webview::Webview w, char* id, cjson::CJson args) {
    char* path = arg_str(args, 1);
    char* content = arg_str(args, 2);
    if (path == null || content == null) { json_return_err(w, id, "Missing path or content"); return; }

    void* f = libc::fopen((ZString)path, "w");
    if (f == null) { json_return_err(w, id, "Failed to open file for writing"); return; }

    libc::fwrite(content, 1, libc::strlen((ZString)content), f);
    libc::fclose(f);

    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddBoolToObject(result, "ok", 1);
    cjson::cJSON_AddNumberToObject(result, "bytes", (double)libc::strlen((ZString)content));
    json_return_ok(w, id, result);
}

fn void handle_exists(webview::Webview w, char* id, cjson::CJson args) {
    char* path = arg_str(args, 1);
    if (path == null) { json_return_err(w, id, "Missing path"); return; }

    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddBoolToObject(result, "exists", access(path, 0) == 0 ? 1 : 0);
    json_return_ok(w, id, result);
}

fn void handle_is_dir(webview::Webview w, char* id, cjson::CJson args) {
    char* path = arg_str(args, 1);
    if (path == null) { json_return_err(w, id, "Missing path"); return; }

    void* dir = opendir(path);
    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddBoolToObject(result, "isDir", dir != null ? 1 : 0);
    if (dir != null) closedir(dir);
    json_return_ok(w, id, result);
}

fn void handle_stat(webview::Webview w, char* id, cjson::CJson args) {
    char* path = arg_str(args, 1);
    if (path == null) { json_return_err(w, id, "Missing path"); return; }

    void* dir = opendir(path);
    int is_dir = dir != null ? 1 : 0;
    if (dir != null) closedir(dir);

    char[512] cmd;
    libc::snprintf(&cmd[0], 512, "stat -c '%%s %%f' '%s' 2>/dev/null", path);
    char* output = run_cmd(&cmd[0]);
    long size = 0;
    long mode = 0;
    if (output != null) {
        libc::sscanf(output, "%ld %ld", &size, &mode);
        libc::free(output);
    }

    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddStringToObject(result, "path", path);
    cjson::cJSON_AddNumberToObject(result, "size", (double)size);
    cjson::cJSON_AddNumberToObject(result, "mode", (double)mode);
    cjson::cJSON_AddNumberToObject(result, "isDir", (double)is_dir);
    cjson::cJSON_AddNumberToObject(result, "isFile", is_dir == 0 ? 1.0 : 0.0);
    json_return_ok(w, id, result);
}

fn void handle_mkdir(webview::Webview w, char* id, cjson::CJson args) {
    char* path = arg_str(args, 1);
    if (path == null) { json_return_err(w, id, "Missing path"); return; }

    int rc = mkdir(path, 0o755);
    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddBoolToObject(result, "ok", rc == 0 ? 1 : 0);
    if (rc != 0) {
        cjson::cJSON_AddStringToObject(result, "error", "mkdir failed");
    }
    json_return_ok(w, id, result);
}

fn void handle_remove(webview::Webview w, char* id, cjson::CJson args) {
    char* path = arg_str(args, 1);
    if (path == null) { json_return_err(w, id, "Missing path"); return; }

    int rc = unlink(path);
    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddBoolToObject(result, "ok", rc == 0 ? 1 : 0);
    if (rc != 0) {
        cjson::cJSON_AddStringToObject(result, "error", "remove failed");
    }
    json_return_ok(w, id, result);
}

fn void handle_list_dir(webview::Webview w, char* id, cjson::CJson args) {
    char* path = arg_str_default(args, 1, ".");
    void* dir = opendir(path);
    if (dir == null) { json_return_err(w, id, "Failed to open directory"); return; }

    cjson::CJson entries = cjson::cJSON_CreateArray();
    Dirent* entry;
    while ((entry = readdir(dir)) != null) {
        if (entry.d_name[0] == '.' && (entry.d_name[1] == 0 || (entry.d_name[1] == '.' && entry.d_name[2] == 0))) continue;
        cjson::CJson item = cjson::cJSON_CreateObject();
        cjson::cJSON_AddStringToObject(item, "name", &entry.d_name[0]);
        cjson::cJSON_AddBoolToObject(item, "isDir", entry.d_type == 4 ? 1 : 0);
        cjson::cJSON_AddItemToArray(entries, item);
    }
    closedir(dir);

    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddItemToObject(result, "entries", entries);
    cjson::cJSON_AddStringToObject(result, "path", path);
    json_return_ok(w, id, result);
}

fn void handle_glob(webview::Webview w, char* id, cjson::CJson args) {
    char* pattern = arg_str(args, 1);
    if (pattern == null) { json_return_err(w, id, "Missing pattern"); return; }

    char[1024] cmd;
    libc::snprintf(&cmd[0], 1024, "find '%s' -maxdepth 5 -type f 2>/dev/null | head -200", pattern);
    char* output = run_cmd(&cmd[0]);
    if (output == null) output = libc::strdup("");

    cjson::CJson matches = cjson::cJSON_CreateArray();
    char* line = output;
    while (*line) {
        char* eol = libc::strchr(line, '\n');
        if (eol != null) *eol = 0;
        if (libc::strlen((ZString)line) > 0) {
            cjson::cJSON_AddItemToArray(matches, cjson::cJSON_CreateString(line));
        }
        if (eol != null) { line = eol + 1; } else { break; }
    }
    libc::free(output);

    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddItemToObject(result, "matches", matches);
    json_return_ok(w, id, result);
}

fn void handle_git_list(webview::Webview w, char* id, cjson::CJson args) {
    cjson::CJson repos = cjson::cJSON_CreateArray();
    void* dir = opendir(WORKSPACE_DIR);
    if (dir != null) {
        Dirent* entry;
        while ((entry = readdir(dir)) != null) {
            if (entry.d_name[0] == '.') continue;
            char[1024] full_path;
            libc::snprintf(&full_path[0], 1024, "%s/%s/.git", WORKSPACE_DIR, &entry.d_name[0]);
            void* git_dir = opendir(&full_path[0]);
            if (git_dir != null) {
                closedir(git_dir);
                cjson::CJson item = cjson::cJSON_CreateObject();
                cjson::cJSON_AddStringToObject(item, "name", &entry.d_name[0]);
                cjson::cJSON_AddStringToObject(item, "path", &full_path[0]);
                cjson::cJSON_AddItemToArray(repos, item);
            }
        }
        closedir(dir);
    }
    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddItemToObject(result, "repos", repos);
    json_return_ok(w, id, result);
}

fn void handle_git_clone(webview::Webview w, char* id, cjson::CJson args) {
    char* url = arg_str(args, 1);
    if (url == null) { json_return_err(w, id, "Missing URL"); return; }

    char[2048] cmd;
    libc::snprintf(&cmd[0], 2048, "cd '%s' && git clone --depth=1 '%s' 2>&1", WORKSPACE_DIR, url);
    char* output = run_cmd(&cmd[0]);

    int status = 0;
    if (output != null) {
        status = libc::strstr((ZString)output, (ZString)"fatal:") != null ? 1 : 0;
        libc::free(output);
    }

    if (status != 0) {
        json_return_err(w, id, "Clone failed");
        return;
    }

    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddBoolToObject(result, "ok", 1);
    json_return_ok(w, id, result);
}

fn void handle_git_remove(webview::Webview w, char* id, cjson::CJson args) {
    char* name = arg_str(args, 1);
    if (name == null) { json_return_err(w, id, "Missing repo name"); return; }

    char[1024] src;
    char[1024] dst;
    libc::snprintf(&src[0], 1024, "%s/%s", WORKSPACE_DIR, name);
    libc::snprintf(&dst[0], 1024, "%s/%s", TRASH_DIR, name);

    char[2048] cmd;
    libc::snprintf(&cmd[0], 2048, "mv '%s' '%s' 2>&1", &src[0], &dst[0]);
    char* output = run_cmd(&cmd[0]);
    if (output != null) libc::free(output);

    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddBoolToObject(result, "ok", 1);
    json_return_ok(w, id, result);
}

fn void handle_git_restore(webview::Webview w, char* id, cjson::CJson args) {
    char* name = arg_str(args, 1);
    if (name == null) { json_return_err(w, id, "Missing repo name"); return; }

    char[1024] src;
    char[1024] dst;
    libc::snprintf(&src[0], 1024, "%s/%s", TRASH_DIR, name);
    libc::snprintf(&dst[0], 1024, "%s/%s", WORKSPACE_DIR, name);

    char[2048] cmd;
    libc::snprintf(&cmd[0], 2048, "mv '%s' '%s' 2>&1", &src[0], &dst[0]);
    char* output = run_cmd(&cmd[0]);
    if (output != null) libc::free(output);

    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddBoolToObject(result, "ok", 1);
    json_return_ok(w, id, result);
}

fn void handle_git_trash_list(webview::Webview w, char* id, cjson::CJson args) {
    cjson::CJson repos = cjson::cJSON_CreateArray();
    void* dir = opendir(TRASH_DIR);
    if (dir != null) {
        Dirent* entry;
        while ((entry = readdir(dir)) != null) {
            if (entry.d_name[0] == '.') continue;
            cjson::CJson item = cjson::cJSON_CreateObject();
            cjson::cJSON_AddStringToObject(item, "name", &entry.d_name[0]);
            cjson::cJSON_AddItemToArray(repos, item);
        }
        closedir(dir);
    }
    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddItemToObject(result, "repos", repos);
    json_return_ok(w, id, result);
}

fn void handle_search_query(webview::Webview w, char* id, cjson::CJson args) {
    char* query = arg_str(args, 1);
    if (query == null) { json_return_err(w, id, "Missing query"); return; }

    char[2048] cmd;
    libc::snprintf(&cmd[0], 2048, "grep -rl '%s' '%s' 2>/dev/null | head -50", query, &global_cwd[0]);
    char* output = run_cmd(&cmd[0]);
    if (output == null) output = libc::strdup("");

    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddStringToObject(result, "results", output);
    libc::free(output);
    json_return_ok(w, id, result);
}

fn void handle_metrics_get_stats(webview::Webview w, char* id, cjson::CJson args) {
    char* output = run_cmd("nproc 2>/dev/null");
    int cpu_count = 1;
    if (output != null) {
        cpu_count = libc::atoi(output);
        if (cpu_count < 1) cpu_count = 1;
        libc::free(output);
    }

    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddNumberToObject(result, "uptime", 0);
    cjson::cJSON_AddNumberToObject(result, "cpuCount", (double)cpu_count);
    json_return_ok(w, id, result);
}

fn void handle_system_probe(webview::Webview w, char* id, cjson::CJson args) {
    cjson::CJson result = cjson::cJSON_CreateObject();
    char* output = run_cmd("cat /proc/loadavg");
    if (output != null) {
        int len = (int)libc::strlen((ZString)output);
        if (len > 0 && output[len - 1] == '\n') output[len - 1] = 0;
        cjson::cJSON_AddStringToObject(result, "loadAvg", output);
        libc::free(output);
    }
    cjson::cJSON_AddNumberToObject(result, "pid", (double)getpid());
    json_return_ok(w, id, result);
}

fn void handle_env_get(webview::Webview w, char* id, cjson::CJson args) {
    char* name = arg_str(args, 1);
    if (name == null) { json_return_err(w, id, "Missing variable name"); return; }

    char* val = getenv(name);
    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddStringToObject(result, "value", val != null ? val : "");
    json_return_ok(w, id, result);
}

fn void handle_env_set(webview::Webview w, char* id, cjson::CJson args) {
    char* name = arg_str(args, 1);
    char* value = arg_str(args, 2);
    if (name == null || value == null) { json_return_err(w, id, "Missing name or value"); return; }

    setenv(name, value, 1);
    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddBoolToObject(result, "ok", 1);
    json_return_ok(w, id, result);
}

fn void handle_env_list(webview::Webview w, char* id, cjson::CJson args) {
    char* output = run_cmd("env");
    if (output == null) { json_return_err(w, id, "Failed to get environment"); return; }

    cjson::CJson result = cjson::cJSON_CreateArray();
    char* line = output;
    while (*line) {
        char* end = libc::strchr(line, '\n');
        if (end != null) {
            *end = 0;
            if (libc::strlen((ZString)line) > 0) {
                cjson::cJSON_AddItemToArray(result, cjson::cJSON_CreateString(line));
            }
            line = end + 1;
        } else {
            if (libc::strlen((ZString)line) > 0) {
                cjson::cJSON_AddItemToArray(result, cjson::cJSON_CreateString(line));
            }
            break;
        }
    }
    libc::free(output);
    json_return_ok(w, id, result);
}

fn void handle_which(webview::Webview w, char* id, cjson::CJson args) {
    char* cmd = arg_str(args, 1);
    if (cmd == null) { json_return_err(w, id, "Missing command"); return; }

    char[256] full_cmd;
    libc::snprintf(&full_cmd[0], 256, "which %s 2>/dev/null", cmd);
    char* output = run_cmd(&full_cmd[0]);
    if (output == null) output = libc::strdup("");

    int len = (int)libc::strlen((ZString)output);
    if (len > 0 && output[len - 1] == '\n') output[len - 1] = 0;

    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddStringToObject(result, "path", output);
    cjson::cJSON_AddBoolToObject(result, "found", len > 0 ? 1 : 0);
    libc::free(output);
    json_return_ok(w, id, result);
}

fn void handle_clipboard_get(webview::Webview w, char* id, cjson::CJson args) {
    char* output = run_cmd("xclip -selection clipboard -o 2>/dev/null");
    if (output == null) output = libc::strdup("");

    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddStringToObject(result, "text", output);
    libc::free(output);
    json_return_ok(w, id, result);
}

fn void handle_clipboard_set(webview::Webview w, char* id, cjson::CJson args) {
    char* text = arg_str(args, 1);
    if (text == null) { json_return_err(w, id, "Missing text"); return; }

    char[2048] cmd;
    libc::snprintf(&cmd[0], 2048, "echo -n '%s' | xclip -selection clipboard", text);
    char* output = run_cmd(&cmd[0]);
    if (output != null) libc::free(output);

    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddBoolToObject(result, "ok", 1);
    json_return_ok(w, id, result);
}

fn void handle_ps_list(webview::Webview w, char* id, cjson::CJson args) {
    char* sort_by = arg_str_default(args, 1, "cpu");
    char[256] cmd;
    if (libc::strcmp((ZString)sort_by, (ZString)"mem") == 0) {
        libc::snprintf(&cmd[0], 256, "ps -eo pid=,user=,%cpu=,%mem=,rss=,comm= --sort=-%%mem --no-headers | head -30");
    } else {
        libc::snprintf(&cmd[0], 256, "ps -eo pid=,user=,%cpu=,%mem=,rss=,comm= --sort=-%%cpu --no-headers | head -30");
    }
    char* output = run_cmd(&cmd[0]);
    if (output == null) { json_return_err(w, id, "Failed to get process list"); return; }

    cjson::CJson procs = cjson::cJSON_CreateArray();
    char* line = output;
    while (*line) {
        char* eol = libc::strchr(line, '\n');
        if (eol != null) *eol = 0;

        char[64] pid_buf;
        char[64] user_buf;
        double cpu = 0;
        double mem = 0;
        long rss = 0;
        char[256] comm_buf;
        pid_buf[0] = 0;
        user_buf[0] = 0;
        comm_buf[0] = 0;

        libc::sscanf(line, "%s %s %lf %lf %ld %255[^\n]", &pid_buf[0], &user_buf[0], &cpu, &mem, &rss, &comm_buf[0]);

        if (pid_buf[0] != 0) {
            cjson::CJson proc = cjson::cJSON_CreateObject();
            cjson::cJSON_AddStringToObject(proc, "pid", &pid_buf[0]);
            cjson::cJSON_AddNumberToObject(proc, "cpu", cpu);
            cjson::cJSON_AddNumberToObject(proc, "mem", mem);
            cjson::cJSON_AddNumberToObject(proc, "rss", (double)rss);
            cjson::cJSON_AddStringToObject(proc, "command", &comm_buf[0]);
            cjson::cJSON_AddStringToObject(proc, "user", &user_buf[0]);
            cjson::cJSON_AddItemToArray(procs, proc);
        }

        if (eol != null) { line = eol + 1; } else { break; }
    }
    libc::free(output);
    json_return_ok(w, id, procs);
}

fn void handle_ps_kill(webview::Webview w, char* id, cjson::CJson args) {
    char* pid_str = arg_str(args, 1);
    if (pid_str == null) { json_return_err(w, id, "Missing PID"); return; }

    int pid = libc::atoi(pid_str);
    int rc = kill(pid, 9);
    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddBoolToObject(result, "ok", rc == 0 ? 1 : 0);
    json_return_ok(w, id, result);
}

fn void handle_process_signal(webview::Webview w, char* id, cjson::CJson args) {
    char* pid_str = arg_str(args, 1);
    double sig = arg_num(args, 2, 9);
    if (pid_str == null) { json_return_err(w, id, "Missing PID"); return; }

    int pid = libc::atoi(pid_str);
    int rc = kill(pid, (int)sig);
    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddBoolToObject(result, "ok", rc == 0 ? 1 : 0);
    json_return_ok(w, id, result);
}

fn void handle_cwd(webview::Webview w, char* id, cjson::CJson args) {
    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddStringToObject(result, "path", &global_cwd[0]);
    json_return_ok(w, id, result);
}

fn void handle_set_cwd(webview::Webview w, char* id, cjson::CJson args) {
    char* path = arg_str(args, 1);
    if (path == null) { json_return_err(w, id, "Missing path"); return; }

    if (access(path, 0) != 0) { json_return_err(w, id, "Path does not exist"); return; }

    libc::strncpy(&global_cwd[0], path, 511);
    global_cwd[511] = 0;

    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddBoolToObject(result, "ok", 1);
    json_return_ok(w, id, result);
}

fn void handle_expand_env(webview::Webview w, char* id, cjson::CJson args) {
    char* tpl = arg_str(args, 1);
    if (tpl == null) { json_return_err(w, id, "Missing template"); return; }

    char[2048] cmd;
    libc::snprintf(&cmd[0], 2048, "echo '%s'", tpl);
    char* output = run_cmd(&cmd[0]);
    if (output == null) output = libc::strdup((ZString)tpl);

    int len = (int)libc::strlen((ZString)output);
    if (len > 0 && output[len - 1] == '\n') output[len - 1] = 0;

    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddStringToObject(result, "value", output);
    libc::free(output);
    json_return_ok(w, id, result);
}

fn void handle_path_join(webview::Webview w, char* id, cjson::CJson args) {
    int count = cjson::cJSON_GetArraySize(args) - 1;
    char[2048] path;
    path[0] = 0;
    for (int i = 1; i <= count; i++) {
        char* part = arg_str(args, i);
        if (part == null) continue;
        if (i > 1 && part[0] != '/') {
            libc::strncat(&path[0], "/", 2048 - libc::strlen((ZString)&path[0]) - 1);
        }
        libc::strncat(&path[0], part, 2048 - libc::strlen((ZString)&path[0]) - 1);
    }
    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddStringToObject(result, "path", &path[0]);
    json_return_ok(w, id, result);
}

fn void handle_path_dirname(webview::Webview w, char* id, cjson::CJson args) {
    char* path = arg_str(args, 1);
    if (path == null) { json_return_err(w, id, "Missing path"); return; }

    char[1024] cmd;
    libc::snprintf(&cmd[0], 1024, "dirname '%s'", path);
    char* output = run_cmd(&cmd[0]);
    if (output == null) output = libc::strdup(".");

    int len = (int)libc::strlen((ZString)output);
    if (len > 0 && output[len - 1] == '\n') output[len - 1] = 0;

    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddStringToObject(result, "path", output);
    libc::free(output);
    json_return_ok(w, id, result);
}

fn void handle_path_basename(webview::Webview w, char* id, cjson::CJson args) {
    char* path = arg_str(args, 1);
    if (path == null) { json_return_err(w, id, "Missing path"); return; }

    char[1024] cmd;
    libc::snprintf(&cmd[0], 1024, "basename '%s'", path);
    char* output = run_cmd(&cmd[0]);
    if (output == null) output = libc::strdup("");

    int len = (int)libc::strlen((ZString)output);
    if (len > 0 && output[len - 1] == '\n') output[len - 1] = 0;

    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddStringToObject(result, "name", output);
    libc::free(output);
    json_return_ok(w, id, result);
}

fn void build_tree(char* dir_path, cjson::CJson parent_array, int depth) {
    if (depth > 4) return;
    void* dir = opendir(dir_path);
    if (dir == null) return;
    Dirent* entry;
    while ((entry = readdir(dir)) != null) {
        if (entry.d_name[0] == '.') continue;
        cjson::CJson node = cjson::cJSON_CreateObject();
        cjson::cJSON_AddStringToObject(node, "name", &entry.d_name[0]);
        char[1024] full_path;
        libc::snprintf(&full_path[0], 1024, "%s/%s", dir_path, &entry.d_name[0]);
        if (entry.d_type == 4) {
            cjson::cJSON_AddStringToObject(node, "type", "folder");
            cjson::CJson children = cjson::cJSON_CreateArray();
            build_tree(&full_path[0], children, depth + 1);
            cjson::cJSON_AddItemToObject(node, "children", children);
        } else {
            cjson::cJSON_AddStringToObject(node, "type", "file");
            cjson::cJSON_AddStringToObject(node, "id", &full_path[0]);
        }
        cjson::cJSON_AddItemToArray(parent_array, node);
    }
    closedir(dir);
}

fn void handle_get_tree(webview::Webview w, char* id, cjson::CJson args) {
    char* repo_id = arg_str(args, 1);
    if (repo_id == null) { json_return_err(w, id, "Missing repo ID"); return; }
    char[1024] base_path;
    if (repo_id[0] == '/' || repo_id[0] == '.') {
        libc::strncpy(&base_path[0], repo_id, 1023);
    } else {
        libc::snprintf(&base_path[0], 1024, "%s/%s", WORKSPACE_DIR, repo_id);
    }
    cjson::CJson tree = cjson::cJSON_CreateArray();
    build_tree(&base_path[0], tree, 0);
    json_return_ok(w, id, tree);
}

fn void handle_get_file_content(webview::Webview w, char* id, cjson::CJson args) {
    char* entry_id = arg_str(args, 1);
    if (entry_id == null) { json_return_err(w, id, "Missing entry ID"); return; }
    void* f = libc::fopen((ZString)entry_id, "r");
    if (f == null) { json_return_err(w, id, "File not found"); return; }
    libc::fseek(f, 0, libc::SEEK_END);
    long size = libc::ftell(f);
    libc::fseek(f, 0, libc::SEEK_SET);
    char* content = libc::malloc((usz)size + 1);
    libc::fread(content, 1, (usz)size, f);
    content[size] = 0;
    libc::fclose(f);
    cjson::CJson result = cjson::cJSON_CreateString(content);
    char* json_str = cjson::cJSON_PrintUnformatted(result);
    webview::webview_return(w, id, 0, json_str);
    libc::free(json_str);
    cjson::cJSON_Delete(result);
    libc::free(content);
}

fn void handle_dump_backend_state(webview::Webview w, char* id, cjson::CJson args) {
    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::cJSON_AddStringToObject(result, "cwd", &global_cwd[0]);
    cjson::cJSON_AddStringToObject(result, "workspace", WORKSPACE_DIR);
    cjson::cJSON_AddStringToObject(result, "trash", TRASH_DIR);
    cjson::cJSON_AddNumberToObject(result, "methodCount", (double)core::rpc::get_methods_count());
    json_return_ok(w, id, result);
}

fn int init() {
    init_cwd();

    int rc;
    rc = core::rpc::register("exec", &handle_exec); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("log", &handle_log); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("hostname", &handle_hostname); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("username", &handle_username); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("uname", &handle_uname); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("memoryInfo", &handle_memory_info); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("uptime", &handle_uptime); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("diskUsage", &handle_disk_usage); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("systemInfo", &handle_system_info); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("readFile", &handle_read_file); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("writeFile", &handle_write_file); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("exists", &handle_exists); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("isDir", &handle_is_dir); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("stat", &handle_stat); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("mkdir", &handle_mkdir); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("remove", &handle_remove); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("listDir", &handle_list_dir); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("glob", &handle_glob); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("gitList", &handle_git_list); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("gitClone", &handle_git_clone); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("gitRemove", &handle_git_remove); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("gitRestore", &handle_git_restore); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("gitTrashList", &handle_git_trash_list); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("search_query", &handle_search_query); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("metrics_getStats", &handle_metrics_get_stats); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("systemProbe", &handle_system_probe); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("envGet", &handle_env_get); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("envSet", &handle_env_set); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("envList", &handle_env_list); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("which", &handle_which); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("clipboardGet", &handle_clipboard_get); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("clipboardSet", &handle_clipboard_set); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("psList", &handle_ps_list); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("psKill", &handle_ps_kill); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("processSignal", &handle_process_signal); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("cwd", &handle_cwd); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("setCwd", &handle_set_cwd); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("expandEnv", &handle_expand_env); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("pathJoin", &handle_path_join); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("pathDirname", &handle_path_dirname); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("pathBasename", &handle_path_basename); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("dumpBackendState", &handle_dump_backend_state); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("get_tree", &handle_get_tree); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("get_file_content", &handle_get_file_content); if (rc != errors::ERR_OK) return rc;

    return errors::ERR_OK;
}
