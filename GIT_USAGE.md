# Git history included in the delivery ZIP

The delivery contains `GIT_HISTORY.bundle` and `GIT_COMMIT.txt` alongside the source. The bundle contains two local commits: the supplied DEV BASE and the first-major-update implementation. No GitHub branch was modified or pushed.

To restore a normal Git repository with the exact history:

```
git clone GIT_HISTORY.bundle garang-with-history
cd garang-with-history
git log --oneline
```

Review the source and QA report before adding a remote or deploying. The base ZIP is structurally different from the earlier GitHub root layout; do not overwrite a live repository without reviewing that difference.
