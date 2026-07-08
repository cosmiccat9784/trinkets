from collections import deque

with open('words.txt', 'r') as f:
    ALL_WORDS = set(line.strip() for line in f if line.strip())

print(f"Full dictionary: {len(ALL_WORDS)} words\n")

def letter_diff(a, b):
    return sum(1 for x, y in zip(a, b) if x != y)

def get_neighbors(word):
    return [w for w in ALL_WORDS if w != word and len(w) == len(word) and letter_diff(w, word) == 1]

def find_all_shortest(start, target):
    if start == target:
        return 0, 1, [[start]]
    queue = deque([(start, [start])])
    visited = {start: 0}
    shortest_len = float("inf")
    shortest_paths = []
    while queue:
        current, path = queue.popleft()
        if len(path) > shortest_len:
            break
        for nxt in get_neighbors(current):
            if nxt == target:
                new_path = path + [nxt]
                if len(new_path) < shortest_len:
                    shortest_len = len(new_path)
                    shortest_paths = [new_path]
                elif len(new_path) == shortest_len:
                    shortest_paths.append(new_path)
            else:
                if nxt not in visited or visited[nxt] >= len(path):
                    visited[nxt] = len(path)
                    queue.append((nxt, path + [nxt]))
    steps = shortest_len - 1 if shortest_len != float("inf") else -1
    return steps, len(shortest_paths), shortest_paths

# Test one level at a time
import sys
if len(sys.argv) > 1:
    start = sys.argv[1]
    target = sys.argv[2]
    print(f"Testing {start} -> {target}")
    steps, count, paths = find_all_shortest(start, target)
    print(f"  Shortest: {steps} steps | Paths: {count}")
    if count <= 10:
        for p in paths:
            print(f"    {' -> '.join(p)}")
    else:
        for p in paths[:5]:
            print(f"    {' -> '.join(p)}")
        print(f"    ... and {count - 5} more")
else:
    print("Usage: python check_single.py START TARGET")
