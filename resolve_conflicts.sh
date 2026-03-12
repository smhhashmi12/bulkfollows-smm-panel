#!/bin/bash

# Resolve services.js - keep the remote version with caching
git checkout --theirs server/routes/services.js

# Resolve App.tsx - combine both providers
git checkout --ours src/App.tsx

# Stage resolved files
git add server/routes/services.js src/App.tsx
