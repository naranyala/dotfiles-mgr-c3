module tests::rpc_test;
import core::rpc;
import std::io;
import webview;
import cjson;
import libc;

// A dummy handler for testing
fn void dummy_handler(webview::Webview w, char* id, cjson::CJson args) {
    // Just a stub
}

fn void test_rpc_registry_initialization() @test {
    core::rpc::init();
    
    // In C3, we can't easily access global_registry directly from another module 
    // if it's not exported, but in this case `RpcRegistry global_registry;` is in core::rpc
    // Wait, let's just make sure register doesn't crash
    core::rpc::register("test_method", &dummy_handler);
    
    assert(core::rpc::global_registry.count == 1);
    assert(libc::strcmp((ZString)core::rpc::global_registry.methods[0], "test_method") == 0);
}

fn void test_rpc_max_registration() @test {
    core::rpc::init();
    
    // Register 128 unique methods
    for (int i = 0; i < 128; i++) {
        char* name = (char*)libc::malloc(32);
        libc::sprintf(name, "method_%d", i);
        core::rpc::register(name, &dummy_handler);
    }
    
    assert(core::rpc::global_registry.count == 128);
    
    // Register one more, should not exceed max
    core::rpc::register("overflow_method", &dummy_handler);
    assert(core::rpc::global_registry.count == 128);
}
