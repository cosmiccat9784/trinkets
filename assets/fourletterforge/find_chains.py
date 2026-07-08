from collections import deque

with open('words.txt', 'r') as f:
    ALL_WORDS = set(line.strip() for line in f if line.strip())

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

# Chains of unique 1-step edges
# Build a graph of only unique 1-step connections
print("Building unique-edge graph...")
unique_edges = {}
for w in word_list:
    unique_edges[w] = []
    for neighbor in adj[w]:
        steps, num_paths, _ = find_all_shortest(w, neighbor)
        if steps == 1 and num_paths == 1:
            unique_edges[w].append(neighbor)

# Find longest unique chains using DFS
print("Finding unique chains (2+ steps)...")
found = set()
def dfs(start, current, path, depth, max_depth):
    if depth >= 2:
        target = current
        key = (start, target)
        if key not in found:
            found.add(key)
            print(f"  {start} -> {target} ({depth} steps): {' -> '.join(path)}")
    if depth >= max_depth:
        return
    for neighbor in unique_edges.get(current, []):
        if neighbor not in path:
            dfs(start, neighbor, path + [neighbor], depth + 1, max_depth)

count = 0
for start in sorted(ALL_WORDS):
    if count >= 30:
        break
    for first in unique_edges.get(start, []):
        dfs(start, first, [start, first], 1, 5)
        if len(found) >= 30:
            break
    if len(found) >= 30:
        break

print(f"\nTotal unique chains found: {len(found)}")
