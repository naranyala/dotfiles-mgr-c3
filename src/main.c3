module main;
import webview;
import core::rpc;
import core::errors;
import plugins::ping;
import plugins::system;
import plugins::repo;
import plugins::workspace;
import libc;
import std::io;

fn int main() {
    errors::error_init();
    core::rpc::init();

    int rc;

    rc = plugins::ping::init();
    if (rc != errors::ERR_OK) io::printfn("Failed to register ping: %d", rc);

    rc = plugins::system::init();
    if (rc != errors::ERR_OK) io::printfn("Failed to register system: %d", rc);

    rc = plugins::repo::init();
    if (rc != errors::ERR_OK) io::printfn("Failed to register repo: %d", rc);

    rc = plugins::workspace::init();
    if (rc != errors::ERR_OK) io::printfn("Failed to register workspace: %d", rc);

    webview::Webview w = webview::webview_create(1, null);
    if (!w) {
        io::printfn("FATAL: Could not create webview");
        return 1;
    }

    webview::webview_set_title(w, "Dotfiles Manager");
    webview::webview_set_size(w, 1200, 800, webview::HINT_NONE);

    core::rpc::bind(w);

    webview::webview_navigate(w, "file:///media/naranyala/Data/projects-remote/dotfiles-mgr-c3/frontend/dist/index.html");

    webview::webview_run(w);
    webview::webview_destroy(w);

    return 0;
}
