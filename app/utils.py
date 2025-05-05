import json
import numpy as np
from functools import wraps
from flask import jsonify


def numpy_safe_json(obj):
    """Convert NumPy types to standard Python types for JSON serialization"""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, (list, tuple)):
        return [numpy_safe_json(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: numpy_safe_json(value) for key, value in obj.items()}
    return obj


def safe_jsonify(*args, **kwargs):
    """Safely convert the response to JSON handling NumPy types"""
    if args and kwargs:
        raise TypeError('jsonify() behavior undefined when passed both args and kwargs')
    if len(args) == 1:
        data = args[0]
    else:
        data = args or kwargs

    return jsonify(numpy_safe_json(data))