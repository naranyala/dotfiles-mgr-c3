module test_git;
import std::io;
import libgit2;
import libc;

fn void test_main() {
    libgit2::git_libgit2_init();
    libgit2::GitRepository r;
    if (libgit2::git_repository_open(&r, "./examples/repos/basic-commits") == 0) {
        io::printn("Successfully opened repository.");
        libgit2::git_repository_free(r);
    } else {
        io::printn("Failed to open repository.");
    }
}
