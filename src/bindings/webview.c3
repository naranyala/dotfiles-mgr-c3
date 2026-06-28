module webview;
typedef Webview = void*;
typedef WebviewError = int;
typedef WebviewHint = int;

const WebviewHint HINT_NONE = (WebviewHint)0;
const WebviewHint HINT_MIN = (WebviewHint)1;
const WebviewHint HINT_MAX = (WebviewHint)2;
const WebviewHint HINT_FIXED = (WebviewHint)3;

alias DispatchCallback = fn void(Webview, void*);
alias BindCallback = fn void(char*, char*, void*);

extern fn Webview webview_create(int debug, void* window);
extern fn WebviewError webview_destroy(Webview w);
extern fn WebviewError webview_run(Webview w);
extern fn WebviewError webview_terminate(Webview w);
extern fn WebviewError webview_dispatch(Webview w, DispatchCallback callback, void* arg);
extern fn void* webview_get_window(Webview w);
extern fn WebviewError webview_set_title(Webview w, char* title);
extern fn WebviewError webview_set_size(Webview w, int width, int height, WebviewHint hints);
extern fn WebviewError webview_navigate(Webview w, char* url);
extern fn WebviewError webview_set_html(Webview w, char* html);
extern fn WebviewError webview_init(Webview w, char* js);
extern fn WebviewError webview_eval(Webview w, char* js);
extern fn WebviewError webview_bind(Webview w, char* name, BindCallback callback, void* arg);
extern fn WebviewError webview_unbind(Webview w, char* name);
extern fn WebviewError webview_return(Webview w, char* id, int status, char* result);
