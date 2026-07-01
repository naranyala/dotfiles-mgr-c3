module test_rpc_handlers;
import webview;
import cjson;
import libc;
import core::rpc;
import core::errors;
import features::ping;
import features::system;
import features::git;
import features::workspace;
import features::shell;

int tests_passed = 0;
int tests_failed = 0;

fn void pass(char* name) {
    tests_passed++;
    libc::printf("  PASS: %s\n", name);
}

fn void fail(char* name) {
    tests_failed++;
    libc::printf("  FAIL: %s\n", name);
}

fn void assert_has_method(char** methods, int count, char* name) {
    for (int i = 0; i < count; i++) {
        if (libc::strcmp((ZString)methods[i], (ZString)name) == 0) {
            pass(name);
            return;
        }
    }
    fail(name);
}

// ═══════════════════════════════════════════════════════════════
// 1. RPC Registry — method registration completeness
// ═══════════════════════════════════════════════════════════════

fn void test_rpc_registry() {
    libc::printf("\n=== 1. RPC Registry: All Methods Registered ===\n");

    int count = core::rpc::get_methods_count();
    char*[128] methods;
    int found = core::rpc::get_methods(&methods[0], 128);

    // shell.c3 (44 methods)
    assert_has_method(&methods[0], found, "exec");
    assert_has_method(&methods[0], found, "log");
    assert_has_method(&methods[0], found, "hostname");
    assert_has_method(&methods[0], found, "username");
    assert_has_method(&methods[0], found, "uname");
    assert_has_method(&methods[0], found, "memoryInfo");
    assert_has_method(&methods[0], found, "uptime");
    assert_has_method(&methods[0], found, "diskUsage");
    assert_has_method(&methods[0], found, "systemInfo");
    assert_has_method(&methods[0], found, "readFile");
    assert_has_method(&methods[0], found, "writeFile");
    assert_has_method(&methods[0], found, "exists");
    assert_has_method(&methods[0], found, "isDir");
    assert_has_method(&methods[0], found, "stat");
    assert_has_method(&methods[0], found, "mkdir");
    assert_has_method(&methods[0], found, "remove");
    assert_has_method(&methods[0], found, "listDir");
    assert_has_method(&methods[0], found, "glob");
    assert_has_method(&methods[0], found, "gitList");
    assert_has_method(&methods[0], found, "gitClone");
    assert_has_method(&methods[0], found, "gitRemove");
    assert_has_method(&methods[0], found, "gitRestore");
    assert_has_method(&methods[0], found, "gitTrashList");
    assert_has_method(&methods[0], found, "search_query");
    assert_has_method(&methods[0], found, "metrics_getStats");
    assert_has_method(&methods[0], found, "systemProbe");
    assert_has_method(&methods[0], found, "envGet");
    assert_has_method(&methods[0], found, "envSet");
    assert_has_method(&methods[0], found, "envList");
    assert_has_method(&methods[0], found, "which");
    assert_has_method(&methods[0], found, "clipboardGet");
    assert_has_method(&methods[0], found, "clipboardSet");
    assert_has_method(&methods[0], found, "psList");
    assert_has_method(&methods[0], found, "psKill");
    assert_has_method(&methods[0], found, "processSignal");
    assert_has_method(&methods[0], found, "cwd");
    assert_has_method(&methods[0], found, "setCwd");
    assert_has_method(&methods[0], found, "expandEnv");
    assert_has_method(&methods[0], found, "pathJoin");
    assert_has_method(&methods[0], found, "pathDirname");
    assert_has_method(&methods[0], found, "pathBasename");
    assert_has_method(&methods[0], found, "dumpBackendState");
    assert_has_method(&methods[0], found, "get_tree");
    assert_has_method(&methods[0], found, "get_file_content");

    // ping.c3 (1)
    assert_has_method(&methods[0], found, "ping");

    // system.c3 (1)
    assert_has_method(&methods[0], found, "getSystemInfo");

    // repo.c3 (10)
    assert_has_method(&methods[0], found, "repo.set_workspace");
    assert_has_method(&methods[0], found, "repo.get_workspace");
    assert_has_method(&methods[0], found, "repo.clone");
    assert_has_method(&methods[0], found, "repo.list");
    assert_has_method(&methods[0], found, "repo.info");
    assert_has_method(&methods[0], found, "repo.tree");
    assert_has_method(&methods[0], found, "repo.file");
    assert_has_method(&methods[0], found, "repo.history");
    assert_has_method(&methods[0], found, "repo.branches");
    assert_has_method(&methods[0], found, "repo.search");

    // workspace.c3 (10)
    assert_has_method(&methods[0], found, "workspace.list");
    assert_has_method(&methods[0], found, "workspace.get");
    assert_has_method(&methods[0], found, "workspace.create");
    assert_has_method(&methods[0], found, "workspace.delete");
    assert_has_method(&methods[0], found, "workspace.rename");
    assert_has_method(&methods[0], found, "workspace.add-group");
    assert_has_method(&methods[0], found, "workspace.remove-group");
    assert_has_method(&methods[0], found, "workspace.add-repo");
    assert_has_method(&methods[0], found, "workspace.remove-repo");
    assert_has_method(&methods[0], found, "workspace.restore-repo");
}

// ═══════════════════════════════════════════════════════════════
// 2. Registry constraints
// ═══════════════════════════════════════════════════════════════

fn void test_rpc_method_count() {
    libc::printf("\n=== 2. RPC Method Count ===\n");

    int count = core::rpc::get_methods_count();
    libc::printf("  Total: %d methods\n", count);

    // shell(44) + ping(1) + system(1) + repo(10) + workspace(10) = 66
    // (logs.get and state.get are hardcoded in handle_rpc_callback, not registered)
    if (count == 66) { pass("exact method count is 66"); } else { fail("exact method count is 66"); }
    if (count <= 128) { pass("registry under capacity"); } else { fail("registry under capacity"); }
}

fn void test_rpc_duplicate_registration() {
    libc::printf("\n=== 3. Duplicate Registration Protection ===\n");
    // Use a name unlikely to collide with registered methods
    int rc1 = core::rpc::register("__dup_test_unique__", null);
    int rc2 = core::rpc::register("__dup_test_unique__", null);
    if (rc1 == errors::ERR_OK) { pass("first registration succeeds"); } else { fail("first registration succeeds"); }
    if (rc2 == errors::ERR_INVALID_REQUEST) { pass("duplicate returns ERR_INVALID_REQUEST"); } else { fail("duplicate returns ERR_INVALID_REQUEST"); }
}

// ═══════════════════════════════════════════════════════════════
// 3. Error codes
// ═══════════════════════════════════════════════════════════════

fn void test_rpc_error_codes() {
    libc::printf("\n=== 4. Error Code Constants ===\n");

    if (errors::ERR_OK == 0) { pass("ERR_OK is 0"); } else { fail("ERR_OK is 0"); }
    if (errors::ERR_JSON_PARSE == 1001) { pass("ERR_JSON_PARSE is 1001"); } else { fail("ERR_JSON_PARSE is 1001"); }
    if (errors::ERR_INVALID_REQUEST == 1002) { pass("ERR_INVALID_REQUEST is 1002"); } else { fail("ERR_INVALID_REQUEST is 1002"); }
    if (errors::ERR_METHOD_NOT_FOUND == 1003) { pass("ERR_METHOD_NOT_FOUND is 1003"); } else { fail("ERR_METHOD_NOT_FOUND is 1003"); }
    if (errors::ERR_HANDLER_CRASH == 1004) { pass("ERR_HANDLER_CRASH is 1004"); } else { fail("ERR_HANDLER_CRASH is 1004"); }
    if (errors::ERR_REGISTRY_FULL == 1005) { pass("ERR_REGISTRY_FULL is 1005"); } else { fail("ERR_REGISTRY_FULL is 1005"); }
    if (errors::ERR_INVALID_ARGS == 1006) { pass("ERR_INVALID_ARGS is 1006"); } else { fail("ERR_INVALID_ARGS is 1006"); }
    if (errors::ERR_WEBVIEW == 2001) { pass("ERR_WEBVIEW is 2001"); } else { fail("ERR_WEBVIEW is 2001"); }
    if (errors::ERR_WEBVIEW_NULL == 2002) { pass("ERR_WEBVIEW_NULL is 2002"); } else { fail("ERR_WEBVIEW_NULL is 2002"); }
}

// ═══════════════════════════════════════════════════════════════
// 4. Error module behavior
// ═══════════════════════════════════════════════════════════════

fn void test_error_module() {
    libc::printf("\n=== 5. Error Module ===\n");

    errors::error_init();
    if (errors::global_errors.count == 0) { pass("errors start empty"); } else { fail("errors start empty"); }

    errors::error_push(1001, "test error", "test");
    if (errors::global_errors.count == 1) { pass("error_push adds entry"); } else { fail("error_push adds entry"); }
    if (errors::global_errors.entries[0].code == 1001) { pass("error code stored"); } else { fail("error code stored"); }
    if (libc::strcmp((ZString)errors::global_errors.entries[0].message, (ZString)"test error") == 0) { pass("error message stored"); } else { fail("error message stored"); }
    if (libc::strcmp((ZString)errors::global_errors.entries[0].source, (ZString)"test") == 0) { pass("error source stored"); } else { fail("error source stored"); }

    char* json = errors::error_to_json(1001, "test error");
    if (json != null) { pass("error_to_json produces string"); } else { fail("error_to_json produces string"); }
    cjson::CJson parsed = cjson::cJSON_Parse(json);
    if ((void*)parsed != null) { pass("error JSON is valid"); } else { fail("error JSON is valid"); }

    cjson::CJson code_item = cjson::cJSON_GetObjectItem(parsed, "code");
    if ((void*)code_item != null) {
        double cv = cjson::cJSON_GetNumberValue(code_item);
        if (cv == 1001) { pass("error JSON has code=1001"); } else { fail("error JSON has code=1001"); }
    } else { fail("error JSON has code"); }

    cjson::cJSON_Delete(parsed);
    libc::free(json);
}

// ═══════════════════════════════════════════════════════════════
// 5. JSON round-trip
// ═══════════════════════════════════════════════════════════════

fn void test_json_roundtrip() {
    libc::printf("\n=== 6. JSON Round-Trip ===\n");

    // Object
    cjson::CJson obj = cjson::cJSON_CreateObject();
    cjson::cJSON_AddStringToObject(obj, "key", "value");
    cjson::cJSON_AddNumberToObject(obj, "num", 42);
    cjson::cJSON_AddBoolToObject(obj, "flag", 1);

    char* json_str = cjson::cJSON_PrintUnformatted(obj);
    if (json_str != null) { pass("print object"); } else { fail("print object"); }

    cjson::CJson parsed = cjson::cJSON_Parse(json_str);
    if ((void*)parsed != null) { pass("parse object"); } else { fail("parse object"); }

    cjson::CJson k = cjson::cJSON_GetObjectItem(parsed, "key");
    if ((void*)k != null && libc::strcmp((ZString)cjson::cJSON_GetStringValue(k), (ZString)"value") == 0) { pass("key='value'"); } else { fail("key='value'"); }

    cjson::CJson n = cjson::cJSON_GetObjectItem(parsed, "num");
    if ((void*)n != null && cjson::cJSON_GetNumberValue(n) == 42) { pass("num=42"); } else { fail("num=42"); }

    cjson::cJSON_Delete(obj);
    cjson::cJSON_Delete(parsed);
    libc::free(json_str);

    // Array
    cjson::CJson arr = cjson::cJSON_CreateArray();
    cjson::cJSON_AddItemToArray(arr, cjson::cJSON_CreateString("exec"));
    cjson::cJSON_AddItemToArray(arr, cjson::cJSON_CreateString("ls"));
    cjson::cJSON_AddItemToArray(arr, cjson::cJSON_CreateNumber(42));
    cjson::cJSON_AddItemToArray(arr, cjson::cJSON_CreateBool(1));

    char* arr_str = cjson::cJSON_PrintUnformatted(arr);
    if (arr_str != null) { pass("print array"); } else { fail("print array"); }

    cjson::CJson parsed_arr = cjson::cJSON_Parse(arr_str);
    if ((void*)parsed_arr != null) { pass("parse array"); } else { fail("parse array"); }

    int arr_size = cjson::cJSON_GetArraySize(parsed_arr);
    if (arr_size == 4) { pass("array size=4"); } else { fail("array size=4"); }

    cjson::CJson item0 = cjson::cJSON_GetArrayItem(parsed_arr, 0);
    if ((void*)item0 != null) {
        char* v0 = cjson::cJSON_GetStringValue(item0);
        if (v0 != null && libc::strcmp((ZString)v0, (ZString)"exec") == 0) { pass("arr[0]='exec'"); } else { fail("arr[0]='exec'"); }
    } else { fail("arr[0] exists"); }

    cjson::cJSON_Delete(arr);
    cjson::cJSON_Delete(parsed_arr);
    libc::free(arr_str);
}

// ═══════════════════════════════════════════════════════════════
// 6. JSON types (string, number, bool, null)
// ═══════════════════════════════════════════════════════════════

fn void test_cjson_types() {
    libc::printf("\n=== 7. cJSON Type Handling ===\n");

    // String
    cjson::CJson s = cjson::cJSON_CreateString("hello");
    if (cjson::cJSON_IsString(s)) { pass("cJSON_CreateString is string"); } else { fail("cJSON_CreateString is string"); }
    if (libc::strcmp((ZString)cjson::cJSON_GetStringValue(s), (ZString)"hello") == 0) { pass("string value correct"); } else { fail("string value correct"); }
    cjson::cJSON_Delete(s);

    // Number
    cjson::CJson n = cjson::cJSON_CreateNumber(3.14);
    if (cjson::cJSON_IsNumber(n)) { pass("cJSON_CreateNumber is number"); } else { fail("cJSON_CreateNumber is number"); }
    double nv = cjson::cJSON_GetNumberValue(n);
    if (nv > 3.13 && nv < 3.15) { pass("number value correct"); } else { fail("number value correct"); }
    cjson::cJSON_Delete(n);

    // Bool
    cjson::CJson t = cjson::cJSON_CreateBool(1);
    if (cjson::cJSON_IsBool(t)) { pass("cJSON_CreateBool is bool"); } else { fail("cJSON_CreateBool is bool"); }
    if (cjson::cJSON_IsNumber(t) == 0) { pass("bool is not number"); } else { fail("bool is not number"); }
    cjson::cJSON_Delete(t);

    // Array helpers
    cjson::CJson arr = cjson::cJSON_CreateArray();
    cjson::cJSON_AddItemToArray(arr, cjson::cJSON_CreateString("a"));
    cjson::cJSON_AddItemToArray(arr, cjson::cJSON_CreateString("b"));
    cjson::cJSON_AddItemToArray(arr, cjson::cJSON_CreateString("c"));
    int as = cjson::cJSON_GetArraySize(arr);
    if (as == 3) { pass("array size correct"); } else { fail("array size correct"); }
    cjson::cJSON_Delete(arr);
}

// ═══════════════════════════════════════════════════════════════
// 7. RPC dispatch via handle_rpc_callback (simulated)
// ═══════════════════════════════════════════════════════════════
// Tests the JSON parsing + method lookup path. Since we can't
// create a real webview, we test the parsing and registry lookup
// that handle_rpc_callback performs.

fn void test_rpc_dispatch_prerequisites() {
    libc::printf("\n=== 8. RPC Dispatch Prerequisites ===\n");

    // Verify the init setup creates a valid registry
    int count = core::rpc::get_methods_count();
    if (count > 0) { pass("registry populated after init"); } else { fail("registry populated after init"); }

    // Build a minimal RPC request array
    cjson::CJson req = cjson::cJSON_CreateArray();
    cjson::cJSON_AddItemToArray(req, cjson::cJSON_CreateString("exec"));
    cjson::cJSON_AddItemToArray(req, cjson::cJSON_CreateString("echo hi"));

    char* req_str = cjson::cJSON_PrintUnformatted(req);
    if (req_str != null) {
        // Verify method name extraction
        cjson::CJson parsed = cjson::cJSON_Parse(req_str);
        if ((void*)parsed != null) {
            cjson::CJson method_item = cjson::cJSON_GetArrayItem(parsed, 0);
            if ((void*)method_item != null) {
                char* method_name = cjson::cJSON_GetStringValue(method_item);
                if (method_name != null && libc::strcmp((ZString)method_name, (ZString)"exec") == 0) {
                    pass("method name extracted from request");
                } else { fail("method name extracted from request"); }

                cjson::CJson arg1 = cjson::cJSON_GetArrayItem(parsed, 1);
                if ((void*)arg1 != null) {
                    char* arg_val = cjson::cJSON_GetStringValue(arg1);
                    if (arg_val != null && libc::strcmp((ZString)arg_val, (ZString)"echo hi") == 0) {
                        pass("first arg extracted from request");
                    } else { fail("first arg extracted from request"); }
                } else { fail("first arg exists"); }
            } else { fail("method item exists"); }
            cjson::cJSON_Delete(parsed);
        } else { fail("parse request"); }
        libc::free(req_str);
    } else { fail("print request"); }

    cjson::cJSON_Delete(req);

    // Verify method lookup works: find 'exec' in registry
    char*[128] methods;
    int found = core::rpc::get_methods(&methods[0], 128);
    bool found_exec = false;
    for (int i = 0; i < found; i++) {
        if (libc::strcmp((ZString)methods[i], (ZString)"exec") == 0) {
            found_exec = true;
            break;
        }
    }
    if (found_exec) { pass("method lookup finds exec"); } else { fail("method lookup finds exec"); }
}

// ═══════════════════════════════════════════════════════════════
// 8. get_methods_count vs get_methods consistency
// ═══════════════════════════════════════════════════════════════

fn void test_registry_consistency() {
    libc::printf("\n=== 9. Registry Consistency ===\n");

    int count = core::rpc::get_methods_count();
    char*[128] methods;
    int found = core::rpc::get_methods(&methods[0], 128);

    if (count == found) { pass("get_methods_count == get_methods length"); } else { fail("get_methods_count == get_methods length"); }
    if (count > 0) { pass("non-empty registry"); } else { fail("non-empty registry"); }

    // All method names should be non-null and non-empty
    bool all_valid = true;
    for (int i = 0; i < found; i++) {
        if (methods[i] == null || methods[i][0] == 0) { all_valid = false; break; }
    }
    if (all_valid) { pass("all method names valid"); } else { fail("all method names valid"); }

    // No duplicate names
    bool no_dupes = true;
    for (int i = 0; i < found && no_dupes; i++) {
        for (int j = i + 1; j < found && no_dupes; j++) {
            if (libc::strcmp((ZString)methods[i], (ZString)methods[j]) == 0) {
                no_dupes = false;
            }
        }
    }
    if (no_dupes) { pass("no duplicate method names"); } else { fail("no duplicate method names"); }
}

// ═══════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════

fn int main() {
    libc::printf("═══════════════════════════════════════════════════════\n");
    libc::printf("  Backend RPC / Handler Test Suite\n");
    libc::printf("═══════════════════════════════════════════════════════\n");

    core::rpc::init();
    features::ping::init();
    features::system::init();
    features::git::init();
    features::workspace::init();
    features::shell::init();

    test_rpc_error_codes();
    test_error_module();
    test_rpc_registry();
    test_rpc_method_count();
    test_rpc_duplicate_registration();
    test_json_roundtrip();
    test_cjson_types();
    test_rpc_dispatch_prerequisites();
    test_registry_consistency();

    libc::printf("\n═══════════════════════════════════════════════════════\n");
    libc::printf("  Results: %d passed, %d failed\n", tests_passed, tests_failed);
    libc::printf("═══════════════════════════════════════════════════════\n");

    return tests_failed > 0 ? 1 : 0;
}
