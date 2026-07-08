from collections import deque

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

dictionary = set()
for level in levels:
    dictionary.add(level["start"])
    dictionary.add(level["target"])
    dictionary.update(level["path"])

print(f"Dictionary size: {len(dictionary)} words\n")

def letter_diff(a, b):
    return sum(1 for x, y in zip(a, b) if x != y)

def get_neighbors(word):
    return [w for w in dictionary if w != word and len(w) == len(word) and letter_diff(w, word) == 1]

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

print("=== PATH ANALYSIS ===\n")
all_ok = True
for level in levels:
    steps, count, paths = find_all_shortest(level["start"], level["target"])
    intended = len(level["path"])
    unique = count == 1
    correct_length = steps == intended
    status = "OK" if (unique and correct_length) else "PROBLEM"
    if status != "OK":
        all_ok = False
    print(f"{level['start']} -> {level['target']} (intended: {intended} steps)")
    print(f"  Shortest: {steps} steps | Unique: {unique} | {status}")
    if not unique:
        for p in paths:
            print(f"    {' -> '.join(p)}")
    print()

if all_ok:
    print("ALL LEVELS OK!")
else:
    print("SOME LEVELS HAVE PROBLEMS")
