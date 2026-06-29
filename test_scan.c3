module test_scan;
import std::io;
import libc;
import libgit2;

// Mock CJson for test (not needed if we just print)
fn void scan_repos(char* base_path, char* rel_path, int depth) {
    if (depth > 3) return;
    
    char[1024] current_dir;
    if (libc::strlen(rel_path) == 0) {
        libc::snprintf(&current_dir[0], 1024, "%s", base_path);
    } else {
        libc::snprintf(&current_dir[0], 1024, "%s/%s", base_path, rel_path);
    }
    
    void* dir = libc::opendir(&current_dir[0]);
    if (dir == null) return;
    
    libc::Dirent* entry;
    while ((entry = libc::readdir(dir)) != null) {
        if (entry.d_name[0] == '.') continue;
        
        char[1024] entry_path;
        libc::snprintf(&entry_path[0], 1024, "%s/%s", &current_dir[0], &entry.d_name[0]);
        
        char[1024] entry_rel;
        if (libc::strlen(rel_path) == 0) {
            libc::snprintf(&entry_rel[0], 1024, "%s", &entry.d_name[0]);
        } else {
            libc::snprintf(&entry_rel[0], 1024, "%s/%s", rel_path, &entry.d_name[0]);
        }
        
        libgit2::GitRepository r;
        if (libgit2::git_repository_open(&r, &entry_path[0]) == 0) {
            io::printn(&entry_rel[0]);
            libgit2::git_repository_free(r);
        } else {
            scan_repos(base_path, &entry_rel[0], depth + 1);
        }
    }
    libc::closedir(dir);
}

fn int main() {
    libgit2::git_libgit2_init();
    scan_repos("./examples", "", 0);
    return 0;
}
