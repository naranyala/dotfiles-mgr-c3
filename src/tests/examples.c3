module examples;

import cjson;
import sqlite3;
import archive;
import yaml;
import sodium;
import libc;

// ── Example: Parse JSON ────────────────────────────────────
fn void example_json() {
    char* json_str = `{"name": "dotfiles", "version": 1, "files": [".bashrc", ".vimrc"]}`;
    CJson root = cjson::cJSON_Parse(json_str);
    
    CJson name = cjson::cJSON_GetObjectItem(root, "name");
    libc::printf("Name: %s\n", cjson::cJSON_GetStringValue(name));
    
    CJson version = cjson::cJSON_GetObjectItem(root, "version");
    libc::printf("Version: %d\n", (int)cjson::cJSON_GetNumberValue(version));
    
    cjson::cJSON_Delete(root);
}

// ── Example: SQLite3 database ──────────────────────────────
fn void example_sqlite() {
    Sqlite3 db;
    sqlite3::sqlite3_open(":memory:", &db);
    
    sqlite3::sqlite3_exec(db, 
        "CREATE TABLE dotfiles (id INTEGER PRIMARY KEY, path TEXT, hash TEXT);",
        null, null, null);
    
    sqlite3::sqlite3_exec(db,
        "INSERT INTO dotfiles (path, hash) VALUES ('.bashrc', 'abc123');",
        null, null, null);
    
    Sqlite3Stmt stmt;
    sqlite3::sqlite3_prepare_v2(db, "SELECT path, hash FROM dotfiles;", -1, &stmt, null);
    
    while (sqlite3::sqlite3_step(stmt) == sqlite3::SQLITE_ROW) {
        char* path = sqlite3::sqlite3_column_text(stmt, 0);
        char* hash = sqlite3::sqlite3_column_text(stmt, 1);
        libc::printf("File: %s (hash: %s)\n", path, hash);
    }
    
    sqlite3::sqlite3_finalize(stmt);
    sqlite3::sqlite3_close(db);
}

// ── Example: Extract archive ───────────────────────────────
fn void example_archive(char* archive_path) {
    Archive a = archive::archive_read_new();
    archive::archive_read_support_filter_all(a);
    archive::archive_read_support_format_all(a);
    archive::archive_read_open_filename(a, archive_path, 10240);
    
    ArchiveEntry entry;
    while (archive::archive_read_next_header(a, &entry) == 0) {
        char* name = archive::archive_entry_pathname(entry);
        long size = archive::archive_entry_size(entry);
        libc::printf("Extracting: %s (%ld bytes)\n", name, size);
        // Read data: archive::archive_read_data(a, buffer, size);
    }
    
    archive::archive_read_free(a);
}

// ── Example: Parse YAML ────────────────────────────────────
fn void example_yaml(char* yaml_str, uptr len) {
    YamlParser parser;
    yaml::yaml_parser_initialize(&parser);
    yaml::yaml_parser_set_input_string(&parser, yaml_str, len);
    
    YamlEvent event;
    while (yaml::yaml_parser_parse(&parser, &event)) {
        // YamlEvent is an opaque type, so we can't directly access fields
        // Just parse and delete events
        yaml::yaml_event_delete(&event);
    }
    
    yaml::yaml_parser_delete(&parser);
}

// ── Example: Encrypt with libsodium ────────────────────────
fn void example_crypto() {
    sodium::sodium_init();
    
    char[32] key;
    char[24] nonce;
    
    sodium::randombytes_buf(&key, 32);
    sodium::randombytes_buf(&nonce, 24);
    
    char* message = "secret dotfile content";
    uptr msg_len = libc::strlen((ZString)message) + 1;
    char[65] ciphertext;
    
    sodium::crypto_secretbox_easy(&ciphertext, message, msg_len, &nonce, &key);
    libc::printf("Encrypted %zu bytes\n", msg_len);
    
    char[50] decrypted;
    if (sodium::crypto_secretbox_open_easy(&decrypted, &ciphertext, 65, &nonce, &key) == 0) {
        libc::printf("Decrypted: %s\n", &decrypted);
    }
}
