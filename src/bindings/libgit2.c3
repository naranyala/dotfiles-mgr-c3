module libgit2;

typedef GitRepository = void*;
typedef GitRemote = void*;
typedef GitReference = void*;
typedef GitCloneOptions = void*;
typedef GitCheckoutOptions = void*;

extern fn int git_libgit2_init();
extern fn int git_libgit2_shutdown();
extern fn int git_clone(GitRepository* out, char* url, char* local_path, GitCloneOptions options);
extern fn int git_repository_open(GitRepository* out, char* path);
extern fn int git_repository_free(GitRepository repo);
extern fn int git_remote_create(GitRemote* out, GitRepository repo, char* name, char* url);
extern fn int git_remote_fetch(GitRemote remote, void* refspecs, void* opts, void* log_msg);
extern fn int git_remote_free(GitRemote remote);
extern fn int git_checkout_head(GitRepository repo, GitCheckoutOptions opts);
extern fn int git_repository_head(GitReference* out, GitRepository repo);
extern fn char* git_reference_name(GitReference ref);
extern fn int git_reference_free(GitReference ref);
