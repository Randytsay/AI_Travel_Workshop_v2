
import os

file_path = r'd:\Coding\AI_Travel_Workshop\index.html'

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.readlines()

with open(file_path, 'w', encoding='utf-8') as f:
    for line in content:
        if '非洲芒果茶飲' in line:
            f.write("            { emoji: '🍵', text: '全新生活™非洲芒果茶飲' },\n")
        else:
            f.write(line)

print("Done fixing index.html")
