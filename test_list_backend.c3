module test_list_backend;
import libc;
import cjson;
import plugins::repo;
import webview;

fn int main(int argc, char** argv) {
    plugins::repo::init_git();
    
    // Simulate current_workspace
    libc::strncpy(&plugins::repo::current_workspace[0], "./examples", 512);

    // Call repo list but we can't easily mock webview_return
    // Instead just print the popen directly!
    char[1024] cmd;
    libc::snprintf(&cmd[0], 1024, "find %s -type d \\( -name \".git\" -o -name \"*.git\" \\) 2>/dev/null", (char*)&plugins::repo::current_workspace[0]);
    libc::printf("cmd: %s\n", &cmd[0]);

    void* fp = plugins::repo::popen(&cmd[0], "r");
    if (fp != null) {
        char[1024] buf;
        while (plugins::repo::fgets(&buf[0], 1024, fp) != null) {
            libc::printf("found: %s", &buf[0]);
        }
        plugins::repo::pclose(fp);
    }
    
    return 0;
}
