module archive;

typedef Archive = void*;
typedef ArchiveEntry = void*;

extern fn Archive archive_read_new();
extern fn int archive_read_support_filter_all(Archive a);
extern fn int archive_read_support_format_all(Archive a);
extern fn int archive_read_open_filename(Archive a, char* filename, uptr block_size);
extern fn int archive_read_next_header(Archive a, ArchiveEntry* entry);
extern fn char* archive_entry_pathname(ArchiveEntry entry);
extern fn long archive_entry_size(ArchiveEntry entry);
extern fn long archive_entry_filetype(ArchiveEntry entry);
extern fn iptr archive_read_data(Archive a, void* buff, uptr max);
extern fn int archive_read_free(Archive a);

typedef ArchiveWrite = void*;

extern fn ArchiveWrite archive_write_new();
extern fn int archive_write_set_format_pax_restricted(ArchiveWrite a);
extern fn int archive_write_add_filter_gzip(ArchiveWrite a);
extern fn int archive_write_open_filename(ArchiveWrite a, char* filename);
extern fn int archive_write_header(ArchiveWrite a, ArchiveEntry entry);
extern fn iptr archive_write_data(ArchiveWrite a, void* buff, uptr size);
extern fn int archive_write_close(ArchiveWrite a);
extern fn int archive_write_free(ArchiveWrite a);

extern fn ArchiveEntry archive_entry_new();
extern fn void archive_entry_set_pathname(ArchiveEntry entry, char* name);
extern fn void archive_entry_set_size(ArchiveEntry entry, long size);
extern fn void archive_entry_set_filetype(ArchiveEntry entry, int type);
extern fn void archive_entry_set_perm(ArchiveEntry entry, int perm);
extern fn void archive_entry_free(ArchiveEntry entry);
