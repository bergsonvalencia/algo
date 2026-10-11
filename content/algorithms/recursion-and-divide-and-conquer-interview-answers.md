# Interview answer key — Recursion & Divide and Conquer

This companion keeps the model answers separate from the reviewer so the questions can be used without revealing them.

[← Back to the interview questions](recursion-and-divide-and-conquer-reviewer.md#interview-questions)

---

## Answers

### Fundamentals

#### Answer 1

**Question:** What are the three required parts of a correct recursive function?

A base case (a smallest input solved without recursing), a recursive case (the answer expressed in terms of a smaller subproblem), and guaranteed progress toward the base case (every call shrinks the input). Missing the base case or failing to shrink the input causes infinite recursion and a stack overflow.

[Back to question 1](recursion-and-divide-and-conquer-reviewer.md#interview-question-1)

#### Answer 2

**Question:** How does recursion use memory, and what determines the space cost?

Each call pushes a stack frame (parameters, locals, return address) that stays live until the call returns. The space cost is O(maximum recursion depth), not O(total calls). Factorial is O(n) depth; a [balanced tree](algorithms-glossary-reviewer.md#balanced-tree "A tree kept near minimum height (about log n) so operations stay O(log n).") traversal is O(log n) depth (the height).

[Back to question 2](recursion-and-divide-and-conquer-reviewer.md#interview-question-2)

#### Answer 3

**Question:** Why is recursion depth, not call count, the thing that overflows the stack?

Sibling recursive calls complete and pop their frames before the next sibling runs, so only one root-to-leaf chain of frames is live at a time. Naive Fibonacci makes O(2^n) calls but its stack depth is only O(n).

[Back to question 3](recursion-and-divide-and-conquer-reviewer.md#interview-question-3)

#### Answer 4

**Question:** Can you catch a `StackOverflowException` in C#?

No. Since .NET 2.0 it cannot be caught and terminates the process. That makes unbounded recursion depth a correctness/availability risk, so deep recursion must be bounded or converted to iteration.

[Back to question 4](recursion-and-divide-and-conquer-reviewer.md#interview-question-4)

### Recursion vs iteration

#### Answer 5

**Question:** What is tail recursion, and does C# guarantee tail-call optimization?

A call is tail-recursive when the recursive call is the last action, with no pending work on its result. C# does not guarantee TCO — the CLR has a `.tail` IL prefix and the JIT may apply it, but the C# compiler does not reliably emit it, so deep tail recursion can still overflow. Convert to a loop if depth could be large.

[Back to question 5](recursion-and-divide-and-conquer-reviewer.md#interview-question-5)

#### Answer 6

**Question:** When would you convert recursion to an explicit stack?

When the recursion is correct but the depth could overflow the call stack, or when you need to pause/resume traversal. An explicit `Stack<T>` moves the frames to the heap (much larger, won't throw `StackOverflowException`) and you control the order — e.g. iterative DFS pushing right-then-left.

[Back to question 6](recursion-and-divide-and-conquer-reviewer.md#interview-question-6)

### Divide and conquer

#### Answer 7

**Question:** Describe the divide-and-conquer template and name where the work usually lives.

Divide the input into independent subproblems, conquer by recursing, combine the results. The heavy work sits in either the divide step (quicksort's partition) or the combine step (merge sort's merge) — that balance sets the recurrence and the Big-O.

[Back to question 7](recursion-and-divide-and-conquer-reviewer.md#interview-question-7)

#### Answer 8

**Question:** Both merge sort and quickselect partition/split an array of size n — why is one O(n log n) and the other expected O(n)?

Merge sort recurses into both halves (`2·T(n/2) + O(n)` → O(n log n)). Quickselect recurses into only the one side containing the target (`T(n/2) + O(n)` → O(n)), because the per-level work forms a geometric series `n + n/2 + n/4 + … = 2n`.

[Back to question 8](recursion-and-divide-and-conquer-reviewer.md#interview-question-8)

#### Answer 9

**Question:** Why is merge sort O(n log n) in the worst case while quicksort is O(n²) in the worst case?

Merge sort always splits exactly in half, so it always has log n balanced levels of O(n) work. Quicksort's split depends on pivot quality; a consistently bad pivot (e.g. already-sorted input, first-element pivot) yields `T(n-1) + O(n)` = O(n²). Random or median pivots make that case improbable.

[Back to question 9](recursion-and-divide-and-conquer-reviewer.md#interview-question-9)

#### Answer 10

**Question:** How does exponentiation by squaring achieve O(log n)?

It uses `x^n = (x^(n/2))²` (even) or `x·(x^((n-1)/2))²` (odd), halving the exponent every step. That's log n squarings/multiplications instead of n. Equivalently, read the exponent's bits and fold in the current squared base wherever a bit is 1.

[Back to question 10](recursion-and-divide-and-conquer-reviewer.md#interview-question-10)

### Pitfalls

#### Answer 11

**Question:** Naive Fibonacci is O(2^n). What makes it exponential and how do you fix it?

It's tree recursion (two calls per node) over [overlapping subproblems](algorithms-glossary-reviewer.md#overlapping-subproblems "The recursive breakdown keeps hitting the same smaller subproblems repeatedly."), so the same `Fib(k)` is recomputed many times. Memoization caches each result for O(n) time/space; bottom-up iteration gives O(n) time and O(1) space.

[Back to question 11](recursion-and-divide-and-conquer-reviewer.md#interview-question-11)

#### Answer 12

**Question:** In recursive backtracking, why do sibling branches sometimes corrupt each other?

Because they share mutable state (a partial-solution list/array). If a branch mutates that state before recursing and doesn't undo it afterward, the next sibling starts from the polluted state. Fix by undoing the change after the recursive call returns, or by passing copies.

[Back to question 12](recursion-and-divide-and-conquer-reviewer.md#interview-question-12)

## References

See the [reviewer's references](recursion-and-divide-and-conquer-reviewer.md#references).
