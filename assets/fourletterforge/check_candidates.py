from collections import deque
import itertools

with open('words.txt', 'r') as f:
    ALL_WORDS = set(line.strip() for line in f if line.strip())

# Precompute neighbors
adj = {}
word_list = sorted(ALL_WORDS)
for w1 in word_list:
    adj[w1] = [w2 for w2 in word_list if w1 != w2 and sum(1 for a, b in zip(w1, w2) if a != b) == 1]

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

# Only check specific candidates
candidates = [
    ("PEAR", "POST"),
    ("DISH", "MIST"),
    ("FELT", "FELL"),
    ("PEST", "POST"),
    ("FELT", "FALL"),
    ("FELL", "FALL"),
    ("DELL", "FELL"),
    ("TELL", "DELL"),
    ("DELL", "TALL"),
    ("TELL", "TALL"),
    ("TOLL", "TELL"),
    ("DOLL", "DELL"),
    ("DOLL", "TELL"),
    ("FLOG", "FLAG"),
    ("FLAG", "FLAW"),
    ("FLOG", "FLAW"),
    ("LOOT", "TOOT"),
    ("LOOK", "TOOT"),
    ("BOON", "MOON"),
    ("MOOR", "MOON"),
    ("BORN", "MOON"),
    ("KELT", "MELT"),
    ("MELT", "MILT"),
    ("KELT", "MILT"),
    ("PEAT", "PEST"),
    ("PEAT", "POST"),
    ("FIST", "MIST"),
    ("FISH", "MIST"),
    ("FISH", "FIST"),
    ("KIND", "WIND"),
    ("KING", "WIND"),
    ("KING", "KIND"),
    ("WARD", "WARM"),
    ("WART", "WARM"),
    ("CORD", "CARD"),
    ("CARD", "CART"),
    ("CART", "WART"),
    ("BARD", "BARE"),
    ("BARE", "BORE"),
    ("BORE", "WORE"),
    ("WORE", "WORM"),
    ("BAND", "BOND"),
    ("BOND", "BOLD"),
    ("BOLD", "GOLD"),
    ("BEND", "BOND"),
    ("FEAR", "FEAT"),
]

print("=== CANDIDATE VERIFICATION ===\n")
for start, target in candidates:
    steps, num_paths, paths = find_all_shortest(start, target)
    unique = num_paths == 1
    print(f"{start} -> {target}: {steps} steps, {num_paths} paths, {'OK' if unique else 'FAIL'}")
    if not unique and num_paths <= 10:
        for p in paths:
            print(f"  {' -> '.join(p)}")
