# AlgoMonster Decision Flowchart (Reviewer)

This reviewer reproduces, node-for-node, the decision flowchart published by
[AlgoMonster](https://algo.monster/flowchart): a single top-down decision tree you walk one yes/no answer at
a time, from the root *"Is it a graph?"* down to a recommended technique. It is the dedicated companion to
the [Algorithm Patterns Index](algorithm-patterns-index-reviewer.md) — the index does the fast, cue-based
triage; this page is the exhaustive walk for when no single cue jumps out. All **91 nodes** are here (47
question diamonds routing to 44 technique leaves): the **diamonds** are questions about the problem, the
**rounded boxes** are the technique to reach for once you land on a leaf.

> **Tip — the inline diagram below is dense (91 nodes).** For a full-screen view you can zoom and pan, with
> a top-down ↔ left-right layout toggle, open the interactive companion
> **[algomonster-flowchart.html](algomonster-flowchart.html)** (double-click it to open in your browser).

Related: [Algorithm Patterns Index](algorithm-patterns-index-reviewer.md) · [Glossary](algorithms-glossary-reviewer.md)

## How to read it

> Traverse from the root, answering each diamond about the *problem description* — its
> shape, its [constraints](algorithms-glossary-reviewer.md#constraints "The limits a problem places on inputs; reading them first picks your complexity target."), and what it asks for. The first leaf you reach is the suggested pattern. Four of the
> deepest diamonds (`Greedy solution?`, and the innermost `Monotonic condition?` / `Split into subproblems?`
> checks) have only a **yes** branch by design: a "no" there means none of the cheap tricks apply, so you
> keep moving down the spine to the next question. Treat this chart as a **complement** to the cue sheet —
> the cue sheet is fast recognition from one signal word; this flowchart is the exhaustive walk for when no
> single cue jumps out.

## The shape of the tree

The root question — *Is it a graph?* — splits the whole chart in two. A **yes**
drops into the compact graph region — tree vs.
[DAG](algorithms-glossary-reviewer.md#dag "A directed graph with no cycles; its vertices can be topologically ordered.")
vs. shortest-path vs. connectivity, landing on BFS/DFS,
[topological sort](algorithms-glossary-reviewer.md#topological-sort "A linear order of a DAG's vertices where every edge points forward."),
[Dijkstra](algorithms-glossary-reviewer.md#dijkstra "Finds shortest paths from a source on non-negative weights via a min-heap."),
or [union-find](algorithms-glossary-reviewer.md#union-find "Tracks elements in groups with near-O(1) find-group and merge-groups operations.").
A **no** enters a long, left-leaning spine where each subsequent *no*
steps you down through progressively more specific families: search & order → linked lists → hashing →
intervals → partitioning → strings → small-constraint brute force/DP → subarray/window → max-min & counting
optimization → the multi-sequence / two-pointer family → and finally a tail of symbol parsing,
data-structure design, simulation, and number theory. Because *no* answers cascade down that spine, the
**earliest questions carry the most weight** — answer *Is it a graph?* and *Sorted input or monotonic
answer?* correctly and you have already pruned most of the tree.

## The flowchart

```mermaid
flowchart TD
    N0{"Is it a graph?"}
    N1{"Is it a tree?"}
    N2{"Level-order or shortest-level answer?"}
    N3["BFS"]
    N4{"Count/generate many trees?"}
    N5["Divide and Conquer / Tree DP"]
    N6["DFS"]
    N7{"DAG-related?"}
    N8["Topological Sort"]
    N9{"Shortest-path problem?"}
    N10{"Is the graph Weighted?"}
    N11["Dijkstra's Algorithm"]
    N12["BFS"]
    N13{"Connectivity problem?"}
    N14["Disjoint Set Union"]
    N15{"Small constraints?"}
    N16["DFS/backtracking"]
    N17["BFS"]
    N18{"Sorted input or monotonic answer?"}
    N19{"Dynamic range or order queries?"}
    N20["Ordered Set / Fenwick / Segment Tree"]
    N21["Binary Search"]
    N22{"kth smallest/largest?"}
    N23["Heap / Sortings"]
    N24{"Linked list problem?"}
    N25{"Fast/slow or fixed-gap pointers?"}
    N26["Two pointers"]
    N27{"Merge many sorted lists?"}
    N28["Heap / Divide and Conquer"]
    N29["Linked List Manipulation"]
    N30{"Fast lookup, counting, or grouping?"}
    N31["Hash Table / Counting"]
    N32{"Merge, insert, or scan intervals?"}
    N33["Sorting + Interval Scan"]
    N34{"In-place array partitioning?"}
    N35["Two pointers / Partitioning"]
    N36{"Split/match string with dictionary?"}
    N37{"Prefix or pattern matching?"}
    N38["Trie / String Matching / Rolling Hash"]
    N39["Trie / DP / Memoization"]
    N40{"Small constraints?"}
    N41{"Is brute force enough?"}
    N42["Brute force / Backtracking"]
    N43{"Subset state?"}
    N44["Bitmask DP"]
    N45["Dynamic Programming"]
    N46{"Sum/additive problem?"}
    N47["Prefix Sums"]
    N48{"Subarray or substring problem?"}
    N49{"Maintain a valid window?"}
    N50["Sliding Window"]
    N51{"Need nearest greater/smaller bounds?"}
    N52["Monotonic Stack"]
    N53["Dynamic Programming"]
    N54{"Compute a max/min?"}
    N55{"Sorted index or monotonic answer?"}
    N56["Binary Search"]
    N57{"Need nearest greater/smaller bounds?"}
    N58["Monotonic Stack"]
    N59{"Split into subproblems?"}
    N60["Dynamic Programming"]
    N61{"Greedy solution?"}
    N62["Greedy Algorithms"]
    N63{"Count number of ways?"}
    N64{"Is brute force enough?"}
    N65["Brute Force / Backtracking"]
    N66["Dynamic Programming"]
    N67{"Multiple sequences?"}
    N68{"Monotonic condition?"}
    N69["Two pointers"]
    N70{"Split into subproblems?"}
    N71["Dynamic Programming"]
    N72{"Find/enumerate indices?"}
    N73{"Monotonic condition?"}
    N74["Two pointers"]
    N75{"Need O(1) memory?"}
    N76{"Monotonic condition?"}
    N77["Two pointers"]
    N78{"Need to parse symbols?"}
    N79{"Optimize/count valid spans?"}
    N80["Dynamic Programming"]
    N81["Stack"]
    N82{"Object with operation guarantees?"}
    N83["Design + Supporting Data Structures"]
    N84{"Direct transformation or simulation?"}
    N85["Simulation / Basic DSA"]
    N86{"Math identities, powers, or bit tricks?"}
    N87{"Number properties?"}
    N88["Number Theory"]
    N89["Math / Bit Manipulation"]
    N90["Specialized / Advanced Pattern"]

    N0 -->|yes| N1
    N0 -->|no| N18
    N1 -->|yes| N2
    N1 -->|no| N7
    N2 -->|yes| N3
    N2 -->|no| N4
    N4 -->|yes| N5
    N4 -->|no| N6
    N7 -->|yes| N8
    N7 -->|no| N9
    N9 -->|yes| N10
    N9 -->|no| N13
    N10 -->|yes| N11
    N10 -->|no| N12
    N13 -->|yes| N14
    N13 -->|no| N15
    N15 -->|yes| N16
    N15 -->|no| N17
    N18 -->|yes| N19
    N18 -->|no| N22
    N19 -->|yes| N20
    N19 -->|no| N21
    N22 -->|yes| N23
    N22 -->|no| N24
    N24 -->|yes| N25
    N24 -->|no| N30
    N25 -->|yes| N26
    N25 -->|no| N27
    N27 -->|yes| N28
    N27 -->|no| N29
    N30 -->|yes| N31
    N30 -->|no| N32
    N32 -->|yes| N33
    N32 -->|no| N34
    N34 -->|yes| N35
    N34 -->|no| N36
    N36 -->|yes| N37
    N36 -->|no| N40
    N37 -->|yes| N38
    N37 -->|no| N39
    N40 -->|yes| N41
    N40 -->|no| N46
    N41 -->|yes| N42
    N41 -->|no| N43
    N43 -->|yes| N44
    N43 -->|no| N45
    N46 -->|yes| N47
    N46 -->|no| N48
    N48 -->|yes| N49
    N48 -->|no| N54
    N49 -->|yes| N50
    N49 -->|no| N51
    N51 -->|yes| N52
    N51 -->|no| N53
    N54 -->|yes| N55
    N54 -->|no| N63
    N55 -->|yes| N56
    N55 -->|no| N57
    N57 -->|yes| N58
    N57 -->|no| N59
    N59 -->|yes| N60
    N59 -->|no| N61
    N61 -->|yes| N62
    N63 -->|yes| N64
    N63 -->|no| N67
    N64 -->|yes| N65
    N64 -->|no| N66
    N67 -->|yes| N68
    N67 -->|no| N72
    N68 -->|yes| N69
    N68 -->|no| N70
    N70 -->|yes| N71
    N72 -->|yes| N73
    N72 -->|no| N75
    N73 -->|yes| N74
    N75 -->|yes| N76
    N75 -->|no| N78
    N76 -->|yes| N77
    N78 -->|yes| N79
    N78 -->|no| N82
    N79 -->|yes| N80
    N79 -->|no| N81
    N82 -->|yes| N83
    N82 -->|no| N84
    N84 -->|yes| N85
    N84 -->|no| N86
    N86 -->|yes| N87
    N86 -->|no| N90
    N87 -->|yes| N88
    N87 -->|no| N89

    classDef q fill:#f59e0b,stroke:#b45309,color:#1f2937;
    classDef leaf fill:#6366f1,stroke:#4338ca,color:#ffffff;
    class N0,N1,N2,N4,N7,N9,N10,N13,N15,N18,N19,N22,N24,N25,N27,N30,N32,N34,N36,N37,N40,N41,N43,N46,N48,N49,N51,N54,N55,N57,N59,N61,N63,N64,N67,N68,N70,N72,N73,N75,N76,N78,N79,N82,N84,N86,N87 q;
    class N3,N5,N6,N8,N11,N12,N14,N16,N17,N20,N21,N23,N26,N28,N29,N31,N33,N35,N38,N39,N42,N44,N45,N47,N50,N52,N53,N56,N58,N60,N62,N65,N66,N69,N71,N74,N77,N80,N81,N83,N85,N88,N89,N90 leaf;
```

*The complete AlgoMonster flowchart, reproduced node-for-node: orange diamonds are yes/no questions about the problem, indigo boxes are the technique to use. The decision structure is AlgoMonster's; the routing and annotations below are this suite's.*

## Where each flowchart leaf lives in this suite

Every technique the chart can land on, mapped to the reviewer that teaches it. A few leaves repeat because
more than one branch resolves to the same tool (the count in parentheses is how many leaves carry that
label); a few are advanced or composite tools that the core suite does not give a standalone reviewer.

| Flowchart leaf (technique) | Where this suite teaches it |
| --- | --- |
| BFS (×3), DFS, DFS/backtracking | [Graphs](graphs-reviewer.md) · [Trees & BSTs](trees-and-binary-search-trees-reviewer.md) (BFS/DFS traversal); [Backtracking](backtracking-reviewer.md) for the small-constraint DFS |
| Topological Sort | [Graphs](graphs-reviewer.md) (DAG ordering) |
| Dijkstra's Algorithm | [Graphs](graphs-reviewer.md) (weighted [shortest path](algorithms-glossary-reviewer.md#shortest-path "The route between two vertices with the smallest total cost or fewest edges.")) |
| Disjoint Set Union | [Graphs](graphs-reviewer.md) ([union-find](algorithms-glossary-reviewer.md#union-find "Tracks elements in groups with near-O(1) find-group and merge-groups operations.")) |
| Divide and Conquer / Tree DP | [Recursion & Divide and Conquer](recursion-and-divide-and-conquer-reviewer.md) · [Dynamic Programming](dynamic-programming-reviewer.md) · [Trees & BSTs](trees-and-binary-search-trees-reviewer.md) |
| Binary Search (×2) | [Binary Search](binary-search-reviewer.md) (on data and on the answer) |
| Ordered Set / Fenwick / Segment Tree | [Segment Trees & Fenwick Trees](segment-tree-and-fenwick-reviewer.md) (dynamic range queries with point/range updates); [Prefix Sums & Difference Arrays](prefix-sums-and-difference-arrays-reviewer.md) for static ranges |
| Heap / Sortings | [Heaps & Priority Queues](heaps-and-priority-queues-reviewer.md) · [Sorting Algorithms](sorting-algorithms-reviewer.md) |
| Heap / Divide and Conquer | [Heaps & Priority Queues](heaps-and-priority-queues-reviewer.md) · [Recursion & Divide and Conquer](recursion-and-divide-and-conquer-reviewer.md) |
| Two pointers (×4), Two pointers / Partitioning | [Two Pointers](two-pointers-reviewer.md); partitioning also in [Sorting Algorithms](sorting-algorithms-reviewer.md) |
| Linked List Manipulation | [Linked Lists](linked-lists-reviewer.md) |
| Hash Table / Counting | [Arrays & Hashing](arrays-and-hashing-reviewer.md) |
| Sorting + Interval Scan | [Intervals](intervals-reviewer.md) · [Sorting Algorithms](sorting-algorithms-reviewer.md) |
| Trie / String Matching / Rolling Hash | [Tries](tries-reviewer.md); rolling hash in [Math & Number Theory](math-and-number-theory-reviewer.md) |
| Trie / DP / Memoization | [Tries](tries-reviewer.md) · [Dynamic Programming](dynamic-programming-reviewer.md) |
| Brute force / Backtracking (×2) | [Backtracking](backtracking-reviewer.md) |
| Bitmask DP | [Dynamic Programming](dynamic-programming-reviewer.md) · [Bit Manipulation](bit-manipulation-reviewer.md) |
| Dynamic Programming (×6) | [Dynamic Programming](dynamic-programming-reviewer.md) |
| Prefix Sums | [Prefix Sums & Difference Arrays](prefix-sums-and-difference-arrays-reviewer.md) |
| Sliding Window | [Sliding Window](sliding-window-reviewer.md) |
| Monotonic Stack (×2), Stack | [Stacks & Monotonic Stacks](stacks-and-monotonic-stacks-reviewer.md) |
| Greedy Algorithms | [Greedy](greedy-reviewer.md) |
| Math / Bit Manipulation, Number Theory | [Math & Number Theory](math-and-number-theory-reviewer.md) · [Bit Manipulation](bit-manipulation-reviewer.md) |
| Design + Supporting Data Structures | Compose core structures (hash map + heap + linked list, etc.); no standalone reviewer |
| Simulation / Basic DSA | Direct array/string simulation; no standalone reviewer |
| Specialized / Advanced Pattern | Catch-all for problems outside the recurring patterns |

## Walking the flowchart: three traversals

The fastest way to internalize the chart is to run real prompts through it. Each line below is the diamond
you hit, verbatim, with the answer that selects the next edge; the bracketed box is the leaf you land on.

```text
  LC 207 — "Can you finish all courses, given the prerequisites?"
     Is it a graph? yes -> Is it a tree? no -> DAG-related? yes -> [Topological Sort]

  LC 215 — "Return the kth largest element in an array"
     Is it a graph? no -> Sorted input or monotonic answer? no
     -> kth smallest/largest? yes -> [Heap / Sortings]

  LC 3 — "Longest substring without repeating characters"
     Is it a graph? no -> Sorted input or monotonic answer? no -> kth smallest/largest? no
     -> Linked list problem? no -> Fast lookup, counting, or grouping? no
     -> Merge, insert, or scan intervals? no -> In-place array partitioning? no
     -> Split/match string with dictionary? no -> Small constraints? no
     -> Sum/additive problem? no -> Subarray or substring problem? yes
     -> Maintain a valid window? yes -> [Sliding Window]
```

*Three end-to-end walks (diamond labels verbatim). The deep third path is the lesson: the tree is left-leaning, so a routine sliding-window problem sits ten "no"s down the spine — which is exactly the case where recognizing the cue sheet's one-glance signal ("contiguous substring with a property") beats walking the whole chart.*

## References

- AlgoMonster — [Decision Tree / Coding Interview Flowchart](https://algo.monster/flowchart).
- NeetCode — [Roadmap](https://neetcode.io/roadmap) (the pattern-ordered path this suite mirrors).
