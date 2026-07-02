module features::python_services;

import webview;
import cjson;
import libc;
import core::rpc;
import core::errors;

extern fn void* popen(char* command, char* type);
extern fn int pclose(void* stream);
extern fn char* fgets(char* s, int size, void* stream);

const char* LLAMA_URL = "http://127.0.0.1:8081";
const char* TTS_URL = "http://127.0.0.1:8082";
const char* MD2PDF_URL = "http://127.0.0.1:8083";
const char* PDF2SPEECH_URL = "http://127.0.0.1:8084";

// ── Helpers ───────────────────────────────────────────────────

fn char* run_cmd(char* cmd) {
    void* fp = popen(cmd, "r");
    if (fp == null) return null;
    char[16384] output;
    output[0] = 0;
    char[512] buf;
    while (fgets(&buf[0], 512, fp) != null) {
        libc::strncat(&output[0], &buf[0], 16384 - libc::strlen((ZString)&output[0]) - 1);
    }
    pclose(fp);
    int len = (int)libc::strlen((ZString)&output[0]);
    char* result = libc::malloc((usz)(len + 1));
    libc::strncpy(result, &output[0], (usz)(len + 1));
    return result;
}

fn char* http_get(char* url) {
    char[1024] cmd;
    libc::snprintf(&cmd[0], 1024, "curl -s --max-time 10 '%s'", url);
    return run_cmd(&cmd[0]);
}

fn char* http_post(char* url, char* json_body) {
    char[4096] cmd;
    // Escape single quotes in json_body for shell safety
    libc::snprintf(&cmd[0], 4096, "curl -s --max-time 30 -X POST -H 'Content-Type: application/json' -d '%s' '%s'", json_body, url);
    return run_cmd(&cmd[0]);
}

fn char* http_post_raw(char* url, char* data) {
    char[4096] cmd;
    libc::snprintf(&cmd[0], 4096, "curl -s --max-time 30 -X POST -H 'Content-Type: application/json' --data-binary '%s' '%s'", data, url);
    return run_cmd(&cmd[0]);
}

fn void return_json(webview::Webview w, char* id, char* raw_json) {
    if (raw_json == null) {
        core::rpc::respond_error(w, id, errors::ERR_IO, "No response from service", "python-services");
        return;
    }
    // Trim trailing newline
    int len = (int)libc::strlen((ZString)raw_json);
    while (len > 0 && raw_json[len - 1] == '\n') { raw_json[len - 1] = 0; len--; }

    cjson::CJson parsed = cjson::cJSON_Parse(raw_json);
    if ((void*)parsed == null) {
        core::rpc::respond_error(w, id, errors::ERR_JSON_PARSE, raw_json, "python-services");
        libc::free(raw_json);
        return;
    }
    char* str = cjson::cJSON_PrintUnformatted(parsed);
    webview::webview_return(w, id, 0, str);
    libc::free(str);
    libc::free(raw_json);
    cjson::cJSON_Delete(parsed);
}

fn void return_ok(webview::Webview w, char* id, cjson::CJson obj) {
    char* str = cjson::cJSON_PrintUnformatted(obj);
    webview::webview_return(w, id, 0, str);
    libc::free(str);
    cjson::cJSON_Delete(obj);
}

fn char* arg_str(cjson::CJson args, int index) {
    if (cjson::cJSON_GetArraySize(args) <= index) return null;
    cjson::CJson item = cjson::cJSON_GetArrayItem(args, index);
    if (!cjson::cJSON_IsString(item)) return null;
    return cjson::cJSON_GetStringValue(item);
}

fn char* build_url(char* base, char* path) {
    char[512] url;
    libc::snprintf(&url[0], 512, "%s%s", base, path);
    int len = (int)libc::strlen((ZString)&url[0]);
    char* result = libc::malloc((usz)(len + 1));
    libc::strncpy(result, &url[0], (usz)(len + 1));
    return result;
}

// ═══════════════════════════════════════════════════════════════
// LLAMA SERVER HANDLERS
// ═══════════════════════════════════════════════════════════════

fn void handle_llama_health(webview::Webview w, char* id, cjson::CJson args) {
    char* url = build_url(LLAMA_URL, "/health");
    char* res = http_get(url);
    libc::free(url);
    return_json(w, id, res);
}

fn void handle_llama_models(webview::Webview w, char* id, cjson::CJson args) {
    char* url = build_url(LLAMA_URL, "/models");
    char* res = http_get(url);
    libc::free(url);
    return_json(w, id, res);
}

fn void handle_llama_load(webview::Webview w, char* id, cjson::CJson args) {
    char* model_path = arg_str(args, 1);
    char[1024] body;
    if (model_path != null) {
        libc::snprintf(&body[0], 1024, "{\"path\":\"%s\"}", model_path);
    } else {
        libc::snprintf(&body[0], 1024, "{}");
    }
    char* url = build_url(LLAMA_URL, "/load");
    char* res = http_post_raw(url, &body[0]);
    libc::free(url);
    return_json(w, id, res);
}

fn void handle_llama_unload(webview::Webview w, char* id, cjson::CJson args) {
    char* url = build_url(LLAMA_URL, "/unload");
    char* res = http_post_raw(url, "{}");
    libc::free(url);
    return_json(w, id, res);
}

fn void handle_llama_generate(webview::Webview w, char* id, cjson::CJson args) {
    char* prompt = arg_str(args, 1);
    if (prompt == null) {
        core::rpc::respond_error(w, id, errors::ERR_INVALID_ARGS, "Missing prompt", "llama");
        return;
    }

    int max_tokens = 256;
    double temperature = 0.7;
    if (cjson::cJSON_GetArraySize(args) > 2) {
        cjson::CJson opt = cjson::cJSON_GetArrayItem(args, 2);
        if (cjson::cJSON_IsObject(opt)) {
            cjson::CJson mt = cjson::cJSON_GetObjectItem(opt, "max_tokens");
            if ((void*)mt != null && cjson::cJSON_IsNumber(mt)) max_tokens = (int)cjson::cJSON_GetNumberValue(mt);
            cjson::CJson temp_item = cjson::cJSON_GetObjectItem(opt, "temperature");
            if ((void*)temp_item != null && cjson::cJSON_IsNumber(temp_item)) temperature = cjson::cJSON_GetNumberValue(temp_item);


        }
    }

    // Build JSON body — escape quotes in prompt
    char[8192] body;
    libc::snprintf(&body[0], 8192, "{\"prompt\":\"%s\",\"max_tokens\":%d,\"temperature\":%.2f}", prompt, max_tokens, temperature);
    char* url = build_url(LLAMA_URL, "/generate");
    char* res = http_post_raw(url, &body[0]);
    libc::free(url);
    return_json(w, id, res);
}

// ═══════════════════════════════════════════════════════════════
// TTS RUNNER HANDLERS
// ═══════════════════════════════════════════════════════════════

fn void handle_tts_health(webview::Webview w, char* id, cjson::CJson args) {
    char* url = build_url(TTS_URL, "/health");
    char* res = http_get(url);
    libc::free(url);
    return_json(w, id, res);
}

fn void handle_tts_voices(webview::Webview w, char* id, cjson::CJson args) {
    char* url = build_url(TTS_URL, "/voices");
    char* res = http_get(url);
    libc::free(url);
    return_json(w, id, res);
}

fn void handle_tts_speak(webview::Webview w, char* id, cjson::CJson args) {
    char* text = arg_str(args, 1);
    if (text == null) {
        core::rpc::respond_error(w, id, errors::ERR_INVALID_ARGS, "Missing text", "tts");
        return;
    }

    char* voice = "en-US-AriaNeural";
    char* rate = "+0%";
    if (cjson::cJSON_GetArraySize(args) > 2) {
        cjson::CJson opt = cjson::cJSON_GetArrayItem(args, 2);
        if (cjson::cJSON_IsObject(opt)) {
            cjson::CJson v_item = cjson::cJSON_GetObjectItem(opt, "voice");
            if ((void*)v_item != null && cjson::cJSON_IsString(v_item)) voice = cjson::cJSON_GetStringValue(v_item);
            cjson::CJson r_item = cjson::cJSON_GetObjectItem(opt, "rate");
            if ((void*)r_item != null && cjson::cJSON_IsString(r_item)) rate = cjson::cJSON_GetStringValue(r_item);


        }
    }

    char[4096] body;
    libc::snprintf(&body[0], 4096, "{\"text\":\"%s\",\"voice\":\"%s\",\"rate\":\"%s\"}", text, voice, rate);
    char* url = build_url(TTS_URL, "/speak");
    char* res = http_post_raw(url, &body[0]);
    libc::free(url);
    return_json(w, id, res);
}

fn void handle_tts_audio(webview::Webview w, char* id, cjson::CJson args) {
    char* filename = arg_str(args, 1);
    if (filename == null) {
        core::rpc::respond_error(w, id, errors::ERR_INVALID_ARGS, "Missing filename", "tts");
        return;
    }
    char[512] path;
    libc::snprintf(&path[0], 512, "/audio/%s", filename);
    char* url = build_url(TTS_URL, &path[0]);
    char* res = http_get(url);
    libc::free(url);
    return_json(w, id, res);
}

// ═══════════════════════════════════════════════════════════════
// MD-TO-PDF HANDLERS
// ═══════════════════════════════════════════════════════════════

fn void handle_md2pdf_health(webview::Webview w, char* id, cjson::CJson args) {
    char* url = build_url(MD2PDF_URL, "/health");
    char* res = http_get(url);
    libc::free(url);
    return_json(w, id, res);
}

fn void handle_md2pdf_convert(webview::Webview w, char* id, cjson::CJson args) {
    char* md_text = arg_str(args, 1);
    if (md_text == null) {
        core::rpc::respond_error(w, id, errors::ERR_INVALID_ARGS, "Missing markdown text", "md-to-pdf");
        return;
    }
    char* title = arg_str(args, 2);
    if (title == null) title = "Document";

    char[16384] body;
    libc::snprintf(&body[0], 16384, "{\"markdown\":\"%s\",\"title\":\"%s\"}", md_text, title);
    char* url = build_url(MD2PDF_URL, "/convert");
    char* res = http_post_raw(url, &body[0]);
    libc::free(url);
    return_json(w, id, res);
}

// ═══════════════════════════════════════════════════════════════
// PDF-TO-SPEECH HANDLERS
// ═══════════════════════════════════════════════════════════════

fn void handle_pdf2speech_health(webview::Webview w, char* id, cjson::CJson args) {
    char* url = build_url(PDF2SPEECH_URL, "/health");
    char* res = http_get(url);
    libc::free(url);
    return_json(w, id, res);
}

fn void handle_pdf2speech_speak(webview::Webview w, char* id, cjson::CJson args) {
    char* text = arg_str(args, 1);
    if (text == null) {
        core::rpc::respond_error(w, id, errors::ERR_INVALID_ARGS, "Missing text", "pdf-to-speech");
        return;
    }

    char* voice = "en-US-AriaNeural";
    char* rate = "+0%";
    if (cjson::cJSON_GetArraySize(args) > 2) {
        cjson::CJson opt = cjson::cJSON_GetArrayItem(args, 2);
        if (cjson::cJSON_IsObject(opt)) {
            cjson::CJson v = cjson::cJSON_GetObjectItem(opt, "voice");
            if ((void*)v != null && cjson::cJSON_IsString(v)) voice = cjson::cJSON_GetStringValue(v);
            cjson::CJson r = cjson::cJSON_GetObjectItem(opt, "rate");
            if ((void*)r != null && cjson::cJSON_IsString(r)) rate = cjson::cJSON_GetStringValue(r);
        }
    }

    char[8192] body;
    libc::snprintf(&body[0], 8192, "{\"text\":\"%s\",\"voice\":\"%s\",\"rate\":\"%s\"}", text, voice, rate);
    char* url = build_url(PDF2SPEECH_URL, "/speak");
    char* res = http_post_raw(url, &body[0]);
    libc::free(url);
    return_json(w, id, res);
}

fn void handle_pdf2speech_convert_and_speak(webview::Webview w, char* id, cjson::CJson args) {
    char* text = arg_str(args, 1);
    if (text == null) {
        core::rpc::respond_error(w, id, errors::ERR_INVALID_ARGS, "Missing text", "pdf-to-speech");
        return;
    }

    char* voice = "en-US-AriaNeural";
    char* rate = "+0%";
    if (cjson::cJSON_GetArraySize(args) > 2) {
        cjson::CJson opt = cjson::cJSON_GetArrayItem(args, 2);
        if (cjson::cJSON_IsObject(opt)) {
            cjson::CJson v = cjson::cJSON_GetObjectItem(opt, "voice");
            if ((void*)v != null && cjson::cJSON_IsString(v)) voice = cjson::cJSON_GetStringValue(v);
            cjson::CJson r = cjson::cJSON_GetObjectItem(opt, "rate");
            if ((void*)r != null && cjson::cJSON_IsString(r)) rate = cjson::cJSON_GetStringValue(r);
        }
    }

    char[8192] body;
    libc::snprintf(&body[0], 8192, "{\"text\":\"%s\",\"voice\":\"%s\",\"rate\":\"%s\"}", text, voice, rate);
    char* url = build_url(PDF2SPEECH_URL, "/convert-and-speak");
    char* res = http_post_raw(url, &body[0]);
    libc::free(url);
    return_json(w, id, res);
}

fn void handle_pdf2speech_audio(webview::Webview w, char* id, cjson::CJson args) {
    char* filename = arg_str(args, 1);
    if (filename == null) {
        core::rpc::respond_error(w, id, errors::ERR_INVALID_ARGS, "Missing filename", "pdf-to-speech");
        return;
    }
    char[512] path;
    libc::snprintf(&path[0], 512, "/audio/%s", filename);
    char* url = build_url(PDF2SPEECH_URL, &path[0]);
    char* res = http_get(url);
    libc::free(url);
    return_json(w, id, res);
}

// ── Init ──────────────────────────────────────────────────────

fn int init() {
    int rc;
    rc = core::rpc::register("llama.health", &handle_llama_health); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("llama.models", &handle_llama_models); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("llama.load", &handle_llama_load); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("llama.unload", &handle_llama_unload); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("llama.generate", &handle_llama_generate); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("tts.health", &handle_tts_health); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("tts.voices", &handle_tts_voices); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("tts.speak", &handle_tts_speak); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("tts.audio", &handle_tts_audio); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("md-to-pdf.health", &handle_md2pdf_health); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("md-to-pdf.convert", &handle_md2pdf_convert); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("pdf-to-speech.health", &handle_pdf2speech_health); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("pdf-to-speech.speak", &handle_pdf2speech_speak); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("pdf-to-speech.convertAndSpeak", &handle_pdf2speech_convert_and_speak); if (rc != errors::ERR_OK) return rc;
    rc = core::rpc::register("pdf-to-speech.audio", &handle_pdf2speech_audio); if (rc != errors::ERR_OK) return rc;
    return errors::ERR_OK;
}
