module shared::utils;
import libc;

// String is null or empty
fn bool str_is_empty(char* str) {
    return str == null || str[0] == 0;
}

// String length (safe)
fn int str_len(char* str) {
    if (str == null) return 0;
    return (int)libc::strlen((ZString)str);
}

// String equals (null-safe)
fn bool str_equals(char* a, char* b) {
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;
    return libc::strcmp((ZString)a, (ZString)b) == 0;
}

// Copy string
fn char* str_dup(char* src) {
    if (src == null) return null;
    int len = str_len(src);
    char* dest = (char*)libc::malloc((usz)(len + 1));
    if (dest == null) return null;
    libc::strncpy(dest, src, (usz)(len + 1));
    return dest;
}

// Concatenate two strings
fn char* str_cat(char* a, char* b) {
    if (a == null) return str_dup(b);
    if (b == null) return str_dup(a);
    int len_a = str_len(a);
    int len_b = str_len(b);
    char* result = (char*)libc::malloc((usz)(len_a + len_b + 1));
    if (result == null) return null;
    libc::strncpy(result, a, (usz)len_a);
    libc::strncpy(&result[len_a], b, (usz)(len_b + 1));
    return result;
}

// Get timestamp in ms
fn long get_timestamp_ms() {
    return (long)libc::time(null) * 1000;
}

// Safe free
fn void safe_free(void* ptr) {
    if (ptr != null) {
        libc::free(ptr);
    }
}
