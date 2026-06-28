module sqlite3;

typedef Sqlite3 = void*;
typedef Sqlite3Stmt = void*;
alias Sqlite3Callback = fn int(void*, int, char**, char**);

const int SQLITE_OK = 0;
const int SQLITE_ERROR = 1;
const int SQLITE_ROW = 100;
const int SQLITE_DONE = 101;

extern fn int sqlite3_open(char* filename, Sqlite3* ppDb);
extern fn int sqlite3_close(Sqlite3 db);
extern fn int sqlite3_exec(Sqlite3 db, char* sql, Sqlite3Callback callback, void* arg, char** errmsg);
extern fn int sqlite3_prepare_v2(Sqlite3 db, char* sql, int nbyte, Sqlite3Stmt* ppStmt, char** pzTail);
extern fn int sqlite3_step(Sqlite3Stmt stmt);
extern fn int sqlite3_finalize(Sqlite3Stmt stmt);
extern fn int sqlite3_bind_text(Sqlite3Stmt stmt, int index, char* value, int n, void* destructor);
extern fn int sqlite3_bind_int(Sqlite3Stmt stmt, int index, int value);
extern fn int sqlite3_bind_int64(Sqlite3Stmt stmt, int index, long value);
extern fn char* sqlite3_column_text(Sqlite3Stmt stmt, int col);
extern fn int sqlite3_column_int(Sqlite3Stmt stmt, int col);
extern fn long sqlite3_column_int64(Sqlite3Stmt stmt, int col);
extern fn char* sqlite3_errmsg(Sqlite3 db);
