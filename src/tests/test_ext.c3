module test_ext;
import std::io;
import libgit2;

fn void test_main() {
    libgit2::git_libgit2_init();
    libgit2::GitRepository r;
    // test on non-repo inside a repo
    if (libgit2::git_repository_open_ext(&r, "./examples/repos", 1, null) == 0) {
        io::printn("Opened repos as repo!");
        libgit2::git_repository_free(r);
    } else {
        io::printn("Failed to open repos (correct)");
    }
    
    if (libgit2::git_repository_open_ext(&r, "./examples/repos/basic-commits", 1, null) == 0) {
        io::printn("Opened basic-commits as repo (correct)");
        libgit2::git_repository_free(r);
    } else {
        io::printn("Failed to open basic-commits");
    }
}
