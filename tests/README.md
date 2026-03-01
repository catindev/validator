# Tests for validator project

This test pack is tailored to the current project layout:
- index.js at repo root
- rules/ folder at repo root
- tests/ folder at repo root

Two suites:
1) Engine core features (per dopik): uses a temporary self-contained pipeline `_engine_tests`
   and local rules to avoid depending on business rules content.
2) BT validation (pre-ABS): checks that each beneficiary pipeline is executable (no RULE_INVALID)
   and enforces key invariants (negative fixtures should not pass, UL requires at least one contact).

Run:
```bash
node tests/run.js
```
