module build;
import std::io;

extern fn int system(char* command);

fn int main() {
    io::printn("=== Building dotfiles-manager (C3 Build System) ===");
    
    // Check and build dependencies
    int deps_status = system(`
        if [ ! -f deps/out/lib/libcjson.a ]; then
            echo 'Building dependencies first...'
            bash deps/download.sh
            bash deps/build.sh
        fi
    `);
    
    if (deps_status != 0) {
        io::printn("Failed to build dependencies!");
        return 1;
    }

    io::printn("Compiling webview C++ wrapper...");
    int cpp_status = system(`
        PKG_DEPS=""
        if [ "$(uname)" = "Linux" ]; then
            PKG_DEPS="gtk+-3.0 webkit2gtk-4.1"
        fi
        
        c++ -c webview/core/src/webview.cc -o webview.o -std=c++11 \
            -DWEBVIEW_GTK -DWEBVIEW_STATIC -DWEBVIEW_IMPLEMENTATION \
            -Iwebview/core/include \
            $(pkg-config --cflags $PKG_DEPS)
    `);
    
    if (cpp_status != 0) {
        io::printn("Failed to compile webview wrapper!");
        return 1;
    }

    io::printn("Compiling C3 application...");
    int c3_status = system(`
        PKG_DEPS=""
        if [ "$(uname)" = "Linux" ]; then
            PKG_DEPS="gtk+-3.0 webkit2gtk-4.1"
        fi
        
        c3c compile src webview.o \
            -o dotfiles-mgr \
            -z "deps/out/lib/libcjson.a \
                deps/out/lib/libarchive.a \
                deps/out/lib/libgit2.a \
                deps/out/lib/libsqlite3.a \
                deps/out/lib/libyaml.a \
                deps/out/lib/libsodium.a \
                $(pkg-config --libs $PKG_DEPS) \
                -lstdc++ -lpthread -lz -lm -ldl"
    `);

    if (c3_status != 0) {
        io::printn("Failed to compile C3 application!");
        return 1;
    }

    io::printn("");
    io::printn("Build successful! Executable is 'dotfiles-mgr'");
    io::printn("");
    io::printn("Libraries linked:");
    io::printn("  - webview (GTK/WebKit)");
    io::printn("  - cJSON (JSON)");
    io::printn("  - libarchive (tar/zip)");
    io::printn("  - libgit2 (git)");
    io::printn("  - SQLite3 (database)");
    io::printn("  - libyaml (YAML)");
    io::printn("  - libsodium (crypto)");

    return 0;
}
