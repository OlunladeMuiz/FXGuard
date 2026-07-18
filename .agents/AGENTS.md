# Workspace Behavioral Rules

* Any git command that can discard uncommitted changes (`git checkout -- <file>`, `git reset --hard`, `git clean`, `git stash` without listing first) requires explicit go-ahead before running, treated the same as a database migration or a scope-expanding change.
* Always run `git status` and `git diff --stat` first and show the user what would be discarded before running any of these.
