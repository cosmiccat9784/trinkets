from collections import deque

with open('words.txt', 'r') as f:
    ALL_WORDS = set(line.strip() for line in f if line.strip())

# Precompute neighbors and degree
adj = {}
degree = {}
word_list = sorted(ALL_WORDS)
for w1 in word_list:
    neighbors = [w2 for w2 in word_list if w1 != w2 and sum(1 for a, b in zip(w1, w2) if a != b) == 1]
    adj[w1] = neighbors
    degree[w1] = len(neighbors)

print(f"Dictionary: {len(ALL_WORDS)} words\n")

# Show degree distribution
from collections import Counter
deg_dist = Counter(degree.values())
print("Degree distribution:")
for d in sorted(deg_dist.keys()):
    print(f"  Degree {d}: {deg_dist[d]} words")

# Show words with lowest degree
print("\nLowest-degree words:")
for w in sorted(degree, key=degree.get)[:30]:
    print(f"  {w} (degree {degree[w]}): {', '.join(adj[w])}")

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

# Try building paths from low-degree words
print("\n\nSearching for unique 2-step paths from low-degree words...")
found = []
for start in sorted(degree, key=degree.get)[:200]:
    for target in sorted(ALL_WORDS):
        if start == target:
            continue
        steps, num_paths, paths = find_all_shortest(start, target)
        if steps == 2 and num_paths == 1:
            found.append((start, target, paths[0]))
            print(f"  {start} -> {target}: {' -> '.join(paths[0])}")
            if len(found) >= 15:
                break
    if len(found) >= 15:
        break

print(f"\nSearching for unique 3-step paths from low-degree words...")
found3 = []
for start in sorted(degree, key=degree.get)[:300]:
    for target in sorted(ALL_WORDS):
        if start == target:
            continue
        steps, num_paths, paths = find_all_shortest(start, target)
        if steps == 3 and num_paths == 1:
            found3.append((start, target, paths[0]))
            print(f"  {start} -> {target}: {' -> '.join(paths[0])}")
            if len(found3) >= 15:
                break
    if len(found3) >= 15:
        break

print(f"\nSearching for unique 4-step paths from low-degree words...")
found4 = []
for start in sorted(degree, key=degree.get)[:200]:
    for target in sorted(ALL_WORDS):
        if start == target:
            continue
        steps, num_paths, paths = find_all_shortest(start, target)
        if steps == 4 and num_paths == 1:
            found4.append((start, target, paths[0]))
            print(f"  {start} -> {target}: {' -> '.join(paths[0])}")
            if len(found4) >= 10:
                break
    if len(found4) >= 10:
        break
