module sodium;

extern fn int sodium_init();

// Hashing
extern fn int crypto_generichash_bytes();
extern fn int crypto_generichash(void* out, uptr outlen, char* in, ulong inlen, char* key, uptr keylen);

// Secretbox (authenticated encryption)
extern fn uptr crypto_secretbox_keybytes();
extern fn uptr crypto_secretbox_noncebytes();
extern fn int crypto_secretbox_easy(char* c, char* m, ulong mlen, char* n, char* k);
extern fn int crypto_secretbox_open_easy(char* m, char* c, ulong clen, char* n, char* k);

// Key derivation
extern fn uptr crypto_kdf_keybytes();
extern fn uptr crypto_kdf_bytes_min();
extern fn uptr crypto_kdf_bytes_max();
extern fn int crypto_kdf_keygen(char* k);
extern fn int crypto_kdf_derive_from_key(char* subkey, uptr subkey_len, ulong subkey_id, char* ctx, char* key);

// Random
extern fn void randombytes_buf(void* buf, uptr size);
extern fn uint randombytes_random();

// Key exchange (for secure channel setup)
extern fn uptr crypto_kx_publickeybytes();
extern fn uptr crypto_kx_secretkeybytes();
extern fn int crypto_kx_keypair(char* pk, char* sk);
