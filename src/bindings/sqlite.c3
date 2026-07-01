module bindings::sqlite;

import libc;

typedef Sqlite = void*;
typedef SqliteStmt = void*;

const int SQLITE_OK = 0;
const int SQLITE_ROW = 100;
const int SQLITE_DONE = 101;

extern fn int sqlite3_open(char* filename, Sqlite* ppDb);
extern fn int sqlite3_close(Sqlite* db);
extern fn int sqlite3_exec(Sqlite* db, char* sql, void* callback, void* arg, char** errmsg);
extern fn int sqlite3_prepare_v2(Sqlite* db, char* sql, int len, SqliteStmt** ppStmt, char** pzTail);
extern fn int sqlite3_step(SqliteStmt* stmt);
extern fn int sqlite3_column_count(SqliteStmt* stmt);
extern fn char* sqlite3_column_text(SqliteStmt* stmt, int iCol);
extern fn char* sqlite3_column_name(SqliteStmt* stmt, int iCol);
extern fn int sqlite3_finalize(SqliteStmt* stmt);
extern fn int sqlite3_errcode(Sqlite* db);
extern fn char* sqlite3_errmsg(Sqlite* db);
extern fn void sqlite3_free(void* p);
