module libgit2;

typedef GitRepository = void*;
typedef GitRemote = void*;
typedef GitReference = void*;
typedef GitCloneOptions = void*;
typedef GitCheckoutOptions = void*;
typedef GitRevwalk = void*;
typedef GitCommit = void*;
typedef GitTree = void*;
typedef GitTreeEntry = void*;
typedef GitDiff = void*;
typedef GitBuf = void*;

// Lifecycle
extern fn int git_libgit2_init();
extern fn int git_libgit2_shutdown();

// Repository
extern fn int git_repository_open(GitRepository* out, char* path);
extern fn int git_repository_open_ext(GitRepository* out, char* path, int flags, char* ceiling_dirs);
extern fn int git_repository_free(GitRepository repo);
extern fn int git_repository_path(GitRepository repo);
extern fn int git_repository_is_bare(GitRepository repo);
extern fn int git_repository_is_empty(GitRepository repo);

// References
extern fn int git_repository_head(GitReference* out, GitRepository repo);
extern fn char* git_reference_name(GitReference ref);
extern fn GitOid* git_reference_target(GitReference ref);
extern fn int git_reference_free(GitReference ref);

// Branches
extern fn int git_branch_iterator_new(void** out, GitRepository repo, int list_flags);
extern fn int git_branch_next(GitReference* out, int* out_type, void* iter);
extern fn int git_branch_iterator_free(void* iter);
extern fn int git_branch_name(char** out, GitReference ref);

// Remote
extern fn int git_remote_list(GitStrArray* out, GitRepository repo);
extern fn int git_remote_lookup(GitRemote* out, GitRepository repo, char* name);
extern fn char* git_remote_url(GitRemote remote);
extern fn int git_remote_free(GitRemote remote);

// Revwalk (history)
extern fn int git_revwalk_new(GitRevwalk* out, GitRepository repo);
extern fn int git_revwalk_push_head(GitRevwalk walk);
extern fn int git_revwalk_push(GitRevwalk walk, GitOid* id);
extern fn int git_revwalk_sorting(GitRevwalk walk, uint sort_mode);
extern fn int git_revwalk_next(GitOid* out, GitRevwalk walk);
extern fn int git_revwalk_free(GitRevwalk walk);

// Commit
extern fn int git_commit_lookup(GitCommit* out, GitRepository repo, GitOid* id);
extern fn char* git_commit_message(GitCommit commit);
extern fn GitOid* git_commit_id(GitCommit commit);
extern fn int git_commit_author(GitSignature* out, GitCommit commit);
extern fn int git_commit_free(GitCommit commit);

// Signature

// Tree
extern fn int git_commit_tree(GitTree* out, GitCommit commit);
extern fn int git_tree_entrycount(GitTree tree);
extern fn int git_tree_entry_byindex(GitTreeEntry* out, GitTree tree, int idx);
extern fn int git_tree_entry_byname(GitTreeEntry* out, GitTree tree, char* filename);
extern fn char* git_tree_entry_name(GitTreeEntry entry);
extern fn int git_tree_entry_type(GitTreeEntry entry);
extern fn GitOid* git_tree_entry_id(GitTreeEntry entry);
extern fn int git_tree_entry_filemode(GitTreeEntry entry);
extern fn int git_tree_free(GitTree tree);

// Blob (file content)
extern fn int git_blob_lookup(GitBlob* out, GitRepository repo, GitOid* id);
extern fn uptr git_blob_rawsize(GitBlob blob);
extern fn void* git_blob_rawcontent(GitBlob blob);
extern fn int git_blob_free(GitBlob blob);

// Diff
extern fn int git_diff_tree_to_tree(GitDiff* diff, GitRepository repo, GitTree old_tree, GitTree new_tree, GitDiffOptions* opts);
extern fn int git_diff_num_deltas(GitDiff diff);
extern fn int git_diff_get_delta(GitDiffDelta* out, GitDiff diff, int idx);
extern fn int git_diff_free(GitDiff diff);

// Status
extern fn int git_status_list_new(void** out, GitRepository repo, GitStatusOptions* opts);
extern fn int git_status_byindex(void** out, void* statuslist, int idx);
extern fn int git_status_list_free(void* statuslist);

// Config
extern fn int git_repository_config(GitConfig* out, GitRepository repo);
extern fn int git_config_get_string(char** out, GitConfig cfg, char* name);
extern fn int git_config_free(GitConfig cfg);

// Index (read-only)
extern fn int git_repository_index(void** out, GitRepository repo);
extern fn int git_index_entrycount(void* index);
extern fn int git_index_get_byindex(void** out, void* index, int n);
extern fn int git_index_free(void* index);

// Types
struct GitStrArray { char** strings; int count; }
struct GitOid { char[20] id; }
struct GitTime { long time; int offset; char sign; }
struct GitSignature { char* name; char* email; GitTime when; }
typedef GitConfig = void*;
typedef GitBlob = void*;
typedef GitDiffDelta = void*;
typedef GitStatusOptions = void*;
typedef GitDiffOptions = void*;

// Tree entry types
const int GIT_OBJECT_BLOB = 3;
const int GIT_OBJECT_TREE = 2;

// Branch types
const int GIT_BRANCH_LOCAL = 1;
const int GIT_BRANCH_REMOTE = 2;

// Sort modes
const int GIT_SORT_NONE = 0;
const int GIT_SORT_TOPOLOGICAL = 1;
const int GIT_SORT_TIME = 2;
const int GIT_SORT_REVERSE = 4;

// Status flags
const int GIT_STATUS_CURRENT = 0;
const int GIT_STATUS_INDEX_NEW = 1;
const int GIT_STATUS_INDEX_MODIFIED = 2;
const int GIT_STATUS_INDEX_DELETED = 4;
const int GIT_STATUS_WT_MODIFIED = 16;
const int GIT_STATUS_WT_DELETED = 32;
