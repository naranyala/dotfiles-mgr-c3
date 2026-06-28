module examples;

import cjson;
import sqlite3;
import archive;
import yaml;
import sodium;

// ── Example: Parse JSON ────────────────────────────────────
fn void example_json() {
    char* json_str = `{"name": "dotfiles", "version": 1, "files": [".bashrc", ".vimrc"]}`;
    cjson.cJSON root = cjson.cJSON_Parse(json_str);
    
    cjson.cJSON name = cjson.cJSON_GetObjectItem(root, "name");
    printf("Name: %s\n", cjson.cJSON_GetStringValue(name));
    
    cjson.cJSON version = cjson.cJSON_GetObjectItem(root, "version");
    printf("Version: %d\n", (int)cjson.cJSON_GetNumberValue(version));
    
    cjson.cJSON_Delete(root);
}

// ── Example: SQLite3 database ──────────────────────────────
fn void example_sqlite() {
    sqlite3.Sqlite3 db;
    sqlite3.sqlite3_open(":memory:", &db);
    
    sqlite3.sqlite3_exec(db, 
        "CREATE TABLE dotfiles (id INTEGER PRIMARY KEY, path TEXT, hash TEXT);",
        null, null, null);
    
    sqlite3.sqlite3_exec(db,
        "INSERT INTO dotfiles (path, hash) VALUES ('.bashrc', 'abc123');",
        null, null, null);
    
    sqlite3.Sqlite3Stmt stmt;
    sqlite3.sqlite3_prepare_v2(db, "SELECT path, hash FROM dotfiles;", -1, &stmt, null);
    
    while (sqlite3.sqlite3_step(stmt) == sqlite3.SQLITE_ROW) {
        char* path = sqlite3.sqlite3_column_text(stmt, 0);
        char* hash = sqlite3.sqlite3_column_text(stmt, 1);
        printf("File: %s (hash: %s)\n", path, hash);
    }
    
    sqlite3.sqlite3_finalize(stmt);
    sqlite3.sqlite3_close(db);
}

// ── Example: Extract archive ───────────────────────────────
fn void example_archive(char* archive_path) {
    archive.Archive a = archive.archive_read_new();
    archive.archive_read_support_filter_all(a);
    archive.archive_read_support_format_all(a);
    archive.archive_read_open_filename(a, archive_path, 10240);
    
    archive.ArchiveEntry entry;
    while (archive.archive_read_next_header(a, &entry) == 0) {
        char* name = archive.archive_entry_pathname(entry);
        long size = archive.archive_entry_size(entry);
        printf("Extracting: %s (%ld bytes)\n", name, size);
        // Read data: archive.archive_read_data(a, buffer, size);
    }
    
    archive.archive_read_free(a);
}

// ── Example: Parse YAML ────────────────────────────────────
fn void example_yaml(char* yaml_str, uptr len) {
    yaml.YamlParser parser;
    yaml.yaml_parser_initialize(&parser);
    yaml.yaml_parser_set_input_string(&parser, yaml_str, len);
    
    yaml.YamlEvent event;
    while (yaml.yaml_parser_parse(&parser, &event)) {
        if (event.type == yaml.YAML_SCALAR_EVENT) {
            printf("Scalar: %s\n", event.data.scalar.value);
        }
        yaml.yaml_event_delete(&event);
        if (event.type == yaml.YAML_STREAM_END_EVENT) break;
    }
    
    yaml.yaml_parser_delete(&parser);
}

// ── Example: Encrypt with libsodium ────────────────────────
fn void example_crypto() {
    sodium.sodium_init();
    
    char key[sodium.crypto_secretbox_keybytes()];
    char nonce[sodium.crypto_secretbox_noncebytes()];
    
    sodium.randombytes_buf(key, sizeof(key));
    sodium.randombytes_buf(nonce, sizeof(nonce));
    
    char* message = "secret dotfile content";
    uptr msg_len = strlen(message) + 1;
    char ciphertext[msg_len + sodium.crypto_secretbox_MACBYTES()];
    
    sodium.crypto_secretbox_easy(ciphertext, message, msg_len, nonce, key);
    printf("Encrypted %zu bytes\n", msg_len);
    
    char decrypted[msg_len];
    if (sodium.crypto_secretbox_open_easy(decrypted, ciphertext, sizeof(ciphertext), nonce, key) == 0) {
        printf("Decrypted: %s\n", decrypted);
    }
}
