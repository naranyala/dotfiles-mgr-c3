module test_list;
import libc;
import cjson;
import libgit2;
import std::io;

extern fn void* popen(char* command, char* type);
extern fn int pclose(void* stream);
extern fn char* fgets(char* s, int size, void* stream);

fn int main() {
    libgit2::git_libgit2_init();
    cjson::CJson result = cjson::cJSON_CreateArray();
    char* current_workspace = "./examples";

    char[1024] cmd;
    libc::snprintf(&cmd[0], 1024, "find %s -type d \\( -name \".git\" -o -name \"*.git\" \\) 2>/dev/null", current_workspace);

    void* fp = popen(&cmd[0], "r");
    if (fp != null) {
        char[1024] buf;
        while (fgets(&buf[0], 1024, fp) != null) {
            int len = (int)libc::strlen((ZString)&buf[0]);
            if (len > 0 && buf[len - 1] == '\n') buf[len - 1] = 0;
            len = (int)libc::strlen((ZString)&buf[0]);
            
            if (len > 5 && libc::strncmp((ZString)&buf[len - 5], (ZString)"/.git", 5) == 0) {
                buf[len - 5] = 0;
            }

            char* repo_path_str = &buf[0];

            libgit2::GitRepository r;
            if (libgit2::git_repository_open(&r, repo_path_str) == 0) {
                cjson::CJson repo = cjson::cJSON_CreateObject();
                cjson::cJSON_AddStringToObject(repo, "path", repo_path_str);

                char* rel_name = repo_path_str;
                int ws_len = (int)libc::strlen((ZString)current_workspace);
                if (libc::strncmp((ZString)repo_path_str, (ZString)current_workspace, (usz)ws_len) == 0) {
                    rel_name = repo_path_str + ws_len;
                    if (rel_name[0] == '/') rel_name++;
                }
                cjson::cJSON_AddStringToObject(repo, "name", rel_name);
                cjson::cJSON_AddItemToArray(result, repo);
                libgit2::git_repository_free(r);
            }
        }
        pclose(fp);
    }
    
    char* json_str = cjson::cJSON_Print(result);
    io::printn((ZString)json_str);
    return 0;
}
