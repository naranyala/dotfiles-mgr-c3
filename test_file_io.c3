module test_file_io;
import libc;
import std::io;

extern fn void* fopen(char* filename, char* mode);
extern fn int fclose(void* stream);
extern fn int fputs(char* s, void* stream);
extern fn char* fgets(char* s, int size, void* stream);

fn int main() {
    char* file_path = "test_workspace.txt";
    
    // Write
    void* fp = fopen(file_path, "w");
    if (fp != null) {
        fputs("/tmp/my_workspace", fp);
        fclose(fp);
    }
    
    // Read
    char[512] buf;
    buf[0] = 0;
    void* fp2 = fopen(file_path, "r");
    if (fp2 != null) {
        if (fgets(&buf[0], 512, fp2) != null) {
            io::printn(&buf[0]);
        }
        fclose(fp2);
    }
    
    return 0;
}
