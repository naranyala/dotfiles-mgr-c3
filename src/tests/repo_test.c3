module tests::repo_test;
import features::git;
import core::rpc;
import cjson;
import libc;

fn void test_repo_init_defaults() @test {
    // Delete last_workspace.txt to force default
    libc::remove(git::LAST_WORKSPACE_FILE);
    
    git::init_git();
    
    // Check that current_workspace defaults to DEFAULT_REPOS_DIR
    assert(libc::strcmp((ZString)&git::current_workspace[0], git::DEFAULT_REPOS_DIR) == 0);
}

fn void test_repo_find_command() @test {
    git::init_git();
    
    char[1024] cmd;
    libc::snprintf(&cmd[0], 1024, "find %s -type d \\( -name \".git\" -o -name \"*.git\" \\) 2>/dev/null", (char*)&git::current_workspace[0]);
    
    void* fp = git::popen(&cmd[0], "r");
    assert(fp != null);
    
    int count = 0;
    char[1024] buf;
    while (git::fgets(&buf[0], 1024, fp) != null) {
        count++;
    }
    git::pclose(fp);
    
    // There should be multiple repos in the examples folder
    assert(count > 0);
}
