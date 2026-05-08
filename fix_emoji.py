import re
import os

path = r'd:/Coding/AI_Travel_Workshop/css/main.css'
if os.path.exists(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Restore sakura emoji if it's empty or mangled
    # Mangled pattern from earlier was '?' or just '' after my normalization
    content = re.sub(r"content:\s*'\?'\s*;", "content: '🌸';", content)
    content = re.sub(r"content:\s*''\s*;", "content: '🌸';", content)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Success")
else:
    print("Path not found")
