module libzip;

typedef Zip = void*;
typedef ZipFile = void*;
typedef ZipSource = void*;
typedef ZipStat = void*;
typedef ZipError = void*;

const int ZIP_CREATE = 1;
const int ZIP_EXCL = 2;
const int ZIP_CHECKCONS = 4;
const int ZIP_TRUNCATE = 8;
const int ZIP_RDONLY = 16;

// Archive operations
extern fn Zip zip_open(char* fname, int flags, int* errorp) ;
extern fn int zip_close(Zip za) ;
extern fn void zip_discard(Zip za) ;
extern fn char* zip_libzip_version() ;

// File listing
extern fn long zip_get_num_entries(Zip za, int flags) ;
extern fn char* zip_get_name(Zip za, long index, int flags) ;
extern fn long zip_name_locate(Zip za, char* name, int flags) ;

// Reading files
extern fn ZipFile zip_fopen(Zip za, char* fname, int flags) ;
extern fn ZipFile zip_fopen_index(Zip za, long index, int flags) ;
extern fn long zip_fread(ZipFile zf, void* buf, long nbytes) ;
extern fn int zip_fclose(ZipFile zf) ;
extern fn char* zip_file_strerror(ZipFile zf) ;

// Adding files
extern fn ZipSource zip_source_file(Zip za, char* fname, long start, long len) ;
extern fn ZipSource zip_source_buffer(Zip za, void* data, long len, int freep) ;
extern fn long zip_file_add(Zip za, char* name, ZipSource src, int flags) ;
extern fn int zip_file_rename(Zip za, long index, char* name, int flags) ;
extern fn int zip_file_replace(Zip za, long index, ZipSource src, int flags) ;
extern fn int zip_delete(Zip za, long index) ;

// Source management
extern fn void zip_source_free(ZipSource src) ;
extern fn int zip_source_open(ZipSource src) ;
extern fn int zip_source_close(ZipSource src) ;
extern fn long zip_source_read(ZipSource src, void* data, long len) ;

// File stat
extern fn int zip_stat(Zip za, char* fname, int flags, ZipStat st) ;
extern fn int zip_stat_index(Zip za, long index, int flags, ZipStat st) ;
extern fn void zip_stat_init(ZipStat st) ;

// Comments
extern fn char* zip_get_archive_comment(Zip za, int* lenp, int flags) ;
extern fn int zip_set_archive_comment(Zip za, char* comment, int len) ;
extern fn char* zip_file_get_comment(Zip za, long index, int* lenp, int flags) ;

// Error handling
extern fn ZipError zip_get_error(Zip za) ;
extern fn void zip_error_clear(Zip za) ;
extern fn char* zip_strerror(Zip za) ;
extern fn char* zip_error_strerror(ZipError ze) ;
extern fn int zip_error_code_zip(ZipError ze) ;
extern fn int zip_error_code_system(ZipError ze) ;
