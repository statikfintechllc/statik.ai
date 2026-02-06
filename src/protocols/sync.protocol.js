{
    "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
            "properties": {
        "type": { "const": "state.sync" },
        "payload": {
            "type": "object",
                "properties": {
                "entity": { "type": "string", "enum": ["memory", "pattern", "goal"] },
                "action": { "type": "string", "enum": ["push", "pull"] },
                "data": { "type": "object" }
            },
            "required": ["entity", "action", "data"]
        }
    },
    "required": ["type", "payload"]
}
