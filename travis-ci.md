# Info about usage with travis-ci

Build is enabled on travis-ci.org.

A build is automatically triggered on push.

When doing a 

    npm version patch ### or corresponding version

followed by

    git push --tags

travis-ci will automatically publish the new version.
