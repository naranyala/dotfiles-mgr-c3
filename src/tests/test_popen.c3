module test_popen;
import std::io;
import libc;
import cjson;
import features::git;

fn void test_main() {
    char[1024] buf;
    void* fp = git::popen("find ./examples -name .git -type d", "r");
    if (fp != null) {
        while (git::fgets(&buf[0], 1024, fp) != null) {
            // strip newline
            buf[libc::strlen((ZString)&buf[0]) - 1] = 0;
            io::printn(&buf[0]);
        }
        git::pclose(fp);
    }
}
