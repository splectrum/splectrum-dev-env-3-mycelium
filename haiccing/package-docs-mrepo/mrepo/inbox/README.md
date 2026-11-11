# /inbox

The records posted to the mrepo, as they came. Non-atomic. Nothing
removed.

Posting is a commit into it. Its folder, `<dir>/inbox/`, is the way in
through the filesystem: a record written there (whole, renamed into place;
the path made if missing) is committed by the runtime, which then takes in
what the layer's new commits added.

Who writes there: the mrepo's parent directly (the child is in its view);
otherwise the inbox's owner, pulling the outboxes it follows (a
subscription).
