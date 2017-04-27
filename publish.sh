#!/bin/sh

set -e

cd $(dirname "$0")
rm -rf build/
npm run build
cd build
git init
git remote add origin gh:jpouellet/dor-sim
git checkout -b gh-pages
git add -A
git commit -m 'Publish'
git push -fu origin gh-pages
