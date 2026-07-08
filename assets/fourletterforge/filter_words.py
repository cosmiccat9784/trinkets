with open(r'C:\Users\ar101\.local\share\opencode\tool-output\tool_f362eab00001koUuL7c6P9g9nZ', 'r') as f:
    words = [line.strip().upper() for line in f if len(line.strip()) == 4 and line.strip().isalpha()]

words = sorted(set(words))
print(f"Found {len(words)} four-letter words")

with open('words.txt', 'w') as f:
    for w in words:
        f.write(w + '\n')
