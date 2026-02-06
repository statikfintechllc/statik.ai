{
    "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
            "properties": {
        "type": { "const": "instance.announce" },
        "payload": {
            "type": "object",
                "properties": {
                "instance_id": { "type": "string" },
                "endpoints": {
                    "type": "array",
                        "items": { "type": "string" }
                },
                "capabilities": {
                    "type": "array",
                        "items": { "type": "string" }
                }
            },
            "required": ["instance_id"]
        }
    },
    "required": ["type", "payload"]
}
