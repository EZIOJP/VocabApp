# validate_word_json.py

import json
from word_schema import WordEntry
from pydantic import ValidationError

def validate_word_json(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if isinstance(data, list):
        for i, item in enumerate(data):
            try:
                WordEntry(**item)
                print(f"✅ Word {i+1} valid: {item.get('word')}")
            except ValidationError as e:
                print(f"❌ Word {i+1} INVALID:\n", e)
    else:
        try:
            WordEntry(**data)
            print(f"✅ Word valid: {data.get('word')}")
        except ValidationError as e:
            print("❌ Invalid Word:\n", e)
