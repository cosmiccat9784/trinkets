from collections import deque
import time

with open('words.txt', 'r') as f:
    ALL_WORDS = set(line.strip() for line in f if line.strip())

print(f"Full dictionary: {len(ALL_WORDS)} words")

# Precompute neighbors
print("Precomputing adjacency list...")
adj = {}
word_list = sorted(ALL_WORDS)
for i, w1 in enumerate(word_list):
    neighbors = []
    for j, w2 in enumerate(word_list):
        if i != j and sum(1 for a, b in zip(w1, w2) if a != b) == 1:
            neighbors.append(w2)
    adj[w1] = neighbors
print(f"Done. {sum(len(v) for v in adj.values()) // 2} edges\n")

def find_all_shortest(start, target):
    if start not in adj or target not in adj:
        return -1, 0, []
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
        for nxt in adj.get(current, []):
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

levels = [
    {"start": "COLD", "target": "WARM", "path": ["CORD", "CARD", "CART", "WART", "WARM"]},
    {"start": "WIND", "target": "FIRE", "path": ["FIND", "FINE", "FIRE"]},
    {"start": "HEAD", "target": "TAIL", "path": ["HEAL", "TEAL", "TELL", "TALL", "TAIL"]},
    {"start": "GAME", "target": "CODE", "path": ["GAVE", "CAVE", "COVE", "CODE"]},
    {"start": "SAND", "target": "GOLD", "path": ["BAND", "BOND", "BOLD", "GOLD"]},
    {"start": "DART", "target": "MOON", "path": ["DARN", "BARN", "BORN", "BOON", "MOON"]},
    {"start": "BIRD", "target": "WORM", "path": ["BARD", "BARE", "BORE", "WORE", "WORM"]},
    {"start": "TOIL", "target": "DELL", "path": ["TOLL", "TELL", "DELL"]},
    {"start": "BOOK", "target": "TOOT", "path": ["LOOK", "LOOT", "TOOT"]},
    {"start": "TENT", "target": "FALL", "path": ["FENT", "FELT", "FELL", "FALL"]},
    {"start": "DISH", "target": "MIST", "path": ["FISH", "FIST", "MIST"]},
    {"start": "FROG", "target": "FLAW", "path": ["FLOG", "FLAG", "FLAW"]},
    {"start": "PEAR", "target": "POST", "path": ["PEAT", "PEST", "POST"]},
    {"start": "KELP", "target": "MILT", "path": ["KELT", "MELT", "MILT"]},
    {"start": "RING", "target": "WIND", "path": ["KING", "KIND", "WIND"]},
    {"start": "BEAR", "target": "FEAT", "path": ["FEAR", "FEAT"]},
    {"start": "FILM", "target": "WIRE", "path": ["FIRM", "FIRE", "WIRE"]},
    {"start": "LEND", "target": "BOLD", "path": ["BEND", "BOND", "BOLD"]},
]

print("=== PATH ANALYSIS (FULL DICTIONARY) ===\n")
all_ok = True
for level in levels:
    t0 = time.time()
    start = level["start"]
    target = level["target"]
    steps, count, paths = find_all_shortest(start, target)
    elapsed = time.time() - t0
    intended = len(level["path"])
    unique = count == 1
    correct_length = steps == intended
    status = "OK" if (unique and correct_length) else "PROBLEM"
    if status != "OK":
        all_ok = False
    print(f"{start} -> {target} (intended: {intended} steps) [{elapsed:.1f}s]")
    print(f"  Shortest: {steps} steps | Paths: {count} | Unique: {unique} | {status}")
    if not unique:
        for p in paths[:5]:
            print(f"    {' -> '.join(p)}")
        if count > 5:
            print(f"    ... and {count - 5} more")
    print()

if all_ok:
    print("ALL LEVELS OK!")
else:
    print("SOME LEVELS HAVE PROBLEMS")
