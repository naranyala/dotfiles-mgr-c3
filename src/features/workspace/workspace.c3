module features::workspace;
import webview;
import cjson;
import libc;
import core::rpc;
import core::errors;
extern fn int mkdir(char* path, int mode);

const char* CONFIG_DIR = "/media/naranyala/Data/projects-remote/dotfiles-mgr-c3/state";
const char* CONFIG_FILE = "/media/naranyala/Data/projects-remote/dotfiles-mgr-c3/state/workspaces.json";
const char* REPOS_DIR = "./examples/repos";

fn int init() {
    mkdir(CONFIG_DIR, 0755);

    int rc;
    rc = core::rpc::register("workspace.list", &handle_workspace_list);
    if (rc != errors::ERR_OK) return rc;

    rc = core::rpc::register("workspace.get", &handle_workspace_get);
    if (rc != errors::ERR_OK) return rc;

    rc = core::rpc::register("workspace.create", &handle_workspace_create);
    if (rc != errors::ERR_OK) return rc;

    rc = core::rpc::register("workspace.delete", &handle_workspace_delete);
    if (rc != errors::ERR_OK) return rc;

    rc = core::rpc::register("workspace.rename", &handle_workspace_rename);
    if (rc != errors::ERR_OK) return rc;

    rc = core::rpc::register("workspace.add-group", &handle_workspace_add_group);
    if (rc != errors::ERR_OK) return rc;

    rc = core::rpc::register("workspace.remove-group", &handle_workspace_remove_group);
    if (rc != errors::ERR_OK) return rc;

    rc = core::rpc::register("workspace.add-repo", &handle_workspace_add_repo);
    if (rc != errors::ERR_OK) return rc;

    rc = core::rpc::register("workspace.remove-repo", &handle_workspace_remove_repo);
    if (rc != errors::ERR_OK) return rc;

    rc = core::rpc::register("workspace.restore-repo", &handle_workspace_restore_repo);
    if (rc != errors::ERR_OK) return rc;

    return errors::ERR_OK;
}
