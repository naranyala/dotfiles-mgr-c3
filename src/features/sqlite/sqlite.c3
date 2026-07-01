module features::sqlite;

import libc;
import cjson;
import core::rpc;
import core::errors;
import bindings::sqlite;
import webview;

bindings::sqlite::Sqlite g_db = (bindings::sqlite::Sqlite)null;

fn void handle_open(webview::Webview w, char* id, cjson::CJson args) {
    char* path = cjson::cJSON_GetStringValue(cjson::cJSON_GetArrayItem(args, 1));
    if (path == null) {
        core::rpc::respond_error(w, id, errors::ERR_INVALID_ARGS, "Missing path", "sqlite");
        return;
    }

    int rc = bindings::sqlite::sqlite3_open(path, &g_db);
    if (rc != bindings::sqlite::SQLITE_OK) {
        char* err = bindings::sqlite::sqlite3_errmsg((bindings::sqlite::Sqlite*)(&g_db));
        core::rpc::respond_error(w, id, errors::ERR_IO, err, "sqlite");
        return;
    }

    cjson::CJson res = cjson::cJSON_CreateObject();
    cjson::cJSON_AddBoolToObject(res, "ok", 1);
    char* str = cjson::cJSON_PrintUnformatted(res);
    webview::webview_return(w, id, 0, str);
    libc::free(str);
    cjson::cJSON_Delete(res);
}

fn void handle_close(webview::Webview w, char* id, cjson::CJson args) {
    if ((void*)g_db != null) {
     bindings::sqlite::sqlite3_close(&g_db);
        g_db = (bindings::sqlite::Sqlite)null;
    }
    cjson::CJson res = cjson::cJSON_CreateObject();
    cjson::cJSON_AddBoolToObject(res, "ok", 1);
    char* str = cjson::cJSON_PrintUnformatted(res);
    webview::webview_return(w, id, 0, str);
    libc::free(str);
    cjson::cJSON_Delete(res);
}

fn void handle_exec(webview::Webview w, char* id, cjson::CJson args) {
    if ((void*)g_db == null) {
        core::rpc::respond_error(w, id, errors::ERR_NOT_SUPPORTED, "Database not open", "sqlite");
        return;
    }
    char* sql = cjson::cJSON_GetStringValue(cjson::cJSON_GetArrayItem(args, 1));
    if (sql == null) {
        core::rpc::respond_error(w, id, errors::ERR_INVALID_ARGS, "Missing SQL", "sqlite");
        return;
    }

    int rc = bindings::sqlite::sqlite3_exec(&g_db, sql, null, null, null);
    if (rc != bindings::sqlite::SQLITE_OK) {
        char* err = bindings::sqlite::sqlite3_errmsg((bindings::sqlite::Sqlite*)(&g_db));
        core::rpc::respond_error(w, id, errors::ERR_IO, err, "sqlite");
        return;
    }

    cjson::CJson res = cjson::cJSON_CreateObject();
    cjson::cJSON_AddBoolToObject(res, "ok", 1);
    char* str = cjson::cJSON_PrintUnformatted(res);
    webview::webview_return(w, id, 0, str);
    libc::free(str);
    cjson::cJSON_Delete(res);
}

fn void handle_query(webview::Webview w, char* id, cjson::CJson args) {
    if ((void*)g_db == null) {
        core::rpc::respond_error(w, id, errors::ERR_NOT_SUPPORTED, "Database not open", "sqlite");
        return;
    }
    char* sql = cjson::cJSON_GetStringValue(cjson::cJSON_GetArrayItem(args, 1));
    if (sql == null) {
        core::rpc::respond_error(w, id, errors::ERR_INVALID_ARGS, "Missing SQL", "sqlite");
        return;
    }

    bindings::sqlite::SqliteStmt* stmt = null;
    int rc = bindings::sqlite::sqlite3_prepare_v2(&g_db, sql, -1, &stmt, null);
    if (rc != bindings::sqlite::SQLITE_OK) {
        char* err = bindings::sqlite::sqlite3_errmsg((bindings::sqlite::Sqlite*)(&g_db));
        core::rpc::respond_error(w, id, errors::ERR_IO, err, "sqlite");
        return;
    }

    cjson::CJson rows = cjson::cJSON_CreateArray();
    int col_count = bindings::sqlite::sqlite3_column_count(stmt);

    while (bindings::sqlite::sqlite3_step(stmt) == bindings::sqlite::SQLITE_ROW) {
        cjson::CJson row = cjson::cJSON_CreateObject();
        for (int i = 0; i < col_count; i++) {
            char* name = bindings::sqlite::sqlite3_column_name(stmt, i);
            char* val = bindings::sqlite::sqlite3_column_text(stmt, i);
            if (name != null && val != null) {
                cjson::cJSON_AddStringToObject(row, name, val);
            }
        }
        cjson::cJSON_AddItemToArray(rows, row);
    }

    bindings::sqlite::sqlite3_finalize(stmt);

    cjson::CJson res = cjson::cJSON_CreateObject();
    cjson::cJSON_AddItemToObject(res, "rows", rows);
    char* str = cjson::cJSON_PrintUnformatted(res);
    webview::webview_return(w, id, 0, str);
    libc::free(str);
    cjson::cJSON_Delete(res);
}

fn int init() {
    int rc;
    rc = core::rpc::register("sqlite.open", &handle_open); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("sqlite.close", &handle_close); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("sqlite.exec", &handle_exec); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("sqlite.query", &handle_query); if (rc != errors::ERR_OK) return rc;
    return errors::ERR_OK;
}
