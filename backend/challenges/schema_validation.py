from collections.abc import Mapping

from rest_framework.exceptions import ValidationError


TYPE_CHECKS = {
    'string': lambda value: isinstance(value, str),
    'number': lambda value: isinstance(value, (int, float)) and not isinstance(value, bool),
    'integer': lambda value: isinstance(value, int) and not isinstance(value, bool),
    'boolean': lambda value: isinstance(value, bool),
    'array': lambda value: isinstance(value, list),
    'object': lambda value: isinstance(value, Mapping),
}


def validate_payload(payload, schema):
    """Validate the challenge's supported JSON-schema subset on the server."""
    if not isinstance(payload, Mapping):
        raise ValidationError({'payload': 'Payload must be a JSON object.'})
    if not isinstance(schema, Mapping):
        raise ValidationError({'submission_schema': 'Schema must be a JSON object.'})

    properties = schema.get('properties', schema.get('fields', schema))
    required = set(schema.get('required', []))
    if not isinstance(properties, Mapping):
        raise ValidationError({'payload': 'Schema properties must be an object.'})

    errors = {name: 'This field is required.' for name in required if name not in payload}
    for name, value in payload.items():
        definition = properties.get(name)
        if definition is None:
            if schema.get('additionalProperties') is False:
                errors[name] = 'Unexpected field.'
            continue
        if isinstance(definition, str):
            definition = {'type': definition}
        if not isinstance(definition, Mapping):
            errors[name] = 'Field definition must be an object or type name.'
            continue
        expected_type = definition.get('type')
        if expected_type in TYPE_CHECKS and not TYPE_CHECKS[expected_type](value):
            errors[name] = f'Expected a {expected_type}.'
        if 'enum' in definition and value not in definition['enum']:
            errors[name] = 'Value is not one of the allowed options.'
    if errors:
        raise ValidationError({'payload': errors})
    return payload
