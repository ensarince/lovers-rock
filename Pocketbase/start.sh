#!/bin/sh
# Copy hooks from image into the data dir (survives volume mounts)
mkdir -p /pb/pb_data/pb_hooks
cp -rf /pb/pb_hooks/. /pb/pb_data/pb_hooks/
exec /pb/pocketbase serve --http=0.0.0.0:8080 --dir=/pb/pb_data
