module features::job_applicant_tracker;

import libc;
import cjson;
import core::rpc;
import core::errors;
import bindings::sqlite;
import webview;

bindings::sqlite::Sqlite g_db = (bindings::sqlite::Sqlite)null;

fn void ensure_table() {
    char* sql = "CREATE TABLE IF NOT EXISTS job_applicants ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT,"
        "name TEXT NOT NULL,"
        "email TEXT DEFAULT '',"
        "phone TEXT DEFAULT '',"
        "position TEXT DEFAULT '',"
        "company TEXT DEFAULT '',"
        "status TEXT DEFAULT 'pending',"
        "notes TEXT DEFAULT '',"
        "created_at TEXT DEFAULT (datetime('now')),"
        "updated_at TEXT DEFAULT (datetime('now'))"
        ");";
    bindings::sqlite::sqlite3_exec(&g_db, sql, null, null, null);
}

fn void handle_init_db(webview::Webview w, char* id, cjson::CJson args) {
    char* path = cjson::cJSON_GetStringValue(cjson::cJSON_GetArrayItem(args, 1));
    if (path == null) {
        core::rpc::respond_error(w, id, errors::ERR_INVALID_ARGS, "Missing path", "job-applicant-tracker");
        return;
    }

    if ((void*)g_db != null) {
        bindings::sqlite::sqlite3_close(&g_db);
        g_db = (bindings::sqlite::Sqlite)null;
    }

    int rc = bindings::sqlite::sqlite3_open(path, &g_db);
    if (rc != bindings::sqlite::SQLITE_OK) {
        char* err = bindings::sqlite::sqlite3_errmsg((bindings::sqlite::Sqlite*)(&g_db));
        core::rpc::respond_error(w, id, errors::ERR_IO, err, "job-applicant-tracker");
        return;
    }

    ensure_table();

    cjson::CJson res = cjson::cJSON_CreateObject();
    cjson::cJSON_AddBoolToObject(res, "ok", 1);
    char* str = cjson::cJSON_PrintUnformatted(res);
    webview::webview_return(w, id, 0, str);
    libc::free(str);
    cjson::cJSON_Delete(res);
}

fn void handle_list(webview::Webview w, char* id, cjson::CJson args) {
    if ((void*)g_db == null) {
        core::rpc::respond_error(w, id, errors::ERR_NOT_SUPPORTED, "Database not open", "job-applicant-tracker");
        return;
    }

    char* sql = "SELECT * FROM job_applicants ORDER BY id DESC;";
    bindings::sqlite::SqliteStmt* stmt = null;
    int rc = bindings::sqlite::sqlite3_prepare_v2(&g_db, sql, -1, &stmt, null);
    if (rc != bindings::sqlite::SQLITE_OK) {
        char* err = bindings::sqlite::sqlite3_errmsg((bindings::sqlite::Sqlite*)(&g_db));
        core::rpc::respond_error(w, id, errors::ERR_IO, err, "job-applicant-tracker");
        return;
    }

    cjson::CJson rows = cjson::cJSON_CreateArray();
    int col_count = bindings::sqlite::sqlite3_column_count(stmt);

    while (bindings::sqlite::sqlite3_step(stmt) == bindings::sqlite::SQLITE_ROW) {
        cjson::CJson row = cjson::cJSON_CreateObject();
        for (int i = 0; i < col_count; i++) {
            char* name = bindings::sqlite::sqlite3_column_name(stmt, i);
            char* val = bindings::sqlite::sqlite3_column_text(stmt, i);
            if (name != null) {
                if (val != null) {
                    cjson::cJSON_AddStringToObject(row, name, val);
                } else {
    cjson::cJSON_AddItemToObject(row, name, cjson::cJSON_CreateNull());
                }
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

fn void handle_create(webview::Webview w, char* id, cjson::CJson args) {
    if ((void*)g_db == null) {
        core::rpc::respond_error(w, id, errors::ERR_NOT_SUPPORTED, "Database not open", "job-applicant-tracker");
        return;
    }

    cjson::CJson data = cjson::cJSON_GetArrayItem(args, 1);
    if ((void*)data == null) {
        core::rpc::respond_error(w, id, errors::ERR_INVALID_ARGS, "Missing data", "job-applicant-tracker");
        return;
    }

    char* name_val = cjson::cJSON_GetStringValue(cjson::cJSON_GetObjectItem(data, "name"));
    if (name_val == null) {
        core::rpc::respond_error(w, id, errors::ERR_INVALID_ARGS, "Name is required", "job-applicant-tracker");
        return;
    }

    char* email_val = cjson::cJSON_GetStringValue(cjson::cJSON_GetObjectItem(data, "email"));
    char* phone_val = cjson::cJSON_GetStringValue(cjson::cJSON_GetObjectItem(data, "phone"));
    char* position_val = cjson::cJSON_GetStringValue(cjson::cJSON_GetObjectItem(data, "position"));
    char* company_val = cjson::cJSON_GetStringValue(cjson::cJSON_GetObjectItem(data, "company"));
    char* status_val = cjson::cJSON_GetStringValue(cjson::cJSON_GetObjectItem(data, "status"));
    char* notes_val = cjson::cJSON_GetStringValue(cjson::cJSON_GetObjectItem(data, "notes"));

    if (email_val == null) email_val = "";
    if (phone_val == null) phone_val = "";
    if (position_val == null) position_val = "";
    if (company_val == null) company_val = "";
    if (status_val == null) status_val = "pending";
    if (notes_val == null) notes_val = "";

    char[1024] sql;
    libc::snprintf(&sql[0], 1024,
        "INSERT INTO job_applicants (name, email, phone, position, company, status, notes) VALUES ('%s', '%s', '%s', '%s', '%s', '%s', '%s');",
        name_val, email_val, phone_val, position_val, company_val, status_val, notes_val);

    int rc = bindings::sqlite::sqlite3_exec(&g_db, &sql[0], null, null, null);
    if (rc != bindings::sqlite::SQLITE_OK) {
        char* err = bindings::sqlite::sqlite3_errmsg((bindings::sqlite::Sqlite*)(&g_db));
        core::rpc::respond_error(w, id, errors::ERR_IO, err, "job-applicant-tracker");
        return;
    }

    cjson::CJson res = cjson::cJSON_CreateObject();
    cjson::cJSON_AddBoolToObject(res, "ok", 1);
    char* str = cjson::cJSON_PrintUnformatted(res);
    webview::webview_return(w, id, 0, str);
    libc::free(str);
    cjson::cJSON_Delete(res);
}

fn void handle_update(webview::Webview w, char* id, cjson::CJson args) {
    if ((void*)g_db == null) {
        core::rpc::respond_error(w, id, errors::ERR_NOT_SUPPORTED, "Database not open", "job-applicant-tracker");
        return;
    }

    cjson::CJson data = cjson::cJSON_GetArrayItem(args, 1);
    if ((void*)data == null) {
        core::rpc::respond_error(w, id, errors::ERR_INVALID_ARGS, "Missing data", "job-applicant-tracker");
        return;
    }

    char* id_str = cjson::cJSON_GetStringValue(cjson::cJSON_GetObjectItem(data, "id"));
    if (id_str == null) {
        core::rpc::respond_error(w, id, errors::ERR_INVALID_ARGS, "Missing id", "job-applicant-tracker");
        return;
    }

    char* name_val = cjson::cJSON_GetStringValue(cjson::cJSON_GetObjectItem(data, "name"));
    char* email_val = cjson::cJSON_GetStringValue(cjson::cJSON_GetObjectItem(data, "email"));
    char* phone_val = cjson::cJSON_GetStringValue(cjson::cJSON_GetObjectItem(data, "phone"));
    char* position_val = cjson::cJSON_GetStringValue(cjson::cJSON_GetObjectItem(data, "position"));
    char* company_val = cjson::cJSON_GetStringValue(cjson::cJSON_GetObjectItem(data, "company"));
    char* status_val = cjson::cJSON_GetStringValue(cjson::cJSON_GetObjectItem(data, "status"));
    char* notes_val = cjson::cJSON_GetStringValue(cjson::cJSON_GetObjectItem(data, "notes"));

    if (email_val == null) email_val = "";
    if (phone_val == null) phone_val = "";
    if (position_val == null) position_val = "";
    if (company_val == null) company_val = "";
    if (status_val == null) status_val = "pending";
    if (notes_val == null) notes_val = "";

    char[1024] sql;
    libc::snprintf(&sql[0], 1024,
        "UPDATE job_applicants SET name='%s', email='%s', phone='%s', position='%s', company='%s', status='%s', notes='%s', updated_at=datetime('now') WHERE id=%s;",
        name_val, email_val, phone_val, position_val, company_val, status_val, notes_val, id_str);

    int rc = bindings::sqlite::sqlite3_exec(&g_db, &sql[0], null, null, null);
    if (rc != bindings::sqlite::SQLITE_OK) {
        char* err = bindings::sqlite::sqlite3_errmsg((bindings::sqlite::Sqlite*)(&g_db));
        core::rpc::respond_error(w, id, errors::ERR_IO, err, "job-applicant-tracker");
        return;
    }

    cjson::CJson res = cjson::cJSON_CreateObject();
    cjson::cJSON_AddBoolToObject(res, "ok", 1);
    char* str = cjson::cJSON_PrintUnformatted(res);
    webview::webview_return(w, id, 0, str);
    libc::free(str);
    cjson::cJSON_Delete(res);
}

fn void handle_delete(webview::Webview w, char* id, cjson::CJson args) {
    if ((void*)g_db == null) {
        core::rpc::respond_error(w, id, errors::ERR_NOT_SUPPORTED, "Database not open", "job-applicant-tracker");
        return;
    }

    char* id_str = cjson::cJSON_GetStringValue(cjson::cJSON_GetArrayItem(args, 1));
    if (id_str == null) {
        core::rpc::respond_error(w, id, errors::ERR_INVALID_ARGS, "Missing id", "job-applicant-tracker");
        return;
    }

    char[256] sql;
    libc::snprintf(&sql[0], 256, "DELETE FROM job_applicants WHERE id = %s;", id_str);

    int rc = bindings::sqlite::sqlite3_exec(&g_db, &sql[0], null, null, null);
    if (rc != bindings::sqlite::SQLITE_OK) {
        char* err = bindings::sqlite::sqlite3_errmsg((bindings::sqlite::Sqlite*)(&g_db));
        core::rpc::respond_error(w, id, errors::ERR_IO, err, "job-applicant-tracker");
        return;
    }

    cjson::CJson res = cjson::cJSON_CreateObject();
    cjson::cJSON_AddBoolToObject(res, "ok", 1);
    char* str = cjson::cJSON_PrintUnformatted(res);
    webview::webview_return(w, id, 0, str);
    libc::free(str);
    cjson::cJSON_Delete(res);
}

fn int init() {
    int rc;
    rc = core::rpc::register("job-applicant-tracker.init", &handle_init_db); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("job-applicant-tracker.list", &handle_list); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("job-applicant-tracker.create", &handle_create); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("job-applicant-tracker.update", &handle_update); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("job-applicant-tracker.delete", &handle_delete); if (rc != errors::ERR_OK) return rc;
    return errors::ERR_OK;
}
