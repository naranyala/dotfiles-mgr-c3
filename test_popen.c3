module test_popen;
import std::io;
import libc;
import cjson;

fn int main() {
    char[1024] buf;
    void* fp = libc::popen("find ./examples -name .git -type d", "r");
    if (fp != null) {
        while (libc::fgets(&buf[0], 1024, fp) != null) {
            // strip newline
            buf[libc::strlen(&buf[0]) - 1] = 0;
            io::printn(&buf[0]);
        }
        libc::pclose(fp);
    }
    return 0;
}
