module yaml;

typedef YamlParser = void*;
typedef YamlEvent = void*;

const int YAML_NO_EVENT = 0;
const int YAML_STREAM_START_EVENT = 1;
const int YAML_DOCUMENT_START_EVENT = 2;
const int YAML_DOCUMENT_END_EVENT = 3;
const int YAML_SEQUENCE_START_EVENT = 4;
const int YAML_SEQUENCE_END_EVENT = 5;
const int YAML_MAPPING_START_EVENT = 6;
const int YAML_MAPPING_END_EVENT = 7;
const int YAML_SCALAR_EVENT = 8;

extern fn int yaml_parser_initialize(YamlParser* parser);
extern fn void yaml_parser_delete(YamlParser* parser);
extern fn int yaml_parser_set_input_string(YamlParser* parser, char* input, uptr size);
extern fn int yaml_parser_parse(YamlParser* parser, YamlEvent* event);
extern fn void yaml_event_delete(YamlEvent* event);

typedef YamlEmitter = void*;

extern fn int yaml_emitter_initialize(YamlEmitter* emitter);
extern fn void yaml_emitter_delete(YamlEmitter* emitter);
extern fn int yaml_emitter_set_output_string(YamlEmitter* emitter, char** output, uptr* size, uptr* append);
extern fn int yaml_emitter_emit(YamlEmitter* emitter, YamlEvent* event);
extern fn int yaml_emitter_flush(YamlEmitter* emitter);
