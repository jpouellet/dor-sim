#!/bin/sh

set -e

cd $(dirname "$0")
rm -rf build/&
npm run build
cd build
git add -A
git commit -m 'Publish'
git push -f
